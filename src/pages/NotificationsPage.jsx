import { useMemo, useState } from 'react'
import {
  BellRing,
  CalendarDays,
  ChartColumn,
  CheckCheck,
  ClipboardList,
  Copy,
  ExternalLink,
  FileText,
  Inbox,
  ShieldAlert,
  Users,
} from 'lucide-react'
import { navigate } from '../lib/router.jsx'
import {
  addDays,
  appUrl,
  cn,
  copyText,
  dayKey,
  formatDay,
  matchesQuery,
  oneOf,
  relativeTime,
  groupBy,
} from '../lib/utils.js'
import { useApp } from '../store/AppStore.jsx'
import { lookupMember, unreadNotifications } from '../store/selectors.js'
import { Button } from '../components/ui/Button.jsx'
import { Avatar, SearchInput } from '../components/ui/Data.jsx'
import { Card, CardBody, CardHeader, PageHeader, SectionTitle } from '../components/ui/Surface.jsx'
import { ChipFilter, Tabs, Toolbar } from '../components/ui/Navigation.jsx'
import { ConfirmDialog, Menu } from '../components/ui/Overlay.jsx'
import { EmptyState } from '../components/ui/Feedback.jsx'

const KINDS = {
  event: { label: 'Events', icon: CalendarDays, tile: 'bg-brand-soft text-brand-content', dot: 'bg-brand' },
  task: { label: 'Tasks', icon: ClipboardList, tile: 'bg-warning-soft text-warning-content', dot: 'bg-warning' },
  member: { label: 'Members', icon: Users, tile: 'bg-accent-soft text-accent-content', dot: 'bg-accent' },
  content: { label: 'Content', icon: FileText, tile: 'bg-info-soft text-info-content', dot: 'bg-info' },
  moderation: { label: 'Moderation', icon: ShieldAlert, tile: 'bg-danger-soft text-danger-content', dot: 'bg-danger' },
  report: { label: 'Reports', icon: ChartColumn, tile: 'bg-success-soft text-success-content', dot: 'bg-success' },
}
const KIND_ORDER = Object.keys(KINDS)

function routeFor(target) {
  switch (target.type) {
    case 'event':
      return `/events/${target.id}`
    case 'task':
      return `/tasks?task=${target.id}`
    case 'community':
      return `/communities/${target.id}`
    case 'member':
      return `/members/${target.id}`
    case 'members':
      return '/members'
    case 'content':
      return `/content/${target.id}`
    case 'report':
      return `/moderation?report=${target.id}`
    case 'analytics':
      return '/analytics'
    default:
      return '/notifications'
  }
}

const TODAY_KEY = dayKey(new Date())
const YESTERDAY_KEY = dayKey(addDays(new Date(), -1))

function dayHeading(key) {
  if (key === TODAY_KEY) return 'Today'
  if (key === YESTERDAY_KEY) return 'Yesterday'
  return formatDay(`${key}T12:00:00`)
}

