import {
  ArrowRight,
  CalendarDays,
  Check,
  Command,
  Download,
  FolderOpen,
  Keyboard,
  Minus,
  Monitor,
  Moon,
  Palette,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
  UsersRound,
} from 'lucide-react'
import { NAV_GROUPS, NAV_ITEMS } from '../routes.js'
import { Link } from '../lib/router.jsx'
import { useApp } from '../store/AppStore.jsx'
import { dashboardSummary, memberGrowthSeries } from '../store/selectors.js'
import { BrandMark } from '../components/layout/Sidebar.jsx'
import { buttonClass } from '../components/ui/Button.jsx'
import { AvatarStack, Badge, Metric, OutlineBadge } from '../components/ui/Data.jsx'
import { Card, CardBody, CardHeader, SectionTitle } from '../components/ui/Surface.jsx'
import { Segmented } from '../components/ui/Navigation.jsx'
import { LineChart } from '../components/ui/Charts.jsx'

const THEME_OPTIONS = [
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'dark', label: 'Dark', icon: Moon },
  { key: 'system', label: 'System', icon: Monitor },
]

/** One line per screen, and only what that screen actually does. */
const SCREEN_BLURBS = {
  dashboard:
    'Greeting, live totals, a 12-month growth chart, the attention queue, your task list and the next five events.',
  analytics:
    'Computed metrics for membership, engagement, content and channels, with a 7/30/90-day/all range switcher and CSV export.',
  communities:
    'Grid or table with favourites and search, then a per-community roster, channels, moderation queue and events.',
  members:
    'Directory filtered by role, status and community, with bulk selection, an invite flow and a profile per person.',
  events: 'Month calendar, week strip and agenda, with registration that respects capacity and a detail page.',
  tasks:
    'Kanban with real drag-and-drop plus a keyboard path for every move, and a sortable list view with an overdue filter.',
  content: 'Draft, scheduled and published pipeline with a composer, scheduling and per-item metrics.',
  collections: 'Curated libraries of content and events you can add to and remove from.',
  messages:
    'Channels grouped by community with unread counts, a thread view and a composer that writes into the store.',
  notifications: 'All, unread and urgent tabs, each row deep-linking into the record it references.',
  settings:
    'Profile, workspace, appearance, notifications, security and demo-data controls — every one of them writes to the local store.',
}

/** The jobs the template is built for, named after the screens that carry them. */
const USE_CASES = [
  {
    icon: UsersRound,
    title: 'Run a network of communities',
    body: 'Eight rooms, four moderators, one roster. Keep categories, channels, owners and unread activity in a single directory instead of a spreadsheet per group.',
    screens: ['communities', 'members', 'notifications'],
  },
  {
    icon: CalendarDays,
    title: 'Put on events without a spreadsheet',
    body: 'Publish to a real calendar, watch capacity fill up, take registrations and cancellations, and see the attendee list on the event page.',
    screens: ['events', 'dashboard', 'messages'],
  },
  {
    icon: ShieldCheck,
    title: 'Keep a moderation queue honest',
    body: 'Work the queue on the community page, turn follow-ups into tasks with assignees, priorities and deadlines, and let the overdue filter find what slipped.',
    screens: ['communities', 'tasks', 'notifications'],
  },
  {
    icon: FolderOpen,
    title: 'Ship a content calendar',
    body: 'Draft, schedule, publish and measure. Group the keepers into collections so the library stays useful after the feed moves on.',
    screens: ['content', 'collections', 'analytics'],
  },
  {
    icon: TrendingUp,
    title: 'Report on any of it',
    body: 'Every number is derived from the same records, so an update to the roster moves the dashboard, the analytics page and the exports together.',
    screens: ['analytics', 'dashboard'],
  },
]

const WORKS = [
  {
    icon: Keyboard,
    title: 'Deep links and filters',
    body: 'Views, tabs, filters and ranges live in the URL, so a link to “/tasks?filter=overdue” opens exactly that. Hand-typed values are validated against the control’s options.',
  },
  {
    icon: Command,
    title: 'Keyboard first',
    body: '⌘K or / opens a search over communities, members, events, tasks, content and collections. Every board move has a menu path, and focus is visible throughout.',
  },
  {
    icon: Palette,
    title: 'Theming you can actually change',
    body: 'Light, dark or system, applied instantly and stored. The whole palette is a short list of CSS custom properties in one file, with contrast checked at AA.',
  },
  {
    icon: Download,
    title: 'Real exports and persistence',
    body: 'CSV downloads and clipboard copy are genuinely implemented. State persists to localStorage with a 14-day seed refresh, so the demo never goes stale.',
  },
]

