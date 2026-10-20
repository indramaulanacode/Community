/**
 * The moderation queue: reports members have filed, worked oldest first.
 *
 * Every action here is a real mutation — status, resolution, an activity
 * entry and a notification (if the setting is on) — so resolving a report
 * visibly moves the sidebar badge, the dashboard attention rows and the
 * bell. The compact per-community variant in CommunityDetailPage's
 * ModerationTab composes the same record patches deliberately; keeping one
 * shared handler would couple two pages that ship as separate chunks.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  Eye,
  MessageSquareWarning,
  Play,
  RotateCcw,
  ShieldOff,
  X,
} from 'lucide-react'
import { navigate, Link } from '../lib/router.jsx'
import {
  cn,
  copyText,
  appUrl,
  downloadFile,
  matchesQuery,
  oneOf,
  relativeTime,
  toCsv,
  uid,
} from '../lib/utils.js'
import {
  REPORT_KINDS,
  REPORT_REASONS,
  REPORT_STATUSES,
} from '../data/seed.js'
import { useApp } from '../store/AppStore.jsx'
import { lookupCommunity, lookupMember, moderationCounts, reportsFor } from '../store/selectors.js'
import { Button } from '../components/ui/Button.jsx'
import {
  Avatar,
  Badge,
  OutlineBadge,
  SearchInput,
  TableShell,
  Td,
  Th,
  Tr,
} from '../components/ui/Data.jsx'
import { Card, MetaRow, PageHeader } from '../components/ui/Surface.jsx'
import { FilterSelect, Tabs, Toolbar } from '../components/ui/Navigation.jsx'
import { ConfirmDialog, Drawer, Menu } from '../components/ui/Overlay.jsx'
import { EmptyState, StatusMessage } from '../components/ui/Feedback.jsx'

const STATUS_KEYS = REPORT_STATUSES.map((s) => s.key)
const KIND_KEYS = REPORT_KINDS.map((k) => k.key)
const REASON_KEYS = REPORT_REASONS.map((r) => r.key)

const STATUS_LABEL = Object.fromEntries(REPORT_STATUSES.map((s) => [s.key, s.label]))
const STATUS_TONE = Object.fromEntries(REPORT_STATUSES.map((s) => [s.key, s.tone]))
const KIND_LABEL = Object.fromEntries(REPORT_KINDS.map((k) => [k.key, k.label]))
const REASON_META = Object.fromEntries(REPORT_REASONS.map((r) => [r.key, r]))

/** How long the queue has been sitting on this report. */
function ageLabel(createdAt, now = Date.now()) {
  const hours = (now - new Date(createdAt).getTime()) / 3_600_000
  const days = Math.max(1, Math.round(hours / 24))
  if (hours < 24) return { text: `Waiting ${Math.max(1, Math.round(hours))}h`, tone: 'neutral' }
  if (hours < 72) return { text: `Waiting ${days}d`, tone: 'warning' }
  return { text: `Waiting ${days}d`, tone: 'danger' }
}

/* -------------------------------------------------------------- mutations -- */

/**
 * One report action, composed from primitive store actions: patch the report,
 * leave an activity trail, drop a notification if the setting allows it, and
 * toast. Escalation adds a member status change on top.
 */
