import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bell,
  Boxes,
  CalendarDays,
  Check,
  ChevronRight,
  FolderOpen,
  LogOut,
  Menu as MenuIcon,
  MessagesSquare,
  Monitor,
  Moon,
  Search,
  Settings,
  SquareKanban,
  Sun,
  Users,
  UserRound,
} from 'lucide-react'
import { Link, navigate } from '../../lib/router.jsx'
import { cn, relativeTime } from '../../lib/utils.js'
import { lookupCommunity } from '../../store/selectors.js'
import { useApp } from '../../store/AppStore.jsx'
import { Avatar } from '../ui/Data.jsx'
import { Breadcrumbs } from '../ui/Navigation.jsx'
import { IconButton } from '../ui/Button.jsx'
import { Dialog, Menu, Popover } from '../ui/Overlay.jsx'

/* ------------------------------------------------------------- global search -- */

const SEARCH_SOURCES = [
  {
    key: 'communities',
    label: 'Communities',
    icon: MessagesSquare,
    to: (item) => `/communities/${item.id}`,
    subtitle: (item) => item.category,
  },
  {
    key: 'members',
    label: 'Members',
    icon: Users,
    to: (item) => `/members/${item.id}`,
    subtitle: (item) => `@${item.handle}`,
  },
  {
    key: 'events',
    label: 'Events',
    icon: CalendarDays,
    to: (item) => `/events/${item.id}`,
    subtitle: (item) =>
      new Date(item.startsAt).toLocaleString('en-US', { month: 'short', day: 'numeric' }),
  },
  {
    key: 'tasks',
    label: 'Tasks',
    icon: SquareKanban,
    to: (item) => `/tasks?task=${item.id}`,
    subtitle: (item) => item.status,
  },
  {
    key: 'content',
    label: 'Content',
    icon: FolderOpen,
    to: (item) => `/content/${item.id}`,
    subtitle: (item) => item.status,
  },
  {
    key: 'collections',
    label: 'Collections',
    icon: Boxes,
    to: (item) => `/collections/${item.id}`,
    subtitle: () => 'Collection',
  },
]

