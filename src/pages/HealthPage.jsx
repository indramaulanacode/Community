/**
 * Member health: who is drifting out of the community, and exactly why.
 *
 * Nothing here is stored. Every score is recomputed from records the workspace
 * already keeps (lastActiveAt, contributions, status, roster membership) via
 * the memberHealth rubric in selectors.js — so a suspend from the moderation
 * queue moves these numbers instantly, and the "How this is scored" card can
 * print the weights without contradicting the table.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight,
  CircleAlert,
  Download,
  HeartPulse,
  LayoutGrid,
  List,
  UserX,
} from 'lucide-react'
import { navigate, Link } from '../lib/router.jsx'
import {
  cn,
  DAY_MS,
  downloadFile,
  matchesQuery,
  oneOf,
  relativeTime,
  toCsv,
} from '../lib/utils.js'
import { MEMBER_ROLES } from '../data/seed.js'
import { useApp } from '../store/AppStore.jsx'
import {
  HEALTH_BUCKETS,
  healthBoard,
  healthSummary,
  lookupCommunity,
  riskDistribution,
} from '../store/selectors.js'
import { Button } from '../components/ui/Button.jsx'
import {
  Avatar,
  Badge,
  Metric,
  OutlineBadge,
  Pagination,
  Progress,
  SearchInput,
  TableShell,
  Td,
  Th,
  Tr,
  paginate,
} from '../components/ui/Data.jsx'
import { Card, CardBody, CardHeader, MetaRow, PageHeader } from '../components/ui/Surface.jsx'
import { FilterSelect, Segmented, Toolbar } from '../components/ui/Navigation.jsx'
import { Disclosure, Drawer } from '../components/ui/Overlay.jsx'
import { EmptyState } from '../components/ui/Feedback.jsx'
import { BarChart } from '../components/ui/Charts.jsx'

const RISK_KEYS = HEALTH_BUCKETS.map((b) => b.key)
const RISK_META = Object.fromEntries(HEALTH_BUCKETS.map((b) => [b.key, b]))

/* The rubric, stated verbatim from selectors.js so the card cannot drift. */
const RUBRIC = [
  { text: 'Account suspended', weight: '−50' },
  { text: 'Quiet 30 days or more (active member)', weight: '−40' },
  { text: 'Quiet 30 days or more (already flagged)', weight: '−20' },
  { text: 'Invite never accepted', weight: '−35' },
  { text: 'Marked inactive by the workspace', weight: '−30' },
  { text: 'Quiet 14 days or more', weight: '−25' },
  { text: 'Left every room', weight: '−25' },
  { text: 'Quiet 7 days or more', weight: '−15' },
  { text: 'Newcomer (≤21 days) barely posting', weight: '−10' },
  { text: 'Quiet 3 days or more', weight: '−5' },
]

const BUCKET_RANGE = {
  thriving: '85–100',
  steady: '65–84',
  watch: '40–64',
  'at-risk': '0–39',
}

/* ------------------------------------------------------------------- drawer -- */

