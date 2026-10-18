import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { NAV_GROUPS } from '../../routes.js'
import { cn } from '../../lib/utils.js'
import { Link } from '../../lib/router.jsx'
import { Avatar, Badge } from '../ui/Data.jsx'
import { useApp } from '../../store/AppStore.jsx'

export function BrandMark({ className = '' }) {
  return (
    <span
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-brand-fill',
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width="17" height="17">
        <circle cx="9.5" cy="9" r="2.6" fill="#fff" />
        <circle cx="15.5" cy="9" r="2.6" fill="var(--accent)" />
        <path d="M4 17.5a5.5 5.5 0 0 1 11 0z" fill="#fff" />
        <path d="M12.6 17.5a5 5 0 0 1 9.4 0z" fill="var(--accent)" />
      </svg>
    </span>
  )
}

function NavList({ activeNav, collapsed, onNavigate, unreadCount }) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          {!collapsed && (
            <p className="px-3 pb-1 text-[10px] font-semibold tracking-wider text-content-3 uppercase">
              {group.label}
            </p>
          )}
          {group.items.map((item) => {
            const active = item.key === activeNav
            const Icon = item.icon
            const badge = item.key === 'notifications' ? unreadCount : 0
            return (
              <Link
                key={item.key}
                to={item.to}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-control px-3 py-2 text-[13px] font-medium transition-colors',
                  collapsed && 'justify-center px-0',
                  active
                    ? 'bg-brand-soft text-brand-content'
                    : 'text-content-2 hover:bg-surface-2 hover:text-content',
                )}
              >
                <Icon size={16} strokeWidth={1.9} className="shrink-0" />
                {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                {!collapsed && badge > 0 && (
                  <span className="ml-auto shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-white tnum">
                    {badge}
                  </span>
                )}
                {collapsed && badge > 0 && (
                  <span className="absolute size-1.5 translate-x-4 -translate-y-3 rounded-full bg-accent" />
                )}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

function CommunityShortcuts() {
  const { state } = useApp()
  const shortlist = [...state.communities]
    .sort(
      (a, b) =>
        b.channels.reduce((n, c) => n + c.unread, 0) -
        a.channels.reduce((n, c) => n + c.unread, 0),
    )
    .slice(0, 4)

  return (
    <div className="flex flex-col gap-1">
      <p className="px-3 pb-1 text-[10px] font-semibold tracking-wider text-content-3 uppercase">
        Busy right now
      </p>
      {shortlist.map((community) => {
        const unread = community.channels.reduce((n, channel) => n + channel.unread, 0)
        return (
          <Link
            key={community.id}
            to={`/communities/${community.id}`}
            className="group flex items-center gap-2.5 rounded-control px-3 py-1.5 text-xs text-content-2 transition-colors hover:bg-surface-2 hover:text-content"
          >
            <span
              className={cn(
                'size-1.5 shrink-0 rounded-full',
                unread > 6 ? 'bg-accent' : 'bg-success',
              )}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate">{community.name}</span>
            {unread > 0 && (
              <span className="shrink-0 text-[10px] text-content-3 tnum">{unread}</span>
            )}
          </Link>
        )
      })}
    </div>
  )
}

export default function Sidebar({ activeNav, mobileOpen, onCloseMobile }) {
  const { state, actions, currentMember } = useApp()
  const collapsed = state.prefs.sidebarCollapsed
  const unread = state.notifications.filter((n) => !n.read).length

  return (
    <>
      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-[#0a0b0d]/60"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside
            className="absolute inset-y-0 left-0 flex w-[17rem] flex-col gap-5 border-r border-line bg-surface p-4 shadow-modal"
            aria-label="Navigation"
          >
            <div className="flex items-center justify-between gap-2">
              <BrandRow workspace={state.workspace.name} />
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close navigation"
                className="rounded-control p-1.5 text-content-3 transition-colors hover:bg-surface-2 hover:text-content"
              >
                <X size={16} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <NavList
                activeNav={activeNav}
                unreadCount={unread}
                onNavigate={onCloseMobile}
              />
              <div className="mt-5 border-t border-line pt-4">
                <CommunityShortcuts />
              </div>
            </div>
            <UserCard member={currentMember} collapsed={false} />
          </aside>
        </div>
      )}

      {/* Persistent rail */}
      <aside
        className={cn(
          'hidden shrink-0 flex-col gap-5 border-r border-line bg-surface p-4 transition-[width] duration-200 lg:flex',
          collapsed ? 'w-[4.25rem]' : 'w-[15.5rem]',
        )}
        aria-label="Navigation"
      >
        <div className={cn('flex items-center gap-2', collapsed && 'justify-center')}>
          <Link to="/dashboard" className="flex min-w-0 items-center gap-2.5">
            <BrandMark />
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-content">
                  Communities
                </span>
                <span className="block truncate text-[10px] text-content-3">
                  {state.workspace.name}
                </span>
              </span>
            )}
          </Link>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <NavList activeNav={activeNav} collapsed={collapsed} unreadCount={unread} />
          {!collapsed && (
            <div className="mt-5 border-t border-line pt-4">
              <CommunityShortcuts />
            </div>
          )}
        </div>

        <UserCard member={currentMember} collapsed={collapsed} />

        <button
          type="button"
          onClick={() => actions.setPref('sidebarCollapsed', !collapsed)}
          className={cn(
            'flex items-center gap-2.5 rounded-control px-3 py-2 text-[11px] font-medium text-content-3 transition-colors hover:bg-surface-2 hover:text-content',
            collapsed && 'justify-center px-0',
          )}
          aria-pressed={collapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          {!collapsed && 'Collapse'}
        </button>
      </aside>
    </>
  )
}

function BrandRow({ workspace }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <BrandMark />
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-semibold text-content">Communities</span>
        <span className="block truncate text-[10px] text-content-3">{workspace}</span>
      </span>
    </span>
  )
}

function UserCard({ member, collapsed }) {
  if (!member) return null
  return (
    <Link
      to="/settings/profile"
      title={collapsed ? member.name : undefined}
      className={cn(
        'flex items-center gap-2.5 rounded-card border border-line bg-surface-2 p-2.5 transition-colors hover:border-line-2 hover:bg-surface-3',
        collapsed && 'justify-center border-transparent bg-transparent p-1 hover:bg-surface-2',
      )}
    >
      <Avatar name={member.name} hue={member.hue} size={9} status={member.online ? 'online' : 'offline'} />
      {!collapsed && (
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-content">{member.name}</span>
          <span className="block truncate text-[10px] text-content-3">{member.title}</span>
        </span>
      )}
      {!collapsed && <Badge tone="brand">L{member.level}</Badge>}
    </Link>
  )
}
