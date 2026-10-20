import { useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  FileText,
  HeartPulse,
  Plus,
  ShieldAlert,
  TrendingUp,
  Users,
  UserPlus,
} from 'lucide-react'
import { navigate } from '../lib/router.jsx'
import { cn, formatDay, formatFull, formatTime, relativeTime } from '../lib/utils.js'
import {
  TASK_STATUSES,
} from '../data/seed.js'
import { useApp } from '../store/AppStore.jsx'
import {
  channelMix,
  communityStats,
  dashboardSummary,
  engagementSeries,
  lookupCommunity,
  lookupMember,
  memberGrowthSeries,
  overdueTasks,
  recentActivity,
  upcomingEvents,
} from '../store/selectors.js'
import { Button } from '../components/ui/Button.jsx'
import { Avatar, Badge, Delta, Metric, Progress, TableShell, Td, Th, Tr } from '../components/ui/Data.jsx'
import { Card, CardBody, CardHeader, PageHeader } from '../components/ui/Surface.jsx'
import { DonutChart, LineChart } from '../components/ui/Charts.jsx'
import { Segmented } from '../components/ui/Navigation.jsx'
import { EmptyState } from '../components/ui/Feedback.jsx'

const TASK_TONE = { todo: 'neutral', doing: 'brand', review: 'warning', done: 'success' }

function Greeting({ member }) {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const first = (member?.name || 'there').split(' ')[0]
  return `${part}, ${first}`
}

function GrowthCard() {
  const { state } = useApp()
  const [view, setView] = useState('growth')

  const growth = memberGrowthSeries(state)
  const engagement = engagementSeries(state).slice(-30)
  const latest = growth[growth.length - 1]
  const previous = growth[growth.length - 2]

  return (
    <Card className="xl:col-span-2">
      <CardHeader
        title={view === 'growth' ? 'Member growth' : 'Daily engagement'}
        description={
          view === 'growth'
            ? `Total membership across ${state.communities.length} communities, trailing 12 months.`
            : 'Posts, comments and reactions counted per day over the last 30 days.'
        }
        icon={TrendingUp}
        action={
          <Segmented
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { key: 'growth', label: 'Growth' },
              { key: 'engagement', label: 'Engagement' },
            ]}
          />
        }
      />
      <CardBody>
        {view === 'growth' ? (
          <LineChart
            data={growth}
            xKey="label"
            height={224}
            series={[{ key: 'total', label: 'Members' }]}
            formatValue={(v) => Math.round(v)}
          />
        ) : (
          <LineChart
            data={engagement}
            xKey="label"
            height={224}
            formatX={(value) => (value === 'Today' ? 'Today' : String(value).slice(4))}
            series={[
              { key: 'posts', label: 'Posts' },
              { key: 'comments', label: 'Comments' },
              { key: 'activeMembers', label: 'Active members', color: 'var(--chart-3)' },
            ]}
          />
        )}
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-3">
          {view === 'growth' ? (
            <>
              <p className="flex items-center gap-2 text-xs text-content-2">
                <span className="font-semibold text-content tnum">{latest.total}</span> members now
              </p>
              <p className="flex items-center gap-2 text-xs text-content-2">
                <Delta value={((latest.total - previous.total) / (previous.total || 1)) * 100} />
                since last month
              </p>
              <p className="flex items-center gap-2 text-xs text-content-2">
                <UserPlus size={13} className="text-content-3" />
                <span className="font-semibold text-content tnum">{latest.joined}</span> joined this
                month
              </p>
            </>
          ) : (
            <p className="text-xs text-content-2">
              Today is counted live from messages and published content — it is deliberately
              part-way through.
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

function AttentionCard({ summary }) {
  const { state } = useApp()
  const invited = state.members.filter((m) => m.status === 'invited').length
  const drafts = state.content.filter((c) => c.status === 'draft').length
  const overdue = overdueTasks(state)

  const items = [
    {
      label: 'Moderation queue',
      detail: summary.openReports
        ? `${summary.openReports} open report${summary.openReports === 1 ? '' : 's'}${
            summary.urgentReports ? ` · ${summary.urgentReports} need a decision` : ''
          }`
        : 'Every report handled',
      tone: summary.urgentReports ? 'danger' : summary.openReports ? 'warning' : 'success',
      icon: ShieldAlert,
      to: '/moderation?status=open',
    },
    {
      label: 'Member health',
      detail: summary.atRiskMembers
        ? `${summary.atRiskMembers} member${summary.atRiskMembers === 1 ? '' : 's'} drifting — outreach list ready`
        : 'Everyone is thriving',
      tone: summary.atRiskMembers ? 'warning' : 'success',
      icon: HeartPulse,
      to: '/health?risk=at-risk',
    },
    {
      label: 'Overdue tasks',
      detail: overdue.length ? `${overdue.length} past their due date` : 'Nothing late',
      tone: overdue.length ? 'danger' : 'success',
      icon: AlertTriangle,
      to: '/tasks?filter=overdue',
    },
    {
      label: 'Unread notifications',
      detail: summary.unreadNotifications
        ? `${summary.unreadNotifications} need a read`
        : 'All caught up',
      tone: summary.unreadNotifications ? 'warning' : 'success',
      icon: Bell,
      to: '/notifications',
    },
    {
      label: 'Invites pending',
      detail: invited ? `${invited} invitation${invited === 1 ? '' : 's'} not accepted` : 'No waiting invites',
      tone: invited ? 'brand' : 'success',
      icon: UserPlus,
      to: '/members?status=invited',
    },
    {
      label: 'Content drafts',
      detail: drafts ? `${drafts} unpublished drafts` : 'Library is clear',
      tone: drafts ? 'neutral' : 'success',
      icon: FileText,
      to: '/content?status=draft',
    },
  ]

  return (
    <Card>
      <CardHeader title="Needs your attention" description="Live counts from the demo data" icon={Activity} />
      <CardBody className="mt-3">
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li key={item.label}>
              <button
                type="button"
                onClick={() => navigate(item.to)}
                className="flex w-full items-center gap-3 rounded-control px-2 py-2.5 text-left transition-colors hover:bg-surface-2"
              >
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-control',
                    item.tone === 'danger' && 'bg-danger-soft text-danger-content',
                    item.tone === 'warning' && 'bg-warning-soft text-warning-content',
                    item.tone === 'brand' && 'bg-brand-soft text-brand-content',
                    item.tone === 'success' && 'bg-success-soft text-success-content',
                    item.tone === 'neutral' && 'bg-neutral-soft text-content-2',
                  )}
                >
                  <item.icon size={14} strokeWidth={1.9} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-content">{item.label}</span>
                  <span className="block truncate text-[11px] text-content-3">{item.detail}</span>
                </span>
                <ChevronRight size={14} className="shrink-0 text-content-3" />
              </button>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  )
}