function HealthDrawer({ row, state, onClose }) {
  const { member, score, risk, daysQuiet, reasons } = row
  const bucket = RISK_META[risk]

  return (
    <Drawer
      open
      onClose={onClose}
      title={member.name}
      width="max-w-md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            size="sm"
            iconRight={ArrowUpRight}
            onClick={() => navigate(`/members/${member.id}`)}
          >
            Open profile
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4 rounded-card border border-line bg-surface-2 p-4">
          <Avatar
            name={member.name}
            hue={member.hue}
            size={12}
            status={member.online ? 'online' : member.status === 'suspended' ? 'suspended' : undefined}
          />
          <div className="min-w-0 flex-1">
            <p className="text-3xl font-semibold tracking-tight text-content tnum">
              {score}
              <span className="ml-1 text-sm font-medium text-content-3">/ 100</span>
            </p>
            <Progress
              value={score}
              tone={bucket.tone === 'info' ? 'brand' : bucket.tone}
              className="mt-2"
              label={`Health score ${score} of 100`}
            />
          </div>
          <OutlineBadge tone={bucket.tone}>{bucket.label}</OutlineBadge>
        </div>

        {reasons.length === 0 ? (
          <p className="rounded-card border border-success/40 bg-success-soft p-3.5 text-[13px] leading-relaxed text-success-content">
            Nothing is being deducted for this member — no silence, no stale
            status, no lost rooms. That is what thriving looks like.
          </p>
        ) : (
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-content-2 uppercase">
              Why the score is {score}
            </p>
            <ul className="flex flex-col gap-1.5">
              {reasons.map((reason) => (
                <li
                  key={reason.text}
                  className="flex items-center gap-2.5 rounded-control border border-line bg-surface px-3 py-2"
                >
                  <CircleAlert
                    size={13}
                    className={cn(
                      'shrink-0',
                      reason.tone === 'danger' && 'text-danger-content',
                      reason.tone === 'warning' && 'text-warning-content',
                      reason.tone === 'neutral' && 'text-content-3',
                    )}
                  />
                  <span className="min-w-0 flex-1 text-[13px] text-content">{reason.text}</span>
                  <Badge tone={reason.tone === 'neutral' ? 'neutral' : reason.tone}>
                    {reason.tone === 'danger' ? 'heavy' : reason.tone === 'warning' ? 'medium' : 'light'}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        <dl className="rounded-card border border-line px-3.5">
          <MetaRow label="Handle">@{member.handle}</MetaRow>
          <MetaRow label="Role">{MEMBER_ROLES.find((r) => r.key === member.role)?.label || member.role}</MetaRow>
          <MetaRow label="Status">{member.status}</MetaRow>
          <MetaRow label="Quiet for">{daysQuiet} day{daysQuiet === 1 ? '' : 's'}</MetaRow>
          <MetaRow label="Last active">{relativeTime(member.lastActiveAt)}</MetaRow>
          <MetaRow label="Communities">{member.communityIds.length}</MetaRow>
          <MetaRow label="Contributions">
            {member.contributions.posts} posts · {member.contributions.comments} comments
          </MetaRow>
          <MetaRow label="Joined">{new Date(member.joinedAt).toISOString().slice(0, 10)}</MetaRow>
        </dl>

        {member.communityIds.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-content-2 uppercase">
              Rooms they belong to
            </p>
            <div className="flex flex-wrap gap-1.5">
              {member.communityIds.map((cid) => {
                const community = lookupCommunity(state, cid)
                if (!community) return null
                return (
                  <Link
                    key={cid}
                    to={`/communities/${community.id}`}
                    className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-content-2 transition-colors hover:bg-surface-2 hover:text-content"
                  >
                    {community.name}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  )
}

/* --------------------------------------------------------------------- page -- */

export default function HealthPage({ query }) {
  const { state, actions } = useApp()

  const memberParam = query.get('member') || ''

  const [search, setSearch] = useState(() => query.get('q') || '')
  const [community, setCommunity] = useState(() => {
    const initial = query.get('community')
    return state.communities.some((c) => c.id === initial) ? initial : 'all'
  })
  const [role, setRole] = useState(() =>
    oneOf(
      query.get('role'),
      ['all', ...MEMBER_ROLES.map((r) => r.key)],
      'all',
    ),
  )
  const [risk, setRisk] = useState(() => oneOf(query.get('risk'), ['all', ...RISK_KEYS], 'all'))
  const [view, setView] = useState(() => oneOf(query.get('view'), ['table', 'grid'], 'table'))
  const [page, setPage] = useState(1)
  const [drawerId, setDrawerId] = useState(() =>
    state.members.some((m) => m.id === memberParam) ? memberParam : null,
  )

  useEffect(() => {
    if (memberParam && state.members.some((m) => m.id === memberParam)) setDrawerId(memberParam)
  }, [memberParam])

  useEffect(() => {
    setPage(1)
  }, [search, community, role, risk])

  const summary = healthSummary(state)
  const board = useMemo(() => healthBoard(state), [state])

  const filtered = useMemo(
    () =>
      board.filter((row) => {
        if (risk !== 'all' && row.risk !== risk) return false
        if (community !== 'all' && !row.member.communityIds.includes(community)) return false
        if (role !== 'all' && row.member.role !== role) return false
        return matchesQuery(row.member, search, ['name', 'handle', 'title', 'email'])
      }),
    [board, risk, community, role, search],
  )

  const { pageCount, page: current, slice } = paginate(filtered, page, 12)

  const filtersActive = Boolean(search) || community !== 'all' || role !== 'all' || risk !== 'all'

  const clearFilters = () => {
    setSearch('')
    setCommunity('all')
    setRole('all')
    setRisk('all')
  }

  const closeDrawer = () => {
    setDrawerId(null)
    if (memberParam) navigate(`/health${risk !== 'all' ? `?risk=${risk}` : ''}`, { replace: true })
  }

  const activeRow = drawerId ? board.find((row) => row.member.id === drawerId) : null

  const exportCsv = () => {
    const rowsOut = [
      ['Name', 'Handle', 'Title', 'Role', 'Status', 'Communities', 'Joined', 'Last active', 'Days quiet', 'Score', 'Risk', 'Reasons'],
      ...filtered.map((row) => [
        row.member.name,
        `@${row.member.handle}`,
        row.member.title,
        row.member.role,
        row.member.status,
        row.member.communityIds
          .map((cid) => lookupCommunity(state, cid)?.name)
          .filter(Boolean)
          .join(' | '),
        new Date(row.member.joinedAt).toISOString().slice(0, 10),
        new Date(row.member.lastActiveAt).toISOString().slice(0, 10),
        row.daysQuiet,
        row.score,
        RISK_META[row.risk].label,
        row.reasons.map((r) => r.text).join(' | ') || 'None — thriving',
      ]),
    ]
    downloadFile('member-health.csv', `﻿${toCsv(rowsOut)}`, 'text/csv;charset=utf-8;')
    actions.notify(
      `Exported the health of ${filtered.length} member${filtered.length === 1 ? '' : 's'} to CSV`,
      'info',
    )
  }

  const metrics = [
    {
      label: 'At risk',
      value: summary.atRisk,
      hint: 'score under 40 — reach out first',
      icon: UserX,
      tone: 'warning',
      onClick: () => setRisk(risk === 'at-risk' ? 'all' : 'at-risk'),
    },
    {
      label: 'Watch',
      value: summary.watch,
      hint: '40–64 · slipping, still recoverable',
      icon: CircleAlert,
      tone: 'info',
      onClick: () => setRisk(risk === 'watch' ? 'all' : 'watch'),
    },
    {
      label: 'Average score',
      value: summary.averageScore,
      hint: `${summary.thriving} thriving · ${summary.steady} steady`,
      icon: HeartPulse,
      tone: 'success',
    },
    {
      label: 'Invites pending',
      value: summary.invitesPending,
      hint: 'never accepted — the quietest channel',
      icon: HeartPulse,
      tone: 'brand',
      onClick: () => {
        setRisk('all')
        setSearch('')
        setCommunity('all')
        setRole('all')
        navigate('/members?status=invited')
      },
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Member health"
        description="Who is drifting, and why — every score is derived from the activity records you already have. Nothing here is a guess, and nothing is stored twice."
        meta={
          <>
            {HEALTH_BUCKETS.map((bucket) => (
              <OutlineBadge key={bucket.key} tone={bucket.tone}>
                {bucket.label} {bucket.min}+
              </OutlineBadge>
            ))}
          </>
        }
        actions={
          <Button variant="secondary" icon={Download} onClick={exportCsv}>
            Export CSV
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="relative">
            <Metric
              label={metric.label}
              value={metric.value}
              hint={metric.hint}
              icon={metric.icon}
              tone={metric.tone}
            />
            {metric.onClick && (
              <button
                type="button"
                onClick={metric.onClick}
                aria-label={`${metric.label}: ${metric.hint}`}
                className="absolute inset-0 rounded-panel transition-colors hover:bg-brand-soft/10 focus-visible:ring-2 focus-visible:ring-brand/50"
              />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Risk distribution"
          description={`${summary.total} members across ${state.communities.length} communities, bucketed by live score.`}
          icon={HeartPulse}
        />
        <CardBody>
          <BarChart data={riskDistribution(state)} height={160} color="var(--chart-1)" />
        </CardBody>
      </Card>

      <Toolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          label="Members"
          placeholder="Search name, handle, title or email"
          resultCount={filtered.length}
        />
        <FilterSelect
          label="Risk"
          value={risk}
          onChange={setRisk}
          options={[
            { value: 'all', label: 'All scores' },
            ...HEALTH_BUCKETS.map((b) => ({ value: b.key, label: b.label })),
          ]}
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
          label="Role"
          value={role}
          onChange={setRole}
          options={[
            { value: 'all', label: 'All roles' },
            ...MEMBER_ROLES.map((r) => ({ value: r.key, label: r.label })),
          ]}
        />
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { key: 'table', label: 'Table', icon: List },
            { key: 'grid', label: 'Grid', icon: LayoutGrid },
          ]}
        />
        {filtersActive && (
          <Button variant="ghost" size="sm" icon={CircleAlert} onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </Toolbar>

      {filtered.length === 0 ? (
        <EmptyState
          icon={HeartPulse}
          tone="success"
          title={filtersActive ? 'Nobody matches these filters' : 'Everyone is thriving'}
          body={
            filtersActive
              ? 'Loosen the risk bucket, community or search to see the rest of the roster.'
              : 'No deductions are firing across the roster right now. New silence will show up here first.'
          }
          action={
            filtersActive ? (
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : null
          }
        />
      ) : view === 'grid' ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {slice.map((row) => {
              const bucket = RISK_META[row.risk]
              return (
                <Card key={row.member.id} interactive className="flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <Avatar
                      name={row.member.name}
                      hue={row.member.hue}
                      size={10}
                      status={row.member.online ? 'online' : row.member.status === 'suspended' ? 'suspended' : undefined}
                    />
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => setDrawerId(row.member.id)}
                        className="block max-w-full truncate text-left text-sm font-semibold text-content hover:text-brand-content"
                      >
                        {row.member.name}
                      </button>
                      <p className="truncate text-[11px] text-content-3">
                        @{row.member.handle} · quiet {row.daysQuiet}d
                      </p>
                    </div>
                    <OutlineBadge tone={bucket.tone}>{bucket.label}</OutlineBadge>
                  </div>
                  <Progress
                    value={row.score}
                    tone={bucket.tone === 'info' ? 'brand' : bucket.tone}
                    label={`Health score ${row.score} of 100`}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {row.reasons.slice(0, 2).map((reason) => (
                      <Badge key={reason.text} tone={reason.tone}>
                        {reason.text}
                      </Badge>
                    ))}
                    {row.reasons.length === 0 && <Badge tone="success">No deductions</Badge>}
                    {row.reasons.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setDrawerId(row.member.id)}
                        className="text-[11px] font-medium text-brand-content hover:underline"
                      >
                        +{row.reasons.length - 2} more
                      </button>
                    )}
                  </div>
                  <p className="flex items-center justify-between border-t border-line pt-2.5 text-[11px] text-content-2">
                    <span>{row.member.communityIds.length} room{row.member.communityIds.length === 1 ? '' : 's'}</span>
                    <span>{row.member.contributions.posts} posts</span>
                    <span className="tnum">{row.score}/100</span>
                  </p>
                </Card>
              )
            })}
          </div>
          <Pagination
            page={current}
            pageCount={pageCount}
            total={filtered.length}
            pageSize={12}
            onChange={setPage}
          />
        </>
      ) : (
        <Card padded={false}>
          <TableShell>
            <thead>
              <tr>
                <Th>Member</Th>
                <Th className="hidden sm:table-cell">Rooms</Th>
                <Th className="hidden lg:table-cell">Last active</Th>
                <Th className="min-w-32">Score</Th>
                <Th>Risk</Th>
                <Th className="hidden xl:table-cell">Why</Th>
              </tr>
            </thead>
            <tbody>
              {slice.map((row) => {
                const bucket = RISK_META[row.risk]
                return (
                  <Tr key={row.member.id} onClick={() => setDrawerId(row.member.id)}>
                    <Td>
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar
                          name={row.member.name}
                          hue={row.member.hue}
                          size={8}
                          status={
                            row.member.online
                              ? 'online'
                              : row.member.status === 'suspended'
                                ? 'suspended'
                                : undefined
                          }
                        />
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              setDrawerId(row.member.id)
                            }}
                            className="block max-w-44 truncate text-left text-[13px] font-medium text-content hover:text-brand-content hover:underline"
                          >
                            {row.member.name}
                          </button>
                          <span className="block max-w-44 truncate text-[11px] text-content-3">
                            {row.member.title}
                          </span>
                        </div>
                      </div>
                    </Td>
                    <Td className="hidden sm:table-cell text-content-2 tnum">
                      {row.member.communityIds.length}
                    </Td>
                    <Td className="hidden lg:table-cell whitespace-nowrap text-content-2">
                      {relativeTime(row.member.lastActiveAt)}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <span className="w-7 shrink-0 text-[13px] font-semibold text-content tnum">
                          {row.score}
                        </span>
                        <Progress
                          value={row.score}
                          tone={bucket.tone === 'info' ? 'brand' : bucket.tone}
                          className="max-w-28"
                          label={`Health score ${row.score} of 100`}
                        />
                      </div>
                    </Td>
                    <Td>
                      <OutlineBadge tone={bucket.tone}>{bucket.label}</OutlineBadge>
                    </Td>
                    <Td className="hidden xl:table-cell">
                      <div className="flex max-w-72 flex-wrap items-center gap-1.5">
                        {row.reasons.slice(0, 2).map((reason) => (
                          <Badge key={reason.text} tone={reason.tone}>
                            {reason.text}
                          </Badge>
                        ))}
                        {row.reasons.length > 2 && (
                          <span className="text-[11px] text-content-3">
                            +{row.reasons.length - 2}
                          </span>
                        )}
                        {row.reasons.length === 0 && (
                          <span className="text-[11px] text-content-3">—</span>
                        )}
                      </div>
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </TableShell>
          <Pagination
            page={current}
            pageCount={pageCount}
            total={filtered.length}
            pageSize={12}
            onChange={setPage}
          />
        </Card>
      )}

      <Disclosure summary="How this is scored — the full rubric">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs text-content-2">
              Everyone starts at 100. Each signal below subtracts once; the
              result is re-derived on every render, never stored.
            </p>
            <ul className="flex flex-col gap-1">
              {RUBRIC.map((entry) => (
                <li key={entry.text} className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="text-content-2">{entry.text}</span>
                  <span className="shrink-0 font-semibold text-danger-content tnum">{entry.weight}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs text-content-2">Buckets decide what needs attention:</p>
            <ul className="flex flex-col gap-1.5">
              {HEALTH_BUCKETS.map((bucket) => (
                <li key={bucket.key} className="flex items-center justify-between gap-3">
                  <OutlineBadge tone={bucket.tone}>{bucket.label}</OutlineBadge>
                  <span className="text-xs text-content-2 tnum">
                    score {BUCKET_RANGE[bucket.key]}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] leading-relaxed text-content-3">
              Actions elsewhere in the app move these numbers: suspending a
              member from the moderation queue costs them 50 points (plus the
              silence penalty once they age out), and inviting someone who never
              accepts shows up as “Invite never accepted”.
            </p>
          </div>
        </div>
      </Disclosure>

      {activeRow && <HealthDrawer row={activeRow} state={state} onClose={closeDrawer} />}
    </div>
  )
}