const NOT_REAL = [
  'No accounts, passwords or permissions — the signed-in person is fixed.',
  'No server: nothing leaves the browser, and no request is made anywhere.',
  'Email, uploads and calendar sync are simulated. CSV and clipboard are not.',
  'Message activity is seeded history plus your own writes, not a live socket.',
]

function ProductMark({ subtitle }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <BrandMark className="size-9 rounded-[10px]" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold tracking-tight text-content">
          Communities
        </span>
        <span className="block truncate text-[10px] text-content-3">{subtitle}</span>
      </span>
    </span>
  )
}

/** A real chart over real records, so the hero shows the product rather than a picture of it. */
function GrowthCard() {
  const { state } = useApp()
  const growth = memberGrowthSeries(state)
  const summary = dashboardSummary(state)

  return (
    <Card>
      <CardHeader
        title="Member growth"
        description={`Trailing 12 months across ${summary.communities} communities, counted from the roster.`}
        icon={TrendingUp}
        action={<OutlineBadge tone="success">Live demo data</OutlineBadge>}
      />
      <CardBody>
        <LineChart
          data={growth}
          xKey="label"
          height={200}
          series={[{ key: 'total', label: 'Members' }]}
          formatValue={(value) => Math.round(value)}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone="brand">{summary.totalMembers} members</Badge>
          <Badge tone="accent">{summary.newThisMonth} joined this month</Badge>
          <Badge tone="info">{summary.onlineNow} online now</Badge>
          <Badge tone="neutral">{summary.communities} communities</Badge>
        </div>
      </CardBody>
    </Card>
  )
}