function UpcomingEventsCard() {
  const { state, actions } = useApp()
  const events = upcomingEvents(state, 5)

  return (
    <Card>
      <CardHeader
        title="Upcoming events"
        description="Next five on the community calendar"
        icon={CalendarDays}
        action={
          <Button variant="ghost" size="xs" iconRight={ArrowUpRight} onClick={() => navigate('/events')}>
            Calendar
          </Button>
        }
      />
      <CardBody className="mt-3">
        {events.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Nothing scheduled"
            body="Create an event and it will appear here with its registration status."
            action={
              <Button variant="primary" size="sm" icon={Plus} onClick={() => navigate('/events?new=1')}>
                New event
              </Button>
            }
            tone="brand"
          />
        ) : (
          <ul className="flex flex-col gap-1">
            {events.map((event) => {
              const community = lookupCommunity(state, event.communityId)
              const filled = (event.attendeeIds.length / event.capacity) * 100
              const going = event.attendeeIds.includes(state.currentUserId)
              const full = !going && event.attendeeIds.length >= event.capacity

              const toggleRegistration = () => {
                const attendees = new Set(event.attendeeIds)
                if (attendees.has(state.currentUserId)) attendees.delete(state.currentUserId)
                else attendees.add(state.currentUserId)
                actions.update('events', event.id, { attendeeIds: [...attendees] })
                actions.notify(
                  going
                    ? `Registration cancelled — ${event.title}`
                    : `You are registered for ${event.title}`,
                  going ? 'info' : 'success',
                )
              }
              return (
                <li key={event.id}>
                  <div className="group flex items-center gap-3 rounded-control px-2 py-2 transition-colors hover:bg-surface-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/events/${event.id}`)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span className="flex w-11 shrink-0 flex-col items-center rounded-control border border-line bg-surface-2 py-1">
                        <span className="text-[9px] font-semibold tracking-wide text-content-3 uppercase">
                          {formatDay(event.startsAt).split(' ')[0]}
                        </span>
                        <span className="text-sm font-semibold text-content tnum">
                          {new Date(event.startsAt).getDate()}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-content">
                          {event.title}
                        </span>
                        <span className="block truncate text-[11px] text-content-3">
                          {formatTime(event.startsAt)} · {community?.name}
                        </span>
                        <span className="mt-1.5 flex items-center gap-2">
                          <Progress
                            value={event.attendeeIds.length}
                            max={event.capacity}
                            tone={filled > 85 ? 'warning' : 'brand'}
                            className="max-w-24"
                            label={`${event.attendeeIds.length} of ${event.capacity} places taken`}
                          />
                          <span className="text-[10px] text-content-3 tnum">
                            {event.attendeeIds.length}/{event.capacity}
                          </span>
                        </span>
                      </span>
                    </button>
                    {going ? (
                      <Button
                        size="xs"
                        variant="ghost"
                        icon={Check}
                        title="Cancel your registration"
                        onClick={toggleRegistration}
                      >
                        Going
                      </Button>
                    ) : (
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={full}
                        title={full ? 'This event is at capacity' : undefined}
                        onClick={toggleRegistration}
                      >
                        {full ? 'Full' : 'Register'}
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}

function TaskListCard() {
  const { state, actions } = useApp()
  const open = state.tasks
    .filter((task) => task.status !== 'done')
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 6)

  return (
    <Card>
      <CardHeader
        title="Your task queue"
        description="Oldest deadline first, across every community"
        icon={Check}
        action={
          <Button variant="ghost" size="xs" iconRight={ArrowUpRight} onClick={() => navigate('/tasks')}>
            Board
          </Button>
        }
      />
      <CardBody className="mt-3">
        {open.length === 0 ? (
          <EmptyState
            icon={Check}
            title="Queue is empty"
            body="Everything assigned to you has been completed."
            tone="success"
          />
        ) : (
          <ul className="flex flex-col gap-0.5">
            {open.map((task) => {
              const late = new Date(task.dueDate) < new Date() && task.status !== 'done'
              const status = TASK_STATUSES.find((s) => s.key === task.status)
              return (
                <li
                  key={task.id}
                  className="flex items-center gap-2.5 rounded-control px-2 py-2 transition-colors hover:bg-surface-2"
                >
                  <button
                    type="button"
                    aria-label={`Mark ${task.title} as done`}
                    onClick={() => {
                      actions.update('tasks', task.id, { status: 'done', completedAt: new Date().toISOString() })
                      actions.notify('Task completed', 'success')
                    }}
                    className="size-5 shrink-0 rounded border border-line-2 transition-colors hover:border-success hover:bg-success-soft"
                  />
                  <button
                    type="button"
                    onClick={() => navigate(`/tasks?task=${task.id}`)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-[13px] text-content">{task.title}</span>
                    <span className="block truncate text-[11px] text-content-3">
                      {task.assigneeName} ·{' '}
                      <span className={cn(late && 'font-medium text-danger')}>
                        {relativeTime(task.dueDate)}
                      </span>
                    </span>
                  </button>
                  <Badge tone={TASK_TONE[task.status]}>{status?.label}</Badge>
                </li>
              )
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}

function ActivityCard() {
  const { state } = useApp()
  const feed = recentActivity(state, 8)

  return (
    <Card>
      <CardHeader title="Recent activity" description="Across all communities" icon={Activity} />
      <CardBody className="mt-3">
        <ol className="relative flex flex-col gap-3.5 pl-1">
          {feed.map((entry) => {
            const actor = lookupMember(state, entry.actorId)
            return (
              <li key={entry.id} className="flex gap-2.5">
                <Avatar name={actor?.name} hue={actor?.hue} size={8} />
                <p className="min-w-0 flex-1 text-[11px] leading-snug text-content-2">
                  <span className="font-semibold text-content">{actor?.name || 'A member'}</span>{' '}
                  {entry.verb}{' '}
                  <ActivityLink entry={entry} />
                  <span className="block text-content-3">{relativeTime(entry.at)}</span>
                </p>
              </li>
            )
          })}
        </ol>
      </CardBody>
    </Card>
  )
}

function ActivityLink({ entry }) {
  const { state } = useApp()
  const titles = {
    community: () => lookupCommunity(state, entry.targetId)?.name,
    member: () => lookupMember(state, entry.targetId)?.name,
    task: () => state.tasks.find((t) => t.id === entry.targetId)?.title,
    content: () => state.content.find((c) => c.id === entry.targetId)?.title,
    event: () => state.events.find((e) => e.id === entry.targetId)?.title,
  }
  const label = titles[entry.targetKind]?.() || entry.targetId
  const href =
    entry.targetKind === 'task'
      ? `/tasks?task=${entry.targetId}`
      : `/${entry.targetKind === 'community' ? 'communities' : entry.targetKind}s/${entry.targetId}`

  return (
    <a
      href={href}
      className="font-medium text-brand-content underline-offset-2 hover:underline"
    >
      {label}
    </a>
  )
}

function MixCard() {
  const { state } = useApp()
  const mix = channelMix(state).filter((row) => row.value > 0)
  const roles = [
    { label: 'Owner', value: state.members.filter((m) => m.role === 'owner').length },
    { label: 'Moderator', value: state.members.filter((m) => m.role === 'moderator').length },
    { label: 'Member', value: state.members.filter((m) => m.role === 'member').length },
  ]

  return (
    <Card>
      <CardHeader title="Where the conversation is" description="Message volume by community" icon={Users} />
      <CardBody>
        <DonutChart data={mix} centerLabel="Messages" centerValue={mix.reduce((n, r) => n + r.value, 0)} />
        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2.5 text-[10px] font-semibold tracking-wider text-content-3 uppercase">
            Roles
          </p>
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <Badge key={role.label} tone={role.label === 'Owner' ? 'accent' : 'neutral'}>
                {role.label} · {role.value}
              </Badge>
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

function CommunityTable() {
  const { state } = useApp()
  const rows = state.communities
    .map((community) => ({ community, stats: communityStats(state, community) }))
    .sort((a, b) => b.stats.members - a.stats.members)

  return (
    <Card>
      <CardHeader
        title="Community performance"
        description="Every metric below is computed from the current records"
        icon={Activity}
        action={
          <Button variant="ghost" size="xs" iconRight={ArrowUpRight} onClick={() => navigate('/communities')}>
            Directory
          </Button>
        }
      />
      <CardBody>
        <TableShell>
          <thead>
            <tr>
              <Th>Community</Th>
              <Th>Members</Th>
              <Th>Online</Th>
              <Th>Engagement</Th>
              <Th>Open tasks</Th>
              <Th>Upcoming</Th>
              <Th align="right" className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ community, stats }) => (
              <Tr key={community.id} onClick={() => navigate(`/communities/${community.id}`)}>
                <Td>
                  <span className="flex items-center gap-2.5">
                    <Avatar name={community.name} hue={community.accent === 'accent' ? 348 : 212} size={8} />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-content">
                        {community.name}
                      </span>
                      <span className="block truncate text-[11px] text-content-3">
                        {community.category}
                      </span>
                    </span>
                  </span>
                </Td>
                <Td className="tnum">{stats.members}</Td>
                <Td className="tnum">{stats.online}</Td>
                <Td>
                  <span className="flex items-center gap-2">
                    <Progress
                      value={stats.engagementRate}
                      tone={stats.engagementRate > 60 ? 'success' : stats.engagementRate > 35 ? 'brand' : 'warning'}
                      className="max-w-16"
                      label={`${stats.engagementRate} percent engaged this week`}
                    />
                    <span className="text-[11px] text-content-2 tnum">{stats.engagementRate}%</span>
                  </span>
                </Td>
                <Td className="tnum">{stats.openTasks}</Td>
                <Td className="tnum">{stats.upcomingEvents}</Td>
                <Td align="right">
                  <ChevronRight size={14} className="text-content-3" />
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      </CardBody>
    </Card>
  )
}

export default function DashboardPage() {
  const { state, currentMember, actions } = useApp()
  const summary = dashboardSummary(state)

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <PageHeader
        title={<Greeting member={currentMember} />}
        description={`${formatFull(new Date())} · ${state.communities.length} communities, ${summary.totalMembers} members`}
        actions={
          <>
            <Button variant="secondary" icon={Bell} onClick={() => navigate('/notifications')}>
              {summary.unreadNotifications > 0 ? `${summary.unreadNotifications} new` : 'Notifications'}
            </Button>
            <Button variant="primary" icon={Plus} onClick={() => navigate('/events?new=1')}>
              New event
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Total members"
          value={summary.totalMembers}
          delta={summary.growthPercent}
          hint="vs. 3 months ago"
          icon={Users}
          tone="brand"
        />
        <Metric
          label="Engagement rate"
          value={`${summary.engagementRate}%`}
          delta={summary.engagementDelta}
          hint={`${summary.dailyActiveShare}% daily active · ${summary.activeMembers} active accounts`}
          icon={Activity}
          tone="accent"
        />
        <Metric
          label="Upcoming events"
          value={summary.upcomingEvents}
          hint={`${summary.onlineNow} members online now`}
          icon={CalendarDays}
          tone="info"
        />
        <Metric
          label="Open tasks"
          value={summary.openTasks}
          hint={
            summary.overdueTasks > 0
              ? `${summary.overdueTasks} overdue`
              : 'Nothing overdue'
          }
          icon={Check}
          tone={summary.overdueTasks > 0 ? 'warning' : 'success'}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <GrowthCard />
        <AttentionCard summary={summary} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <UpcomingEventsCard />
        <TaskListCard />
        <ActivityCard />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <CommunityTable />
        </div>
        <MixCard />
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 pt-1 pb-2 text-[11px] text-content-3">
        <p>
          Demo mode — data is generated locally and saved in your browser.{' '}
          <a href="#/settings/data" className="text-brand-content hover:underline">
            Reset or inspect it
          </a>
          .
        </p>
        <button
          type="button"
          onClick={() => actions.notify('Nothing to sync: this template has no backend yet', 'info')}
          className="rounded-control border border-line px-2.5 py-1 transition-colors hover:bg-surface-2"
        >
          Sync status: local
        </button>
      </footer>
    </div>
  )
}