function actOnReport(state, actions, report, { status, resolution, suspend, verb, message, tone }) {
  const at = new Date().toISOString()
  const closed = status === 'resolved' || status === 'dismissed'

  actions.update('reports', report.id, {
    status,
    resolvedAt: closed ? at : null,
    resolution: closed ? resolution || (status === 'resolved' ? 'Handled by the moderation team.' : 'Not a violation.') : null,
  })

  if (suspend) {
    actions.updateMany('members', [report.againstId], { status: 'suspended' })
  }

  actions.add('activity', {
    id: uid('a'),
    actorId: state.currentUserId,
    actorName: state.members.find((m) => m.id === state.currentUserId)?.name || 'A moderator',
    verb,
    targetKind: 'community',
    targetId: report.communityId,
    at,
  })

  if (state.prefs.notify.moderationQueue) {
    actions.add('notifications', {
      id: uid('n'),
      kind: 'moderation',
      title: `${REASON_META[report.reason]?.label ?? 'Report'} ${STATUS_LABEL[status].toLowerCase()}`,
      body: resolution || `The ${KIND_LABEL[report.kind].toLowerCase()} report in ${lookupCommunity(state, report.communityId)?.name || 'a community'} is now ${STATUS_LABEL[status].toLowerCase()}.`,
      target: { type: 'report', id: report.id },
      at,
      actorId: state.currentUserId,
      read: false,
    })
  }

  actions.notify(message, tone)
}

/* ----------------------------------------------------------------- targets -- */

/** Resolve whatever was reported into a label, a link and a preview line. */
function targetInfo(state, report) {
  const community = lookupCommunity(state, report.communityId)
  switch (report.kind) {
    case 'member': {
      const member = lookupMember(state, report.againstId)
      return {
        label: member?.name || 'A member',
        caption: member ? `@${member.handle}` : '',
        to: member ? `/members/${member.id}` : null,
      }
    }
    case 'content': {
      const item = state.content.find((c) => c.id === report.againstId)
      return { label: item?.title || 'A post', caption: community?.name || '', to: item ? `/content/${item.id}` : null }
    }
    case 'thread': {
      const channel = community?.channels.find((ch) => ch.id === report.againstId)
      return {
        label: channel ? `#${channel.name}` : 'A channel',
        caption: community?.name || '',
        to: community ? `/communities/${community.id}?tab=channels` : null,
      }
    }
    case 'message': {
      const conversation = state.conversations.find((c) => c.communityId === report.communityId)
      const message = conversation?.messages.find((m) => m.id === report.againstId)
      return {
        label: conversation?.title || 'A message',
        caption: message ? message.body : '',
        to: conversation ? `/messages/${conversation.id}` : null,
      }
    }
    default:
      return { label: report.againstId, caption: '', to: null }
  }
}

const RESOLUTION_PRESETS = {
  resolved: ['Removed the post', 'Member warned in private', 'Channel put on cooldown', 'Handled by the moderation team'],
  dismissed: ['Not a violation', 'Reporter withdrew the flag', 'Rules already cover this'],
}

/* ------------------------------------------------------------------- drawer -- */

