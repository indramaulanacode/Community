import { useState } from 'react'
import {
  Activity,
  CalendarCheck,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Heart,
  Info,
  MessageSquare,
  Percent,
  Ticket,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react'
import { Link, navigate } from '../lib/router.jsx'
import { downloadFile, formatFull, percentChange, sum, toCsv } from '../lib/utils.js'
import { useApp } from '../store/AppStore.jsx'
import {
  activeMembersThisWeek,
  attendanceSeries,
  categoryBreakdown,
  channelMix,
  contentPerformance,
  dashboardSummary,
  engagementSeries,
  engagementTotals,
  memberGrowthSeries,
  roleSplit,
} from '../store/selectors.js'
import { Button } from '../components/ui/Button.jsx'
import { Badge, Metric, Progress, TableShell, Td, Th, Tr } from '../components/ui/Data.jsx'
import { Card, CardBody, CardHeader, PageHeader } from '../components/ui/Surface.jsx'
import { Segmented } from '../components/ui/Navigation.jsx'
import {
  BarChart,
  ChartLegend,
  DonutChart,
  LineChart,
  RankedBars,
} from '../components/ui/Charts.jsx'

const RANGES = [
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: 'all', label: 'All' },
]
const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90, all: 365 }
const RANGE_LABEL = { '7d': 'last 7 days', '30d': 'last 30 days', '90d': 'last 90 days', all: 'all recorded time' }

/* ------------------------------------------------------------------- csv --- */

/* BOM keeps Excel from mangling the accented names in the roster. */
const downloadCsv = (filename, rows) =>
  downloadFile(filename, `\ufeff${toCsv(rows)}`, 'text/csv;charset=utf-8;')

/* ------------------------------------------------- ranked bars with links -- */

/* RankedBars has no per-row navigation, so the community breakdown needs its
   own linked variant built from the same tokens. */
