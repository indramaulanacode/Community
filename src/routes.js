/**
 * Single source of truth for navigation and routing. The sidebar, the global
 * search, the breadcrumbs and App.jsx all read from here, so a new screen is
 * added in exactly one place.
 */
import {
  Boxes,
  Bell,
  CalendarDays,
  ChartLine,
  FolderOpen,
  LayoutDashboard,
  MessagesSquare,
  Settings,
  SquareKanban,
  Users,
  UsersRound,
} from 'lucide-react'

export const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { key: 'dashboard', to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { key: 'analytics', to: '/analytics', label: 'Analytics', icon: ChartLine },
    ],
  },
  {
    label: 'Manage',
    items: [
      { key: 'communities', to: '/communities', label: 'Communities', icon: MessagesSquare },
      { key: 'members', to: '/members', label: 'Members', icon: Users },
      { key: 'events', to: '/events', label: 'Events', icon: CalendarDays },
      { key: 'tasks', to: '/tasks', label: 'Tasks', icon: SquareKanban },
      { key: 'content', to: '/content', label: 'Content', icon: FolderOpen },
      { key: 'collections', to: '/collections', label: 'Collections', icon: Boxes },
    ],
  },
  {
    label: 'Connect',
    items: [
      { key: 'messages', to: '/messages', label: 'Messages', icon: UsersRound },
      { key: 'notifications', to: '/notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    label: 'Account',
    items: [{ key: 'settings', to: '/settings', label: 'Settings', icon: Settings }],
  },
]

export const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items)

/** Ordered route table — most specific patterns are matched first. */
export const ROUTES = [
  { pattern: '/', key: 'home', nav: 'home', title: 'Home' },

  { pattern: '/dashboard', key: 'dashboard', nav: 'dashboard', title: 'Dashboard' },
  { pattern: '/analytics', key: 'analytics', nav: 'analytics', title: 'Analytics' },

  { pattern: '/communities', key: 'communities', nav: 'communities', title: 'Communities' },
  { pattern: '/communities/:id', key: 'community-detail', nav: 'communities', title: 'Community' },

  { pattern: '/members', key: 'members', nav: 'members', title: 'Members' },
  { pattern: '/members/:id', key: 'member-detail', nav: 'members', title: 'Member' },

  { pattern: '/events', key: 'events', nav: 'events', title: 'Events' },
  { pattern: '/events/:id', key: 'event-detail', nav: 'events', title: 'Event' },

  { pattern: '/tasks', key: 'tasks', nav: 'tasks', title: 'Tasks' },

  { pattern: '/content', key: 'content', nav: 'content', title: 'Content library' },
  { pattern: '/content/:id', key: 'content-detail', nav: 'content', title: 'Content' },

  { pattern: '/collections', key: 'collections', nav: 'collections', title: 'Collections' },
  { pattern: '/collections/:id', key: 'collection-detail', nav: 'collections', title: 'Collection' },

  { pattern: '/messages', key: 'messages', nav: 'messages', title: 'Messages' },
  { pattern: '/messages/:id', key: 'message-thread', nav: 'messages', title: 'Conversation' },

  { pattern: '/notifications', key: 'notifications', nav: 'notifications', title: 'Notifications' },

  { pattern: '/settings', key: 'settings', nav: 'settings', title: 'Settings' },
  { pattern: '/settings/:section', key: 'settings-section', nav: 'settings', title: 'Settings' },

  { pattern: '/signup', key: 'signup', nav: 'signup', title: 'Join Communities' },
]