function ReportDrawer({ report, state, actions, onClose }) {
  const [resolution, setResolution] = useState('')
  const [confirmSuspend, setConfirmSuspend] = useState(false)

  const community = lookupCommunity(state, report.communityId)
  const reporter = lookupMember(state, report.reporterId)
  const target = targetInfo(state, report)
  const openish = report.status === 'open' || report.status === 'reviewing'
  const age = ageLabel(report.createdAt)

  const finish = (fn) => {
    fn()
    onClose()
  }

  const resolve = () =>
    finish(() =>
      actOnReport(state, actions, report, {
        status: 'resolved',
        resolution: resolution.trim() || null,
        verb: 'resolved a report in',
        message: 'Report resolved — activity and queue updated',
        tone: 'success',
      }),
    )

  const dismiss = () =>
    finish(() =>
      actOnReport(state, actions, report, {
        status: 'dismissed',
        resolution: resolution.trim() || null,
        verb: 'dismissed a report in',
        message: 'Report dismissed as not a violation',
        tone: 'info',
      }),
    )

  const startReviewing = () =>
    finish(() =>
      actOnReport(state, actions, report, {
        status: 'reviewing',
        verb: 'started reviewing a report in',
        message: 'Marked as reviewing — it stays in the queue',
        tone: 'warning',
      }),
    )

  const reopen = () =>
    finish(() =>
      actOnReport(state, actions, report, {
        status: 'open',
        verb: 'reopened a report in',
        message: 'Report reopened',
        tone: 'warning',
      }),
    )

  const escalate = () =>
    finish(() =>
      actOnReport(state, actions, report, {
        status: 'resolved',
        resolution: 'Member suspended pending review.',
        suspend: true,
        verb: 'suspended a member in',
        message: 'Member suspended and report resolved — their health score dropped too',
        tone: 'danger',
      }),
    )

  const copyLink = async () => {
    const copied = await copyText(appUrl(`/moderation?report=${report.id}`))
    actions.notify(copied ? 'Report link copied to clipboard' : 'Clipboard is blocked by your browser', copied ? 'info' : 'danger')
  }

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        title={`${KIND_LABEL[report.kind]} report · ${REASON_META[report.reason]?.label ?? report.reason}`}
        footer={
          openish ? (
            <>
              <Button variant="ghost" size="sm" icon={Copy} onClick={copyLink}>
                Copy link
              </Button>
              {report.kind === 'member' ? (
                <Button variant="danger-ghost" size="sm" icon={ShieldOff} onClick={() => setConfirmSuspend(true)}>
                  Escalate — suspend
                </Button>
              ) : (
                <Button variant="secondary" size="sm" icon={Eye} onClick={dismiss}>
                  Dismiss
                </Button>
              )}
              {report.kind === 'member' && (
                <Button variant="secondary" size="sm" icon={X} onClick={dismiss}>
                  Dismiss
                </Button>
              )}
              {report.status === 'open' && (
                <Button variant="secondary" size="sm" icon={Play} onClick={startReviewing}>
                  Start reviewing
                </Button>
              )}
              <Button variant="primary" size="sm" icon={Check} onClick={resolve}>
                Resolve
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" icon={Copy} onClick={copyLink}>
                Copy link
              </Button>
              <Button variant="secondary" size="sm" icon={RotateCcw} onClick={reopen}>
                Reopen
              </Button>
            </>
          )
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <OutlineBadge tone={STATUS_TONE[report.status]}>{STATUS_LABEL[report.status]}</OutlineBadge>
            {report.urgent && report.status === 'open' && (
              <Badge tone="danger" icon={AlertTriangle}>Needs your decision</Badge>
            )}
            <Badge tone={REASON_META[report.reason]?.tone ?? 'neutral'}>
              {REASON_META[report.reason]?.label ?? report.reason}
            </Badge>
            {openish && <span className="text-[11px] text-content-3 tnum">{age.text}</span>}
          </div>

          <Card padded={false} className="divide-y divide-line">
            <div className="flex items-center gap-3 p-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-danger-soft text-danger-content">
                <MessageSquareWarning size={16} strokeWidth={1.9} />
              </span>
              <div className="min-w-0 flex-1">
                {target.to ? (
                  <Link
                    to={target.to}
                    className="block truncate text-[13px] font-semibold text-content hover:text-brand-content hover:underline"
                  >
                    {target.label}
                  </Link>
                ) : (
                  <span className="block truncate text-[13px] font-semibold text-content">{target.label}</span>
                )}
                <p className="truncate text-[11px] text-content-3">{target.caption}</p>
              </div>
              <span className="shrink-0 text-[11px] text-content-3">{KIND_LABEL[report.kind]}</span>
            </div>

            <div className="flex items-center gap-3 p-3.5">
              {reporter && <Avatar name={reporter.name} hue={reporter.hue} size={9} />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-content">
                  {reporter?.name || 'A member'}
                </p>
                <p className="text-[11px] text-content-3">
                  filed this report {relativeTime(report.createdAt)}
                </p>
              </div>
            </div>
          </Card>

          <p className="rounded-card border border-line bg-surface-2 p-3.5 text-[13px] leading-relaxed text-content">
            {report.detail}
          </p>

          <dl className="rounded-card border border-line px-3.5">
            <MetaRow label="Community">
              {community ? (
                <Link to={`/communities/${community.id}`} className="hover:text-brand-content hover:underline">
                  {community.name}
                </Link>
              ) : (
                '—'
              )}
            </MetaRow>
            <MetaRow label="Report id">
              <span className="tnum">{report.id}</span>
            </MetaRow>
            {report.resolvedAt && <MetaRow label="Closed">{relativeTime(report.resolvedAt)}</MetaRow>}
          </dl>

          {openish && (
            <div>
              <p className="mb-2 text-xs font-medium text-content-2">
                Resolution note {report.status === 'dismissed' ? '' : '(optional)'}
              </p>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {RESOLUTION_PRESETS[report.status === 'dismissed' ? 'dismissed' : 'resolved'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setResolution(preset)}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                      resolution === preset
                        ? 'border-brand/40 bg-brand-soft text-brand-content'
                        : 'border-line bg-surface text-content-2 hover:bg-surface-2 hover:text-content',
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <textarea
                value={resolution}
                onChange={(event) => setResolution(event.target.value)}
                rows={2}
                placeholder="What did you do about it? This is written into the record."
                aria-label="Resolution note"
                className="w-full rounded-control border border-line bg-surface px-3 py-2 text-[13px] text-content placeholder:text-content-3 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
          )}

          {!openish && report.resolution && (
            <StatusMessage tone={report.status === 'resolved' ? 'success' : 'neutral'}>
              Resolution: {report.resolution}
            </StatusMessage>
          )}
        </div>
      </Drawer>

      <ConfirmDialog
        open={confirmSuspend}
        onCancel={() => setConfirmSuspend(false)}
        onConfirm={() => {
          setConfirmSuspend(false)
          escalate()
        }}
        title={`Suspend ${targetInfo(state, report).label}?`}
        body="This resolves the report, suspends the member's account across every community, and drops their Member health score immediately. It can be reversed from the member profile."
        confirmLabel="Suspend and resolve"
        tone="danger"
      />
    </>
  )
}

/* --------------------------------------------------------------------- page -- */

export default function ModerationPage({ query }) {
  const { state, actions } = useApp()

  const reportParam = query.get('report') || ''

  const [status, setStatus] = useState(() => oneOf(query.get('status'), STATUS_KEYS, 'open'))
  const [community, setCommunity] = useState(() => {
    const initial = query.get('community')
    return state.communities.some((c) => c.id === initial) ? initial : 'all'
  })
  const [kind, setKind] = useState(() => oneOf(query.get('kind'), KIND_KEYS, 'all'))
  const [reason, setReason] = useState(() => oneOf(query.get('reason'), REASON_KEYS, 'all'))
  const [search, setSearch] = useState(() => query.get('q') || '')
  const [drawerId, setDrawerId] = useState(() =>
    state.reports.some((r) => r.id === reportParam) ? reportParam : null,
  )
  const [escalateFor, setEscalateFor] = useState(null)

  useEffect(() => {
    if (reportParam && state.reports.some((r) => r.id === reportParam)) setDrawerId(reportParam)
  }, [reportParam])

  const counts = moderationCounts(state)

  const filtered = useMemo(
    () =>
      reportsFor(state).filter((r) => {
        if (r.status !== status) return false
        if (community !== 'all' && r.communityId !== community) return false
        if (kind !== 'all' && r.kind !== kind) return false
        if (reason !== 'all' && r.reason !== reason) return false
        return matchesQuery(r, search, ['detail', 'id', 'reason'])
      }),
    [state, status, community, kind, reason, search],
  )

  /* Urgent flags jump the queue inside the open tab; everything stays
     oldest-first underneath so nothing else loses its SLA ordering. */
  const rows =
    status === 'open'
      ? [...filtered.filter((r) => r.urgent), ...filtered.filter((r) => !r.urgent)]
      : filtered

  const activeReport = drawerId ? state.reports.find((r) => r.id === drawerId) : null

  const filtersActive = Boolean(search) || community !== 'all' || kind !== 'all' || reason !== 'all'

  const clearFilters = () => {
    setSearch('')
    setCommunity('all')
    setKind('all')
    setReason('all')
  }

  const closeDrawer = () => {
    setDrawerId(null)
    if (reportParam) navigate(`/moderation?status=${status}`, { replace: true })
  }

  const quickAction = (report, next) => {
    if (next === 'escalate') {
      setEscalateFor(report)
      return
    }
    const presets = {
      reviewing: {
        verb: 'started reviewing a report in',
        message: 'Marked as reviewing — it stays in the queue',
        tone: 'warning',
      },
      resolved: {
        verb: 'resolved a report in',
        message: 'Report resolved — activity and queue updated',
        tone: 'success',
      },
      dismissed: {
        verb: 'dismissed a report in',
        message: 'Report dismissed as not a violation',
        tone: 'info',
      },
      open: {
        verb: 'reopened a report in',
        message: 'Report reopened',
        tone: 'warning',
      },
    }
    actOnReport(state, actions, report, { status: next, ...presets[next] })
  }

  const copyLink = async (report) => {
    const copied = await copyText(appUrl(`/moderation?report=${report.id}`))
    actions.notify(
      copied ? 'Report link copied to clipboard' : 'Clipboard is blocked by your browser',
      copied ? 'info' : 'danger',
    )
  }

  const rowItems = (report) => {
    const openish = report.status === 'open' || report.status === 'reviewing'
    return openish
      ? [
          { label: 'Open report', icon: Eye, onSelect: () => setDrawerId(report.id) },
          { divider: true },
          ...(report.status === 'open'
            ? [{ label: 'Start reviewing', icon: Play, onSelect: () => quickAction(report, 'reviewing') }]
            : []),
          { label: 'Resolve', icon: Check, onSelect: () => quickAction(report, 'resolved') },
          { label: 'Dismiss', icon: X, onSelect: () => quickAction(report, 'dismissed') },
          ...(report.kind === 'member'
            ? [
                {
                  label: 'Escalate — suspend member',
                  icon: ShieldOff,
                  danger: true,
                  onSelect: () => quickAction(report, 'escalate'),
                },
              ]
            : []),
        ]
      : [
          { label: 'Open report', icon: Eye, onSelect: () => setDrawerId(report.id) },
          { divider: true },
          { label: 'Reopen', icon: RotateCcw, onSelect: () => quickAction(report, 'open') },
          { label: 'Copy report link', icon: Copy, onSelect: () => copyLink(report) },
        ]
  }

  const exportCsv = () => {
    const rowsOut = [
      ['Id', 'Kind', 'Reason', 'Status', 'Urgent', 'Community', 'Reporter', 'Target', 'Filed', 'Waiting', 'Closed', 'Resolution'],
      ...filtered.map((r) => {
        const target = targetInfo(state, r)
        const openish = r.status === 'open' || r.status === 'reviewing'
        return [
          r.id,
          r.kind,
          r.reason,
          r.status,
          r.urgent ? 'urgent' : '',
          lookupCommunity(state, r.communityId)?.name || '',
          lookupMember(state, r.reporterId)?.name || '',
          target.label,
          new Date(r.createdAt).toISOString().slice(0, 16).replace('T', ' '),
          openish ? ageLabel(r.createdAt).text.replace('Waiting ', '') : '',
          r.resolvedAt ? new Date(r.resolvedAt).toISOString().slice(0, 10) : '',
          r.resolution || '',
        ]
      }),
    ]
    downloadFile(`moderation-${status}.csv`, `\ufeff${toCsv(rowsOut)}`, 'text/csv;charset=utf-8;')
    actions.notify(
      `Exported ${filtered.length} ${STATUS_LABEL[status].toLowerCase()} report${filtered.length === 1 ? '' : 's'} to CSV`,
      'info',
    )
  }

  const urgentRows = status === 'open' ? filtered.filter((r) => r.urgent) : []

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Moderation queue"
        description="Reports members have filed, worked oldest first. Every action updates the record, leaves an activity trail and — with the setting on — drops a notification."
        meta={
          <>
            <Badge tone="danger">{counts.open} open</Badge>
            {counts.urgent > 0 && (
              <Badge tone="danger" icon={AlertTriangle}>
                {counts.urgent} urgent
              </Badge>
            )}
            <Badge tone="warning">{counts.reviewing} reviewing</Badge>
            <Badge tone="success">{counts.resolved} resolved</Badge>
            <Badge tone="neutral">{counts.dismissed} dismissed</Badge>
          </>
        }
        actions={
          <Button variant="secondary" icon={Download} onClick={exportCsv}>
            Export CSV
          </Button>
        }
      />

      <Tabs
        items={REPORT_STATUSES.map((s) => ({ key: s.key, label: s.label, count: counts[s.key] }))}
        value={status}
        onChange={setStatus}
      />

      {urgentRows.length > 0 && (
        <Card padded={false} className="border-danger/40 bg-danger-soft">
          <div className="flex items-start gap-3 p-4">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-danger-fill text-white">
              <AlertTriangle size={15} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-danger-content">
                {urgentRows.length} report{urgentRows.length === 1 ? '' : 's'} need
                {urgentRows.length === 1 ? 's' : ''} your decision
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {urgentRows.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setDrawerId(r.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-danger/40 bg-surface px-2.5 py-1 text-[11px] font-medium text-danger-content transition-colors hover:bg-surface-2"
                  >
                    {REASON_META[r.reason]?.label ?? r.reason} ·{' '}
                    {lookupCommunity(state, r.communityId)?.name || 'a community'}
                    <span className="tnum text-content-3">· {ageLabel(r.createdAt).text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Toolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          label="Reports"
          placeholder="Search what the report describes"
          resultCount={filtered.length}
        />
        <FilterSelect
          label="Community"
          value={community}
          onChange={setCommunity}
          options={[
            { value: 'all', label: 'All communities' },
            ...state.communities.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <FilterSelect
          label="Kind"
          value={kind}
          onChange={setKind}
          options={[{ value: 'all', label: 'All kinds' }, ...REPORT_KINDS]}
        />
        <FilterSelect
          label="Reason"
          value={reason}
          onChange={setReason}
          options={[{ value: 'all', label: 'All reasons' }, ...REPORT_REASONS]}
        />
        {filtersActive && (
          <Button variant="ghost" size="sm" icon={X} onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </Toolbar>

      {rows.length === 0 ? (
        status === 'open' ? (
          <EmptyState
            icon={Check}
            tone="success"
            title={filtersActive ? 'No open reports match these filters' : 'The queue is clear'}
            body={
              filtersActive
                ? 'Loosen the filters to see what else is waiting.'
                : 'Every report has been reviewed. New flags from members land here.'
            }
            action={
              filtersActive ? (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : null
            }
          />
        ) : (
          <EmptyState
            icon={MessageSquareWarning}
            title={`Nothing ${STATUS_LABEL[status].toLowerCase()}`}
            body={
              status === 'reviewing'
                ? 'Reports stay here while the team is mid-decision.'
                : 'Closed reports keep their resolution note for the record.'
            }
            action={
              <Button variant="ghost" size="sm" onClick={() => setStatus('open')}>
                Back to the open queue
              </Button>
            }
          />
        )
      ) : (
        <Card padded={false}>
          <TableShell>
            <thead>
              <tr>
                <Th>Report</Th>
                <Th className="hidden md:table-cell">Target</Th>
                <Th className="hidden lg:table-cell">Reporter</Th>
                <Th className="hidden lg:table-cell">
                  {status === 'open' || status === 'reviewing' ? 'Waiting' : 'Closed'}
                </Th>
                <Th className="hidden sm:table-cell">Status</Th>
                <Th align="right" className="w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const target = targetInfo(state, r)
                const reporter = lookupMember(state, r.reporterId)
                const openish = r.status === 'open' || r.status === 'reviewing'
                const age = ageLabel(r.createdAt)
                const reasonMeta = REASON_META[r.reason] ?? { label: r.reason, tone: 'neutral' }
                return (
                  <Tr key={r.id} onClick={() => setDrawerId(r.id)}>
                    <Td>
                      <div className="flex min-w-0 items-start gap-2">
                        {r.urgent && openish && (
                          <AlertTriangle
                            size={14}
                            className="mt-0.5 shrink-0 text-danger"
                            aria-label="Needs your decision"
                          />
                        )}
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              setDrawerId(r.id)
                            }}
                            className="block max-w-full truncate text-left text-[13px] font-medium text-content hover:text-brand-content hover:underline"
                          >
                            {reasonMeta.label}:{' '}
                            <span className="font-normal text-content-2">{r.detail}</span>
                          </button>
                          <p className="mt-0.5 truncate text-[11px] text-content-3">
                            {lookupCommunity(state, r.communityId)?.name || 'Community'} ·{' '}
                            {KIND_LABEL[r.kind]}
                            <span className="md:hidden"> · {target.label}</span>
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td className="hidden md:table-cell">
                      <div className="min-w-0 max-w-44">
                        <p className="truncate text-[13px] font-medium text-content">
                          {target.label}
                        </p>
                        {target.caption && (
                          <p className="truncate text-[11px] text-content-3">{target.caption}</p>
                        )}
                      </div>
                    </Td>
                    <Td className="hidden lg:table-cell">
                      {reporter ? (
                        <div className="flex min-w-0 items-center gap-2">
                          <Avatar name={reporter.name} hue={reporter.hue} size={6} />
                          <span className="truncate text-xs text-content">{reporter.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-content-3">—</span>
                      )}
                    </Td>
                    <Td className="hidden lg:table-cell">
                      {openish ? (
                        <OutlineBadge tone={age.tone}>{age.text}</OutlineBadge>
                      ) : (
                        <span className="whitespace-nowrap text-xs text-content-2">
                          {relativeTime(r.resolvedAt)}
                        </span>
                      )}
                    </Td>
                    <Td className="hidden sm:table-cell">
                      <OutlineBadge tone={STATUS_TONE[r.status]}>
                        {STATUS_LABEL[r.status]}
                      </OutlineBadge>
                    </Td>
                    <Td align="right">
                      <Menu label={`Actions for report ${r.id}`} items={rowItems(r)} />
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </TableShell>
        </Card>
      )}

      {activeReport && (
        <ReportDrawer
          report={activeReport}
          state={state}
          actions={actions}
          onClose={closeDrawer}
        />
      )}

      <ConfirmDialog
        open={Boolean(escalateFor)}
        onCancel={() => setEscalateFor(null)}
        onConfirm={() => {
          const report = escalateFor
          setEscalateFor(null)
          if (!report) return
          actOnReport(state, actions, report, {
            status: 'resolved',
            resolution: 'Member suspended pending review.',
            suspend: true,
            verb: 'suspended a member in',
            message: 'Member suspended and report resolved — their health score dropped too',
            tone: 'danger',
          })
          if (drawerId === report.id) closeDrawer()
        }}
        title={
          escalateFor
            ? `Suspend ${targetInfo(state, escalateFor).label}?`
            : 'Suspend this member?'
        }
        body="This resolves the report, suspends the member's account across every community, and drops their Member health score immediately. It can be reversed from the member profile."
        confirmLabel="Suspend and resolve"
        tone="danger"
      />
    </div>
  )
}