function LinkedRankedBars({ data, valueKey, communityHref }) {
  const max = Math.max(1, ...data.map((row) => Number(row[valueKey]) || 0))
  return (
    <ul className="flex flex-col gap-2.5">
      {data.map((row) => {
        const value = Number(row[valueKey]) || 0
        return (
          <li key={row.communityId} className="group">
            <Link to={communityHref(row)} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1">
              <span className="truncate text-xs text-content group-hover:text-brand-content">{row.label}</span>
              <span className="text-[11px] font-semibold text-content-2 tnum">{value}</span>
              <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
                <span
                  className="block h-full rounded-full bg-[var(--chart-1)] transition-[width] duration-300"
                  style={{ width: `${(value / max) * 100}%` }}
                />
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/* -------------------------------------------------------------------- page -- */

export default function AnalyticsPage({ query }) {
  const { state, actions } = useApp()
  const initial = query.get('range')
  const [range, setRange] = useState(RANGES.some((r) => r.key === initial) ? initial : '30d')

  const days = RANGE_DAYS[range]
  const summary = dashboardSummary(state)
  const totals = engagementTotals(state, days)
  const cur = totals.current
  const prev = totals.previous
  const deltaOf = (current, previous) => (previous ? percentChange(current, previous) : undefined)

  const growth = memberGrowthSeries(state)
  const engAll = engagementSeries(state)
  const engRows = range === 'all' || days >= engAll.length ? engAll : engAll.slice(-days)

  const breakdown = categoryBreakdown(state)
  const roles = roleSplit(state)
  const attendance = attendanceSeries(state)
  const mix = channelMix(state).filter((row) => row.value > 0)
  const topContent = contentPerformance(state, 10)

  const reach = sum(state.content, (item) => item.metrics.views)
  const registered = sum(attendance, (row) => row.registered)
  const attended = sum(attendance, (row) => row.attended)
  const attendanceRate = registered ? Math.round((attended / registered) * 100) : 0
  const doneTasks = state.tasks.filter((t) => t.status === 'done').length
  const completionRate = state.tasks.length ? Math.round((doneTasks / state.tasks.length) * 100) : 0

  const exportReport = () => {
    const rows = []
    rows.push(['Communities analytics export', formatFull(new Date()), `Range: ${RANGE_LABEL[range]}`])
    rows.push([])
    rows.push(['# Member growth (monthly)'])
    rows.push(['Month', 'Joined', 'Departed', 'Total'])
    for (const r of growth) rows.push([`${r.label} ${r.year}`, r.joined, r.departed, r.total])
    rows.push([])
    rows.push(['# Daily engagement'])
    rows.push(['Day', 'Active members', 'Posts', 'Comments', 'Reactions'])
    for (const r of engRows) rows.push([r.label, r.activeMembers, r.posts, r.comments, r.reactions])
    rows.push([])
    rows.push(['# Community breakdown'])
    rows.push(['Community', 'Category', 'Members', 'Engagement rate %'])
    for (const r of breakdown) rows.push([r.label, r.category, r.members, r.engagement])
    rows.push([])
    rows.push(['# Event attendance'])
    rows.push(['Event', 'Type', 'Registered', 'Capacity', 'Attended'])
    for (const r of attendance) rows.push([r.label, r.kind, r.registered, r.capacity, r.attended])
    rows.push([])
    rows.push(['# Content performance'])
    rows.push(['Title', 'Category', 'Views', 'Likes', 'Comments', 'Shares'])
    for (const r of topContent) rows.push([r.title, r.category, r.views, r.likes, r.comments, r.shares])

    downloadCsv(`communities-analytics-${range}.csv`, rows)
    actions.notify(`Exported ${rows.length - 2} rows across 5 datasets`, 'info')
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Analytics"
        description={`Every figure is computed from live records over the ${RANGE_LABEL[range]}. Today is counted live from messages and published content.`}
        actions={
          <>
            <Segmented size="sm" options={RANGES} value={range} onChange={setRange} />
            <Button variant="secondary" icon={Download} onClick={exportReport}>
              Export report (CSV)
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Metric label="Total members" value={summary.totalMembers} delta={summary.growthPercent} hint="vs. 3 months ago" icon={Users} tone="brand" />
        <Metric label="Active this week" value={activeMembersThisWeek(state).length} hint={`${summary.onlineNow} online now`} icon={UserCheck} tone="success" />
        <Metric label="Engagement rate" value={`${summary.engagementRate}%`} delta={summary.engagementDelta} deltaSuffix=" pts" hint="active / total, 7-day" icon={Activity} tone="accent" />
        <Metric label="Reach" value={reach} hint="total content views" icon={Eye} tone="info" />

        <Metric label="Posts" value={cur.posts} delta={deltaOf(cur.posts, prev.posts)} hint={prev.posts ? 'vs. previous period' : 'no prior window in demo'} icon={FileText} tone="brand" />
        <Metric label="Comments" value={cur.comments} delta={deltaOf(cur.comments, prev.comments)} hint={prev.comments ? 'vs. previous period' : 'no prior window in demo'} icon={MessageSquare} tone="accent" />
        <Metric label="Reactions" value={cur.reactions} delta={deltaOf(cur.reactions, prev.reactions)} hint={prev.reactions ? 'vs. previous period' : 'no prior window in demo'} icon={Heart} tone="info" />
        <Metric label="Live events attended" value={attended} hint={`${registered} registered`} icon={Ticket} tone="success" />

        <Metric label="Attendance rate" value={`${attendanceRate}%`} hint="attended / registered" icon={CalendarCheck} tone="brand" />
        <Metric label="Task completion" value={`${completionRate}%`} hint={`${doneTasks} of ${state.tasks.length} tasks done`} icon={CheckCircle2} tone="success" />
        <Metric label="Upcoming events" value={summary.upcomingEvents} hint="still on the calendar" icon={Activity} tone="info" />
        <Metric label="Open tasks" value={summary.openTasks} hint={summary.overdueTasks ? `${summary.overdueTasks} overdue` : 'Nothing overdue'} invertDelta delta={summary.overdueTasks ? -summary.overdueTasks : undefined} deltaSuffix="" icon={Percent} tone={summary.overdueTasks ? 'warning' : 'success'} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Member growth" description="Running total across all communities, trailing 12 months." icon={TrendingUp} action={<Badge tone="brand">{growth[growth.length - 1].total} members</Badge>} />
          <CardBody>
            <LineChart
              data={growth}
              xKey="label"
              height={240}
              series={[{ key: 'total', label: 'Members' }]}
              formatValue={(v) => Math.round(v)}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Joins vs departures" description="Monthly movement feeding the growth line." icon={UserCheck} />
          <CardBody>
            <LineChart
              data={growth}
              xKey="label"
              height={168}
              series={[
                { key: 'joined', label: 'Joins' },
                { key: 'departed', label: 'Departures', color: 'var(--chart-2)' },
              ]}
              formatValue={(v) => Math.round(v)}
            />
            <ChartLegend
              className="mt-4 border-t border-line pt-3"
              series={[
                { key: 'joined', label: 'Total joins', value: sum(growth, (r) => r.joined) },
                { key: 'departed', label: 'Total departures', value: sum(growth, (r) => r.departed) },
              ]}
            />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Engagement over time" description={`Posts, comments and reactions per day across the ${RANGE_LABEL[range]}.`} icon={Activity} />
        <CardBody>
          <LineChart
            data={engRows}
            xKey="label"
            height={260}
            formatX={(value) => (value === 'Today' ? 'Today' : String(value).split(' ')[1] || value)}
            series={[
              { key: 'posts', label: 'Posts' },
              { key: 'comments', label: 'Comments' },
              { key: 'reactions', label: 'Reactions', color: 'var(--chart-4)' },
            ]}
          />
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Role split" description="Global roles across the workspace." icon={Users} />
          <CardBody>
            <DonutChart data={roles} centerLabel="Members" centerValue={summary.totalMembers} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Where the conversation is" description="Message volume by community." icon={MessageSquare} />
          <CardBody>
            {mix.length ? (
              <DonutChart data={mix} centerLabel="Messages" centerValue={sum(mix, (r) => r.value)} />
            ) : (
              <p className="text-[13px] text-content-3">No recorded messages yet.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Community size ranking" description="Members per community — select a row to open it." icon={TrendingUp} />
          <CardBody>
            <LinkedRankedBars data={breakdown} valueKey="members" communityHref={(row) => `/communities/${row.communityId}`} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Engagement by community" description="Share of active members in the last week." icon={Activity} />
          <CardBody>
            <RankedBars data={breakdown} valueKey="engagement" labelKey="label" formatValue={(v) => `${Math.round(v)}%`} />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Event attendance" description="Recent events, attended versus registered." icon={CalendarCheck} />
        <CardBody>
          <BarChart data={attendance} valueKey="attended" xKey="label" height={200} color="var(--chart-3)" />
          <div className="mt-4 overflow-hidden">
            <TableShell>
              <thead>
                <tr>
                  <Th>Event</Th>
                  <Th>Type</Th>
                  <Th align="right">Registered</Th>
                  <Th align="right">Capacity</Th>
                  <Th align="right">Attended</Th>
                  <Th className="w-40">Fill rate</Th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((row) => {
                  const fill = row.registered ? Math.round((row.attended / row.registered) * 100) : 0
                  return (
                    <Tr key={row.eventId} onClick={() => navigate(`/events/${row.eventId}`)}>
                      <Td className="max-w-56 truncate font-medium">{row.label}</Td>
                      <Td className="text-content-2">{row.kind}</Td>
                      <Td align="right" className="tnum">{row.registered}</Td>
                      <Td align="right" className="tnum text-content-2">{row.capacity}</Td>
                      <Td align="right" className="tnum">{row.attended}</Td>
                      <Td>
                        <span className="flex items-center gap-2">
                          <Progress value={fill} tone={fill > 80 ? 'success' : fill > 50 ? 'brand' : 'warning'} className="max-w-24" label={`${fill} percent of registrations attended`} />
                          <span className="text-[11px] text-content-2 tnum">{fill}%</span>
                        </span>
                      </Td>
                    </Tr>
                  )
                })}
              </tbody>
            </TableShell>
          </div>
        </CardBody>
      </Card>

      <Card padded={false} className="overflow-hidden">
        <CardHeader className="p-4 sm:p-5" title="Top performing content" description="Published items ranked by views, with an engagement ratio." icon={FileText} />
        <div className="mt-4">
          <TableShell>
            <thead>
              <tr>
                <Th>Title</Th>
                <Th className="hidden md:table-cell">Category</Th>
                <Th align="right">Views</Th>
                <Th align="right">Likes</Th>
                <Th align="right">Comments</Th>
                <Th align="right">Shares</Th>
                <Th align="right">Engage</Th>
              </tr>
            </thead>
            <tbody>
              {topContent.map((row) => {
                const engage = row.views ? Math.round(((row.likes + row.comments) / row.views) * 100) : 0
                return (
                  <Tr key={row.contentId} onClick={() => navigate(`/content/${row.contentId}`)}>
                    <Td className="max-w-64 truncate font-medium">{row.title}</Td>
                    <Td className="hidden text-content-2 md:table-cell">{row.category}</Td>
                    <Td align="right" className="tnum">{row.views}</Td>
                    <Td align="right" className="tnum">{row.likes}</Td>
                    <Td align="right" className="tnum">{row.comments}</Td>
                    <Td align="right" className="tnum">{row.shares}</Td>
                    <Td align="right">
                      <Badge tone={engage > 25 ? 'success' : engage > 12 ? 'brand' : 'neutral'}>{engage}%</Badge>
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </TableShell>
        </div>
      </Card>

      <div className="flex gap-3 rounded-panel border border-info/30 bg-info-soft p-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-control bg-surface text-info-content">
          <Info size={15} strokeWidth={1.9} />
        </span>
        <p className="text-[13px] leading-relaxed text-content-2">
          <span className="font-semibold text-content">How these numbers are built.</span> Prior
          months and days come from seeded history, because a demo cannot replay real elapsed time.
          The current month, today's engagement, all breakdowns, attendance and content performance
          are recomputed from live records — edit a member, task or post and these charts move.
        </p>
      </div>
    </div>
  )
}