export default function NotificationsPage({ query }) {
  const { state, actions } = useApp()
  const params = query || new URLSearchParams()
  const [tab, setTab] = useState(() => oneOf(params.get('tab'), ['all', 'unread', 'urgent'], 'all'))
  const [kinds, setKinds] = useState([])
  const [search, setSearch] = useState(() => params.get('q') || '')
  const [confirmClear, setConfirmClear] = useState(false)

  const all = state.notifications
  const unread = unreadNotifications(state)
  const readCount = all.length - unread.length

  const filtered = useMemo(() => {
    return all
      .filter((n) => {
        if (tab === 'unread' && n.read) return false
        if (tab === 'urgent' && !n.urgent) return false
        if (kinds.length && !kinds.includes(n.kind)) return false
        if (search && !matchesQuery(n, search, ['title', 'body'])) return false
        return true
      })
      .sort((a, b) => new Date(b.at) - new Date(a.at))
  }, [all, tab, kinds, search])

  const groups = useMemo(() => {
    const map = groupBy(filtered, (n) => dayKey(n.at))
    return [...map.entries()].sort(
      (a, b) => new Date(b[1][0].at).getTime() - new Date(a[1][0].at).getTime(),
    )
  }, [filtered])

  const copyLink = async (n) => {
    const copied = await copyText(appUrl(routeFor(n.target)))
    actions.notify(
      copied ? 'Target link copied to clipboard' : 'Clipboard is blocked by your browser',
      copied ? 'info' : 'danger',
    )
  }

  const markRead = (n) => {
    if (!n.read) actions.readNotification(n.id)
  }

  const filtersActive = tab !== 'all' || kinds.length > 0 || Boolean(search)
  const clearAll = () => {
    setTab('all')
    setKinds([])
    setSearch('')
  }

  const countsByKind = useMemo(
    () => groupBy(all, (n) => n.kind),
    [all],
  )
  const urgentUnread = useMemo(
    () =>
      all
        .filter((n) => !n.read)
        .sort((a, b) => Number(Boolean(b.urgent)) - Number(Boolean(a.urgent)))
        .slice(0, 3),
    [all],
  )

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <PageHeader
        title="Notifications"
        description={
          unread.length
            ? `${unread.length} unread of ${all.length} total.`
            : `All ${all.length} notifications are read.`
        }
        actions={
          <>
            <Button
              variant="secondary"
              icon={CheckCheck}
              disabled={unread.length === 0}
              onClick={() => {
                actions.readAllNotifications()
                actions.notify('Marked every notification as read', 'success')
              }}
            >
              Mark all read
            </Button>
            <Button
              variant="danger-ghost"
              disabled={readCount === 0}
              onClick={() => setConfirmClear(true)}
            >
              Clear read
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex flex-col gap-3">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { key: 'all', label: 'All', count: all.length },
              { key: 'unread', label: 'Unread', count: unread.length },
              { key: 'urgent', label: 'Urgent', count: all.filter((n) => n.urgent).length },
            ]}
          />

          <Toolbar>
            <SearchInput
              value={search}
              onChange={setSearch}
              label="Search notifications"
              placeholder="Search titles and details"
              resultCount={filtered.length}
            />
            <ChipFilter
              options={KIND_ORDER.map((key) => ({ value: key, label: KINDS[key].label }))}
              selected={kinds}
              onToggle={(key) =>
                setKinds((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
              }
            />
          </Toolbar>

          {filtered.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Nothing to show"
              body={
                filtersActive
                  ? 'No notifications match this tab, kind or search text.'
                  : 'You are completely caught up — new events, tasks and mentions will land here.'
              }
              action={
                filtersActive ? (
                  <Button variant="secondary" size="sm" onClick={clearAll}>
                    Clear filters
                  </Button>
                ) : null
              }
              tone="brand"
            />
          ) : (
            <div className="flex flex-col gap-4">
              {groups.map(([key, items]) => (
                <section key={key} className="flex flex-col gap-2">
                  <SectionTitle>{dayHeading(key)}</SectionTitle>
                  <Card padded={false} className="divide-y divide-line overflow-hidden">
                    {items.map((n) => {
                      const kind = KINDS[n.kind] || KINDS.report
                      const actor = n.actorId ? lookupMember(state, n.actorId) : null
                      const href = `#${routeFor(n.target)}`
                      return (
                        <div
                          key={n.id}
                          className={cn(
                            'flex items-start gap-3 px-3.5 py-3 transition-colors hover:bg-surface-2',
                            !n.read && 'bg-brand-soft/40',
                          )}
                        >
                          <span
                            className={cn(
                              'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-control',
                              kind.tile,
                            )}
                          >
                            <kind.icon size={16} strokeWidth={1.9} />
                          </span>

                          <a
                            href={href}
                            onClick={() => markRead(n)}
                            className="min-w-0 flex-1 focus:outline-none"
                          >
                            <span className="flex items-center gap-2">
                              {!n.read && (
                                <span
                                  className={cn('size-1.5 shrink-0 rounded-full', kind.dot)}
                                  aria-label="Unread"
                                />
                              )}
                              <span
                                className={cn(
                                  'min-w-0 truncate text-[13px] text-content',
                                  n.read ? 'font-normal' : 'font-medium',
                                )}
                              >
                                {n.title}
                              </span>
                              {n.urgent && (
                                <span className="shrink-0 text-[10px] font-semibold tracking-wide text-danger uppercase">
                                  Urgent
                                </span>
                              )}
                            </span>
                            <span className="mt-0.5 block text-[12px] leading-snug text-content-2 line-clamp-2">
                              {n.body}
                            </span>
                            <span className="mt-1 flex items-center gap-1.5 text-[11px] text-content-3">
                              {actor ? (
                                <>
                                  <Avatar name={actor.name} hue={actor.hue} size={6} />
                                  <span className="truncate">{actor.name}</span>
                                </>
                              ) : (
                                <span>{kind.label}</span>
                              )}
                              <span aria-hidden="true">·</span>
                              <span className="tnum">{relativeTime(n.at)}</span>
                            </span>
                          </a>

                          <div className="flex shrink-0 items-center gap-1.5">
                            {!n.read && (
                              <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => {
                                  actions.readNotification(n.id)
                                  actions.notify('Marked as read', 'info')
                                }}
                              >
                                Mark read
                              </Button>
                            )}
                            <Menu
                              label={`Actions for ${n.title}`}
                              size="xs"
                              items={[
                                {
                                  label: 'Open target',
                                  icon: ExternalLink,
                                  onSelect: () => {
                                    markRead(n)
                                    navigate(routeFor(n.target))
                                  },
                                },
                                {
                                  label: 'Mark read',
                                  icon: CheckCheck,
                                  disabled: n.read,
                                  onSelect: () => {
                                    actions.readNotification(n.id)
                                    actions.notify('Marked as read', 'info')
                                  },
                                },
                                { divider: true },
                                {
                                  label: 'Copy link',
                                  icon: Copy,
                                  onSelect: () => copyLink(n),
                                },
                              ]}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </Card>
                </section>
              ))}
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader title="By type" icon={Inbox} description="Every notification in the inbox" />
            <CardBody>
              <ul className="flex flex-col gap-2">
                {KIND_ORDER.map((key) => {
                  const count = countsByKind.get(key)?.length || 0
                  const kind = KINDS[key]
                  return (
                    <li key={key} className="flex items-center gap-2.5">
                      <span className={cn('flex size-6 items-center justify-center rounded-control', kind.tile)}>
                        <kind.icon size={12} strokeWidth={2} />
                      </span>
                      <span className="flex-1 text-[12px] text-content-2">{kind.label}</span>
                      <span className="text-[12px] font-medium text-content tnum">{count}</span>
                    </li>
                  )
                })}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Needs a read" icon={BellRing} description="Urgent first, then newest" />
            <CardBody>
              {urgentUnread.length === 0 ? (
                <p className="text-xs leading-relaxed text-content-2">
                  Nothing unread. Nice work clearing the queue.
                </p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {urgentUnread.map((n) => (
                    <li key={n.id}>
                      <a
                        href={`#${routeFor(n.target)}`}
                        onClick={() => markRead(n)}
                        className="flex items-start gap-2 text-[12px] hover:text-brand-content"
                      >
                        <span className={cn('mt-1 size-1.5 shrink-0 rounded-full', (KINDS[n.kind] || KINDS.report).dot)} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-content">{n.title}</span>
                          <span className="block text-[11px] text-content-3">{relativeTime(n.at)}</span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <p className="text-xs leading-relaxed text-content-2">
              Delivery — which of these you actually receive — is configured under{' '}
              <a href="#/settings/notifications" className="text-brand-content hover:underline">
                Settings → Notifications
              </a>
              .
            </p>
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmClear}
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          actions.clearReadNotifications()
          actions.notify('Cleared all read notifications', 'info')
          setConfirmClear(false)
        }}
        title="Clear read notifications?"
        body={`${readCount} read notifications will be removed. Unread ones stay in your inbox. This cannot be undone in the demo.`}
        confirmLabel="Clear read"
        tone="danger"
      />
    </div>
  )
}