export default function HomePage() {
  const { state, actions } = useApp()
  const summary = dashboardSummary(state)

  /* The Appearance setting decides which screen the front door opens. */
  const startKey = NAV_ITEMS.some((item) => item.key === state.prefs.landingPage)
    ? state.prefs.landingPage
    : 'dashboard'
  const startItem = NAV_ITEMS.find((item) => item.key === startKey)

  const stack = [...state.members]
    .sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt))
    .slice(0, 5)
    .map((member) => ({ id: member.id, name: member.name, hue: member.hue }))

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-5 py-3 sm:px-8">
          <ProductMark subtitle={`${summary.communities} communities · ${summary.totalMembers} members in the demo`} />
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <Segmented
              size="sm"
              value={state.prefs.theme}
              onChange={(value) => actions.setPref('theme', value)}
              options={THEME_OPTIONS}
            />
            <Link to={`/${startKey}`} className={buttonClass({ variant: 'secondary', size: 'sm' })}>
              Open {startItem.label}
              <ArrowRight size={14} strokeWidth={1.9} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-5 py-10 sm:px-8 sm:py-14">
        <section className="grid items-center gap-8 lg:grid-cols-2">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-content sm:text-4xl xl:text-[2.75rem]">
              Every community you run, in one workspace
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-content-2 sm:text-[15px]">
              Communities is a front-end dashboard template for directories, rosters, events,
              tasks, content and analytics. Eleven screens, one data store, and every number on
              every screen derived from the same records — so you can click through the whole
              product before writing a line of your own.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to={`/${startKey}`}
                className={buttonClass({ variant: 'primary', size: 'lg', className: 'w-full sm:w-auto' })}
              >
                Explore the live demo
                <ArrowRight size={15} strokeWidth={1.9} aria-hidden="true" />
              </Link>
              <Link
                to="/signup"
                className={buttonClass({ variant: 'outline', size: 'lg', className: 'w-full sm:w-auto' })}
              >
                Create a workspace
              </Link>
            </div>

            <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-content-3">
              <Sparkles size={12} strokeWidth={1.9} aria-hidden="true" />
              Demo mode: your choices are stored in <span className="font-mono">localStorage</span>{' '}
              in this browser. No account, no password, no network request.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Members" value={summary.totalMembers} hint={`${summary.onlineNow} online`} icon={UsersRound} tone="brand" />
              <Metric label="Engagement" value={`${summary.engagementRate}%`} hint={`${summary.activeMembers} active`} icon={TrendingUp} tone="accent" />
              <Metric label="Events" value={summary.upcomingEvents} hint="coming up" icon={CalendarDays} tone="info" />
              <Metric label="Open tasks" value={summary.openTasks} hint={summary.overdueTasks ? `${summary.overdueTasks} overdue` : 'nothing late'} icon={Check} tone="success" />
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <GrowthCard />
            <Card>
              <CardBody className="flex items-center gap-3">
                <AvatarStack people={stack} max={5} size={8} />
                <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-content-2">
                  The five newest of {summary.totalMembers} members. Each one has a profile route,
                  a role, a status and their own task and activity history.
                </p>
              </CardBody>
            </Card>
          </div>
        </section>

        <section aria-label="Screens in the template">
          <SectionTitle action={<OutlineBadge tone="neutral">{NAV_ITEMS.length} screens</OutlineBadge>}>
            What is in the box
          </SectionTitle>
          <div className="mt-4 flex flex-col gap-6">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-content-3">
                  {group.label}
                </p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.key}
                        to={item.to}
                        className="group flex h-full gap-3 rounded-panel border border-line bg-surface p-4 shadow-card transition-colors hover:border-line-2 hover:bg-surface-2"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-control bg-brand-soft text-brand-content">
                          <Icon size={15} strokeWidth={1.9} aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-content">
                            {item.label}
                            <ArrowRight
                              size={12}
                              strokeWidth={2}
                              aria-hidden="true"
                              className="text-content-3 opacity-0 transition-opacity group-hover:opacity-100"
                            />
                          </span>
                          <span className="mt-1 block text-[11px] leading-relaxed text-content-2">
                            {SCREEN_BLURBS[item.key]}
                          </span>
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section aria-label="Use cases">
          <SectionTitle>Built for people who run more than one room</SectionTitle>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {USE_CASES.map((useCase) => (
              <Card key={useCase.title}>
                <CardHeader title={useCase.title} icon={useCase.icon} />
                <CardBody>
                  <p className="text-[12px] leading-relaxed text-content-2">{useCase.body}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {useCase.screens.map((key) => {
                      const item = NAV_ITEMS.find((nav) => nav.key === key)
                      return (
                        <Link
                          key={key}
                          to={item.to}
                          className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-content-2 transition-colors hover:bg-surface-3 hover:text-content"
                        >
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </section>

        <section aria-label="What works" className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <SectionTitle>What you can click right now</SectionTitle>
            <p className="mt-2 text-[12px] leading-relaxed text-content-2">
              Not a static mock-up. Every behaviour below runs in this build, and the smoke suite
              drives it in a real browser on every check.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {WORKS.map((work) => (
                <Card key={work.title}>
                  <CardBody className="flex gap-3">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-control bg-success-soft text-success">
                      <work.icon size={14} strokeWidth={1.9} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-content">
                        {work.title}
                      </span>
                      <span className="mt-1 block text-[11px] leading-relaxed text-content-2">
                        {work.body}
                      </span>
                    </span>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>

          <Card>
            <CardHeader title="What is deliberately not real" icon={ShieldCheck} />
            <CardBody>
              <ul className="flex flex-col gap-2.5">
                {NOT_REAL.map((line) => (
                  <li key={line} className="flex gap-2.5">
                    <Minus
                      size={14}
                      strokeWidth={2}
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 text-content-3"
                    />
                    <span className="min-w-0 text-[11px] leading-relaxed text-content-2">
                      {line}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-card border border-line bg-surface-2 px-3 py-2 text-[11px] leading-relaxed text-content-3">
                Swapping in a backend means replacing one reducer and its persistence effect —
                <span className="font-mono text-content-2">src/store/</span> and the shapes in
                <span className="font-mono text-content-2"> src/data/seed.js</span>. The screens
                never touch <span className="font-mono">fetch</span>.
              </p>
            </CardBody>
          </Card>
        </section>
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-4 px-5 py-6 sm:px-8">
          <ProductMark subtitle="Front-end demo template · React 19, Vite 7, Tailwind 4" />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Link to="/signup" className={buttonClass({ variant: 'primary', size: 'sm' })}>
              Create a workspace
            </Link>
            <Link to={`/${startKey}`} className={buttonClass({ variant: 'outline', size: 'sm' })}>
              Open {startItem.label}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