function GlobalSearch() {
  const { state } = useApp()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    const groups = []
    for (const source of SEARCH_SOURCES) {
      const rows = state[source.key]
        .filter((item) =>
          [item.name, item.title, item.handle, item.category]
            .filter(Boolean)
            .some((field) => String(field).toLowerCase().includes(q)),
        )
        .slice(0, 4)
      if (rows.length) groups.push({ ...source, rows })
    }
    return groups
  }, [query, state])

  const flat = useMemo(
    () => results.flatMap((group) => group.rows.map((row) => ({ group, row }))),
    [results],
  )

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 40)
      return () => clearTimeout(timer)
    }
    setQuery('')
    setCursor(0)
    return undefined
  }, [open])

  const go = (group, row) => {
    setOpen(false)
    navigate(group.to(row))
  }

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setCursor((c) => Math.min(flat.length - 1, c + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setCursor((c) => Math.max(0, c - 1))
    } else if (event.key === 'Enter' && flat[cursor]) {
      event.preventDefault()
      go(flat[cursor].group, flat[cursor].row)
    }
  }

  let running = -1

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="ml-auto flex h-8 w-full max-w-56 items-center gap-2 rounded-control border border-line bg-surface-2 px-2.5 text-left text-xs text-content-3 transition-colors hover:border-line-2 hover:bg-surface-3 md:w-64 lg:max-w-none lg:w-72"
      >
        <Search size={13} strokeWidth={2} />
        <span className="min-w-0 flex-1 truncate">Search</span>
        <kbd className="hidden shrink-0 rounded border border-line bg-surface px-1 py-0.5 font-sans text-[10px] text-content-3 sm:block">
          ⌘K
        </kbd>
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="md"
        bodyClassName="p-0 sm:p-0"
      >
        <label className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <Search size={15} className="shrink-0 text-content-3" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setCursor(0)
            }}
            onKeyDown={onKeyDown}
            placeholder="Search communities, members, events, tasks, content"
            aria-label="Search the workspace"
            className="min-w-0 flex-1 bg-transparent text-sm text-content outline-none placeholder:text-content-3"
          />
          <kbd className="shrink-0 rounded border border-line px-1.5 py-0.5 font-sans text-[10px] text-content-3">
            esc
          </kbd>
        </label>

        <div className="max-h-[min(24rem,60vh)] overflow-y-auto p-1.5">
          {query.trim().length < 2 ? (
            <p className="px-2 py-8 text-center text-xs text-content-3">
              Type at least two characters to search across the workspace.
            </p>
          ) : flat.length === 0 ? (
            <p className="px-2 py-8 text-center text-xs text-content-3">
              No matches for “{query.trim()}”.
            </p>
          ) : (
            results.map((group) => (
              <div key={group.key} className="mb-1">
                <p className="px-2 py-1 text-[10px] font-semibold tracking-wider text-content-3 uppercase">
                  {group.label}
                </p>
                {group.rows.map((row) => {
                  running += 1
                  const index = running
                  const Icon = group.icon
                  const active = index === cursor
                  const community = row.communityId ? lookupCommunity(state, row.communityId) : null
                  return (
                    <button
                      key={`${group.key}-${row.id}`}
                      type="button"
                      onClick={() => go(group, row)}
                      onMouseEnter={() => setCursor(index)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-control px-2 py-2 text-left transition-colors',
                        active ? 'bg-brand-soft' : 'hover:bg-surface-2',
                      )}
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-control bg-surface-2 text-content-2">
                        <Icon size={13} strokeWidth={1.9} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-content">
                          {row.name || row.title}
                        </span>
                        <span className="block truncate text-[11px] text-content-3">
                          {[group.subtitle(row), community?.name].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <ChevronRight
                        size={14}
                        className={cn('shrink-0', active ? 'text-brand-content' : 'text-content-3')}
                      />
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        <p className="border-t border-line px-4 py-2 text-[10px] text-content-3">
          {flat.length > 0 && `${flat.length} result${flat.length === 1 ? '' : 's'} · `}
          ↑ ↓ to move · Enter to open
        </p>
      </Dialog>
    </>
  )
}

/* ------------------------------------------------------------ notifications -- */

const NOTIF_ROUTE = {
  event: (id) => `/events/${id}`,
  task: (id) => `/tasks?task=${id}`,
  community: (id) => `/communities/${id}`,
  member: (id) => `/members/${id}`,
  members: () => '/members?status=invited',
  content: (id) => `/content/${id}`,
  report: (id) => `/moderation?report=${id}`,
  analytics: () => '/analytics',
}

function NotificationBell() {
  const { state, actions } = useApp()
  const unread = state.notifications.filter((n) => !n.read)

  return (
    <Popover
      label={`Notifications, ${unread.length} unread`}
      align="right"
      width="w-[min(24rem,calc(100vw-1.5rem))]"
      trigger={
        <span className="relative inline-flex">
          <IconButton icon={Bell} label="Notifications" variant="secondary" />
          {unread.length > 0 && (
            <span className="pointer-events-none absolute -top-1 -right-1 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white tnum">
              {unread.length}
            </span>
          )}
        </span>
      }
    >
      {(close) => (
        <>
          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-line bg-elevated px-3 py-2.5">
            <p className="text-xs font-semibold text-content">
              Notifications
              {unread.length > 0 && (
                <span className="ml-1.5 font-normal text-content-3">({unread.length} unread)</span>
              )}
            </p>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                actions.readAllNotifications()
              }}
              disabled={!unread.length}
              className="flex items-center gap-1 text-[11px] font-medium text-brand-content transition-colors hover:underline disabled:cursor-not-allowed disabled:text-content-3 disabled:no-underline"
            >
              <Check size={11} /> Mark all read
            </button>
          </div>

          <ul className="divide-y divide-line">
            {state.notifications.slice(0, 8).map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => {
                    actions.readNotification(notification.id)
                    close()
                    const route = NOTIF_ROUTE[notification.target.type]?.(notification.target.id)
                    if (route) navigate(route)
                  }}
                  className={cn(
                    'flex w-full gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-2',
                    !notification.read && 'bg-brand-soft/40',
                  )}
                >
                  <span
                    className={cn(
                      'mt-1.5 size-1.5 shrink-0 rounded-full',
                      notification.read ? 'bg-transparent' : 'bg-accent',
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          'min-w-0 flex-1 truncate text-xs',
                          notification.read
                            ? 'font-medium text-content-2'
                            : 'font-semibold text-content',
                        )}
                      >
                        {notification.title}
                      </span>
                      {notification.urgent && (
                        <span className="shrink-0 rounded-full bg-danger-soft px-1.5 py-0.5 text-[9px] font-semibold text-danger-content">
                          Action
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-content-3">
                      {notification.body}
                    </span>
                    <span className="mt-1 block text-[10px] text-content-3">
                      {relativeTime(notification.at)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {state.notifications.length === 0 && (
              <li className="px-3 py-8 text-center text-xs text-content-3">
                Nothing waiting for you.
              </li>
            )}
          </ul>

          <div className="border-t border-line bg-elevated px-3 py-2">
            <Link
              to="/notifications"
              onClick={close}
              className="block text-center text-[11px] font-semibold text-brand-content hover:underline"
            >
              Open notification centre
            </Link>
          </div>
        </>
      )}
    </Popover>
  )
}

/* ------------------------------------------------------------------- theme -- */

const THEME_OPTIONS = [
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'dark', label: 'Dark', icon: Moon },
  { key: 'system', label: 'System', icon: Monitor },
]

function ThemeMenu() {
  const { state, actions } = useApp()
  const current = THEME_OPTIONS.find((option) => option.key === state.prefs.theme) || THEME_OPTIONS[2]
  const Icon = current.icon

  return (
    <Menu
      label={current.label}
      text
      icon={Icon}
      size="xs"
      items={THEME_OPTIONS.map((option) => ({
        label: `${option.label} theme`,
        icon: option.icon,
        hint: option.key === current.key ? 'active' : undefined,
        onSelect: () => actions.setPref('theme', option.key),
      }))}
    />
  )
}

/* ------------------------------------------------------------------ top bar -- */

export default function TopBar({ crumbs = [], onOpenNav }) {
  const { state, actions, currentMember } = useApp()

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-bg/85 px-4 backdrop-blur-md sm:gap-3">
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="-ml-1 rounded-control p-2 text-content-2 transition-colors hover:bg-surface-2 lg:hidden"
      >
        <MenuIcon size={17} />
      </button>

      {/* No crumb text below sm — the page heading underneath already says it,
          and a truncated one-letter label is noise. */}
      <div className="hidden min-w-0 flex-1 sm:block">
        <Breadcrumbs items={crumbs} />
      </div>

      <GlobalSearch />
      <div className="hidden sm:block">
        <ThemeMenu />
      </div>
      <NotificationBell />

      <Menu
        label="Account"
        size="xs"
        align="right"
        triggerClassName="h-8 w-8 border-transparent bg-transparent p-0 hover:bg-transparent hover:border-line"
        leading={
          <Avatar
            name={currentMember?.name}
            hue={currentMember?.hue ?? 212}
            size={8}
            status={currentMember?.online ? 'online' : 'offline'}
          />
        }
        items={[
          {
            label: 'Your profile',
            icon: UserRound,
            onSelect: () => navigate(`/members/${state.currentUserId}`),
          },
          { label: 'Account settings', icon: Settings, onSelect: () => navigate('/settings/profile') },
          {
            label: 'Workspace settings',
            icon: MessagesSquare,
            onSelect: () => navigate('/settings/workspace'),
          },
          { divider: true },
          { label: 'Switch to light', icon: Sun, onSelect: () => actions.setPref('theme', 'light') },
          { label: 'Switch to dark', icon: Moon, onSelect: () => actions.setPref('theme', 'dark') },
          { divider: true },
          { label: 'Sign out', icon: LogOut, danger: true, onSelect: () => navigate('/signup') },
        ]}
      />
    </header>
  )
}
