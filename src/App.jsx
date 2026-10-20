import { Suspense, lazy, useState } from 'react'
import { NAV_ITEMS, ROUTES } from './routes.js'
import { useRoute } from './lib/router.jsx'
import { useApp } from './store/AppStore.jsx'
import Sidebar from './components/layout/Sidebar.jsx'
import TopBar from './components/layout/TopBar.jsx'
import { ErrorState, SkeletonCard, Toaster } from './components/ui/Feedback.jsx'
import { Button } from './components/ui/Button.jsx'

// One chunk per screen: the shell paints immediately and the page you asked for
// streams in behind the same skeleton the store uses while it is loading.
const PAGES = {
  home: lazy(() => import('./pages/HomePage.jsx')),
  dashboard: lazy(() => import('./pages/DashboardPage.jsx')),
  analytics: lazy(() => import('./pages/AnalyticsPage.jsx')),
  health: lazy(() => import('./pages/HealthPage.jsx')),
  moderation: lazy(() => import('./pages/ModerationPage.jsx')),
  communities: lazy(() => import('./pages/CommunitiesPage.jsx')),
  'community-detail': lazy(() => import('./pages/CommunityDetailPage.jsx')),
  members: lazy(() => import('./pages/MembersPage.jsx')),
  'member-detail': lazy(() => import('./pages/MemberDetailPage.jsx')),
  events: lazy(() => import('./pages/EventsPage.jsx')),
  'event-detail': lazy(() => import('./pages/EventDetailPage.jsx')),
  tasks: lazy(() => import('./pages/TasksPage.jsx')),
  content: lazy(() => import('./pages/ContentPage.jsx')),
  'content-detail': lazy(() => import('./pages/ContentDetailPage.jsx')),
  collections: lazy(() => import('./pages/CollectionsPage.jsx')),
  'collection-detail': lazy(() => import('./pages/CollectionDetailPage.jsx')),
  messages: lazy(() => import('./pages/MessagesPage.jsx')),
  'message-thread': lazy(() => import('./pages/MessagesPage.jsx')),
  notifications: lazy(() => import('./pages/NotificationsPage.jsx')),
  settings: lazy(() => import('./pages/SettingsPage.jsx')),
  'settings-section': lazy(() => import('./pages/SettingsPage.jsx')),
  signup: lazy(() => import('./pages/SignupPage.jsx')),
}

/** Section + entity name, so the header always says where you are. */
function crumbsFor(route, state) {
  const sectionLabel =
    NAV_ITEMS.find((item) => item.key === route.nav)?.label || route.title

  const detailNames = {
    'community-detail': () => state.communities.find((c) => c.id === route.params.id)?.name,
    'member-detail': () => state.members.find((m) => m.id === route.params.id)?.name,
    'event-detail': () => state.events.find((e) => e.id === route.params.id)?.title,
    'content-detail': () => state.content.find((c) => c.id === route.params.id)?.title,
    'collection-detail': () => state.collections.find((c) => c.id === route.params.id)?.name,
    'message-thread': () =>
      state.conversations.find((c) => c.id === route.params.id)?.title,
    'settings-section': () =>
      ({
        profile: 'Profile',
        workspace: 'Workspace',
        appearance: 'Appearance',
        notifications: 'Notifications',
        security: 'Security',
        data: 'Demo data',
      })[route.params.section] || 'Settings',
  }

  const name = detailNames[route.key]?.()
  const crumbs = []

  if (route.key === 'dashboard') {
    crumbs.push({ label: 'Overview' })
  } else if (name && route.nav !== 'settings') {
    crumbs.push({ label: sectionLabel, href: `/${route.nav}` })
    crumbs.push({ label: name })
  } else if (route.nav === 'settings') {
    crumbs.push({ label: 'Settings' })
    if (name) crumbs.push({ label: name })
  } else {
    crumbs.push({ label: sectionLabel })
  }

  return crumbs
}

function LoadingView() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <SkeletonCard key={i} lines={2} />
      ))}
      <SkeletonCard className="md:col-span-2 xl:col-span-4" lines={6} />
    </div>
  )
}

export default function App() {
  const { state, actions } = useApp()
  const route = useRoute(ROUTES)
  const [navOpen, setNavOpen] = useState(false)

  const Page = PAGES[route.key]

  /* The landing page and the join form are public: no sidebar, no top bar. */
  if (route.key === 'signup' || route.key === 'home') {
    return (
      <>
        <Suspense fallback={<LoadingView />}>
          <Page />
        </Suspense>
        <Toaster />
      </>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <ErrorState
          title="The demo could not be loaded"
          body={state.error || 'Saved state in this browser may be corrupted.'}
          onRetry={actions.resetDemo}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0">
      <Sidebar
        activeNav={route.nav}
        mobileOpen={navOpen}
        onCloseMobile={() => setNavOpen(false)}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <TopBar crumbs={crumbsFor(route, state)} onOpenNav={() => setNavOpen(true)} />

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
          <div className="mx-auto w-full max-w-[104rem] pt-4 sm:pt-5">
            {state.status === 'loading' ? (
              <LoadingView />
            ) : Page ? (
              <Suspense fallback={<LoadingView />}>
                <Page params={route.params} query={route.query} />
              </Suspense>
            ) : (
              <div className="pt-10">
                <ErrorState
                  title="That page does not exist"
                  body={`Nothing is routed at “${route.path}”. Use the sidebar to get back on track.`}
                />
                <div className="mt-4 flex justify-center">
                  <Button variant="primary" onClick={() => (window.location.hash = '/dashboard')}>
                    Back to dashboard
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Toaster />
    </div>
  )
}
