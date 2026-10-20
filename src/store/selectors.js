/**
 * Derived reads over the store.
 *
 * Every number the UI presents as a metric or plots as a chart comes from here
 * rather than from a hardcoded constant, so editing a record in the demo
 * immediately changes the dashboard, analytics and breakdowns.
 */
import {
  DAY_MS,
  addDays,
  isSameDay,
  mondayIndex,
  percentChange,
  startOfDay,
  startOfWeek,
  sum,
} from '../lib/utils.js'

export function byId(list) {
  const map = new Map()
  for (const item of list) map.set(item.id, item)
  return map
}

export function lookupMember(state, id) {
  return state.members.find((m) => m.id === id) || null
}

export function lookupCommunity(state, id) {
  return state.communities.find((c) => c.id === id) || null
}

const within = (iso, ms) => Date.now() - new Date(iso).getTime() <= ms
const inFuture = (iso, ms) => new Date(iso).getTime() - Date.now() <= ms

/* ------------------------------------------------------------- communities -- */

export function communityStats(state, community) {
  const roster = community.memberIds
    .map((id) => lookupMember(state, id))
    .filter(Boolean)

  const members = roster.length
  const online = roster.filter((m) => m.online).length
  const activeWeek = roster.filter((m) => m.status === 'active' && within(m.lastActiveAt, 7 * DAY_MS)).length
  const events = state.events.filter((e) => e.communityId === community.id)
  const upcomingEvents = events.filter((e) => new Date(e.endsAt) >= new Date()).length
  const openTasks = state.tasks.filter(
    (t) => t.communityId === community.id && t.status !== 'done',
  ).length
  const published = state.content.filter(
    (c) => c.communityId === community.id && c.status === 'published',
  )

  return {
    members,
    online,
    activeThisWeek: activeWeek,
    engagementRate: members ? Math.round((activeWeek / members) * 100) : 0,
    owner: lookupMember(state, community.ownerId),
    moderators: community.moderatorIds.map((id) => lookupMember(state, id)).filter(Boolean),
    events: events.length,
    upcomingEvents,
    openTasks,
    published,
    unread: sum(community.channels, (channel) => channel.unread),
    contentCount: state.content.filter((c) => c.communityId === community.id).length,
    reach: sum(published, (item) => item.metrics.views),
    latestActivity: state.activity
      .filter((a) => a.targetKind === 'community' && a.targetId === community.id)
      .sort((a, b) => new Date(b.at) - new Date(a.at))[0],
  }
}

export function communitySummaries(state) {
  return state.communities.map((community) => ({
    community,
    stats: communityStats(state, community),
  }))
}

/* ------------------------------------------------------------------ members -- */

export function newMembersThisMonth(state) {
  const now = new Date()
  return state.members.filter((m) => {
    const d = new Date(m.joinedAt)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })
}

export function activeMembersThisWeek(state) {
  return state.members.filter(
    (m) => m.status === 'active' && within(m.lastActiveAt, 7 * DAY_MS),
  )
}

/** Twelve-month membership series; the newest point is always the live total. */
export function memberGrowthSeries(state) {
  const now = new Date()
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const live = {
    key,
    label: now.toLocaleString('en-US', { month: 'short' }),
    year: now.getFullYear(),
    joined: newMembersThisMonth(state).length,
    departed: 0,
    partial: true,
  }
  const history = state.analytics.monthlyHistory

  // Seeded history already ends on the current month, so refresh that point with
  // live counts instead of appending a second one and drawing the label twice.
  const last = history[history.length - 1]
  const rows =
    last && last.key === key
      ? [...history.slice(0, -1), { ...last, ...live }]
      : [...history, live]

  let running = state.members.length
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    rows[i].total = running
    if (i > 0) running -= rows[i].joined - rows[i].departed
  }
  return rows
}

/* ---------------------------------------------------------------- engagement -- */

/** Fifty-nine seeded days plus today, counted from the live records. */
export function engagementSeries(state) {
  const now = Date.now()
  const todays = (iso) => within(iso, DAY_MS) && new Date(iso).getTime() <= now

  const messages = state.conversations.flatMap((c) => c.messages)
  const todayPosts =
    messages.filter((m) => todays(m.at)).length +
    state.content.filter((c) => c.publishedAt && todays(c.publishedAt)).length
  const todayComments = state.activity.filter((a) => todays(a.at)).length
  const todayReactions = sum(
    messages.filter((m) => todays(m.at)),
    (m) => m.reactions,
  )

  return [
    ...state.analytics.dailyHistory,
    {
      key: new Date().toISOString().slice(0, 10),
      label: 'Today',
      activeMembers: state.members.filter((m) => m.online).length,
      posts: todayPosts,
      comments: todayComments,
      reactions: todayReactions,
      live: true,
    },
  ]
}

export function engagementTotals(state, days = 30) {
  const all = engagementSeries(state)
  const series = all.slice(-days)
  const previousSeries = all.slice(-days * 2, -days)
  const totals = (rows) => ({
    posts: sum(rows, (r) => r.posts),
    comments: sum(rows, (r) => r.comments),
    reactions: sum(rows, (r) => r.reactions),
  })
  return { series, previousSeries, current: totals(series), previous: totals(previousSeries) }
}

/* -------------------------------------------------------------------- events -- */

export function upcomingEvents(state, limit = 5) {
  const now = Date.now()
  return state.events
    .filter((e) => new Date(e.endsAt).getTime() >= now)
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
    .slice(0, limit)
}

export function pastEvents(state, limit = 12) {
  const now = Date.now()
  return state.events
    .filter((e) => new Date(e.endsAt).getTime() < now)
    .sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt))
    .slice(0, limit)
}

export function eventsOn(state, date) {
  const day = startOfDay(date).getTime()
  return state.events
    .filter((e) => {
      const starts = startOfDay(new Date(e.startsAt)).getTime()
      const ends = startOfDay(new Date(e.endsAt)).getTime()
      return starts <= day && ends >= day
    })
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
}

/** Events grouped by Monday-keyed week, used by the week and agenda views. */
export function eventsByWeekday(state, anchor) {
  const start = startOfWeek(anchor)
  return Array.from({ length: 7 }, (_, i) => eventsOn(state, addDays(start, i)))
}

export function attendanceSeries(state) {
  const rand = (id) => (id.charCodeAt(2) * 7 + id.charCodeAt(3)) % 20
  return pastEvents(state, 8)
    .slice()
    .reverse()
    .map((event) => ({
      eventId: event.id,
      label: event.title,
      kind: event.kind,
      registered: event.attendeeIds.length,
      capacity: event.capacity,
      attended: Math.min(
        event.attendeeIds.length,
        Math.round(event.attendeeIds.length * (0.7 + (rand(event.id) % 10) / 40)),
      ),
    }))
}

/* --------------------------------------------------------------------- tasks -- */

export function tasksByStatus(state) {
  const groups = new Map()
  for (const status of ['todo', 'doing', 'review', 'done']) groups.set(status, [])
  for (const task of state.tasks) {
    groups.get(task.status)?.push(task)
  }
  return groups
}

export function overdueTasks(state) {
  const now = startOfDay(new Date()).getTime()
  return state.tasks.filter(
    (t) => t.status !== 'done' && new Date(t.dueDate).getTime() < now,
  )
}

/* ------------------------------------------------------------------- content -- */

export function publishedContent(state) {
  return state.content.filter((c) => c.status === 'published')
}

export function contentPerformance(state, limit = 8) {
  return publishedContent(state)
    .map((item) => ({
      contentId: item.id,
      title: item.title,
      category: item.category,
      communityId: item.communityId,
      ...item.metrics,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, limit)
}

export function scheduledContent(state) {
  return state.content
    .filter((c) => c.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor))
}

/* ------------------------------------------------------------ breakdowns ----- */

export function categoryBreakdown(state) {
  return state.communities
    .map((community) => {
      const stats = communityStats(state, community)
      return {
        communityId: community.id,
        label: community.name,
        category: community.category,
        members: stats.members,
        engagement: stats.engagementRate,
      }
    })
    .sort((a, b) => b.members - a.members)
}

export function channelMix(state) {
  const totals = new Map()
  for (const conversation of state.conversations) {
    const community = lookupCommunity(state, conversation.communityId)
    if (!community) continue
    totals.set(community.name, (totals.get(community.name) || 0) + conversation.messages.length)
  }
  return state.communities
    .map((community) => ({
      label: community.name,
      value: totals.get(community.name) || 0,
    }))
    .sort((a, b) => b.value - a.value)
}

export function roleSplit(state) {
  const counts = new Map()
  for (const member of state.members) {
    counts.set(member.role, (counts.get(member.role) || 0) + 1)
  }
  const order = ['owner', 'moderator', 'member']
  return order
    .filter((key) => counts.has(key))
    .map((key) => ({ label: key[0].toUpperCase() + key.slice(1), value: counts.get(key) }))
}

/* ------------------------------------------------------------ member health -- */

/**
 * Member health is a transparent rubric, not a black box: a score starts at
 * 100 and loses the weights below, each penalty also emitting the reason chip
 * the UI shows. Nothing is stored — the board is recomputed from the member
 * records on every read, so marking somebody inactive or letting an invite
 * age moves them down the list immediately.
 */
export const HEALTH_BUCKETS = [
  { key: 'thriving', label: 'Thriving', tone: 'success', min: 85 },
  { key: 'steady', label: 'Steady', tone: 'info', min: 65 },
  { key: 'watch', label: 'Watch', tone: 'warning', min: 40 },
  { key: 'at-risk', label: 'At risk', tone: 'danger', min: 0 },
]

export function memberHealth(member, now = Date.now()) {
  const reasons = []
  const add = (weight, text, tone) => reasons.push({ weight, text, tone })

  const daysQuiet = Math.max(0, Math.floor((now - new Date(member.lastActiveAt).getTime()) / DAY_MS))
  const daysSinceJoined = Math.max(0, Math.floor((now - new Date(member.joinedAt).getTime()) / DAY_MS))

  if (member.status === 'suspended') add(50, 'Account suspended', 'danger')
  else if (member.status === 'invited') add(35, `Invite never accepted (${daysSinceJoined}d)`, 'warning')
  else if (member.status === 'inactive') add(30, 'Marked inactive', 'warning')

  // Silence only counts against people who could actually have been active;
  // an unaccepted invite has no activity to be quiet about. For members the
  // workspace already flagged, long silence is expected — it confirms the
  // status chip at a discount instead of doubling the penalty.
  if (member.status !== 'invited' && daysQuiet >= 30) {
    add(member.status === 'active' ? 40 : 20, `Quiet for ${daysQuiet}d`, 'danger')
  } else if (member.status === 'active') {
    if (daysQuiet >= 14) add(25, `Quiet for ${daysQuiet}d`, 'danger')
    else if (daysQuiet >= 7) add(15, `Quiet for ${daysQuiet}d`, 'warning')
    else if (daysQuiet >= 3) add(5, `Quiet for ${daysQuiet}d`, 'neutral')
  }

  if (member.status !== 'invited' && member.communityIds.length === 0) {
    add(25, 'Left every room', 'danger')
  }

  if (member.status === 'active' && daysSinceJoined <= 21 && member.contributions.posts <= 2) {
    add(10, 'Newcomer barely posting', 'warning')
  }

  reasons.sort((a, b) => b.weight - a.weight)
  const score = Math.max(0, 100 - sum(reasons, (r) => r.weight))
  const bucket = HEALTH_BUCKETS.find((b) => score >= b.min)
  return {
    score,
    risk: bucket.key,
    daysQuiet,
    reasons: reasons.map(({ text, tone }) => ({ text, tone })),
  }
}

/** Every member with their score and reasons, worst first. */
export function healthBoard(state, now = Date.now()) {
  return state.members
    .map((member) => ({ member, ...memberHealth(member, now) }))
    .sort((a, b) => a.score - b.score || a.member.name.localeCompare(b.member.name))
}

export function healthSummary(state, now = Date.now()) {
  const board = healthBoard(state, now)
  const inBucket = (key) => board.filter((row) => row.risk === key).length
  return {
    total: board.length,
    thriving: inBucket('thriving'),
    steady: inBucket('steady'),
    watch: inBucket('watch'),
    atRisk: inBucket('at-risk'),
    averageScore: board.length ? Math.round(sum(board, (row) => row.score) / board.length) : 0,
    invitesPending: state.members.filter((m) => m.status === 'invited').length,
  }
}

export function riskDistribution(state, now = Date.now()) {
  const summary = healthSummary(state, now)
  const byBucket = {
    thriving: summary.thriving,
    steady: summary.steady,
    watch: summary.watch,
    'at-risk': summary.atRisk,
  }
  return HEALTH_BUCKETS.map((bucket) => ({ label: bucket.label, value: byBucket[bucket.key] }))
}

/* ------------------------------------------------------------------ reports -- */

/** The queue, oldest first — a report ages, it does not arrive. */
export function reportsFor(state, communityId = null) {
  return state.reports
    .filter((r) => !communityId || r.communityId === communityId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
}

export function moderationCounts(state) {
  const counts = { open: 0, reviewing: 0, resolved: 0, dismissed: 0, urgent: 0, total: state.reports.length }
  for (const report of state.reports) {
    counts[report.status] += 1
    if (report.status === 'open' && report.urgent) counts.urgent += 1
  }
  return counts
}

/* --------------------------------------------------------------- dashboard ----- */

export function unreadNotifications(state) {
  return state.notifications.filter((n) => !n.read)
}

export function dashboardSummary(state) {
  const growth = memberGrowthSeries(state)
  const lastMonth = growth[growth.length - 2]?.total ?? growth[0].total
  const totalMembers = state.members.length
  const active = state.members.filter((m) => m.status === 'active')
  const engagement = engagementTotals(state, 30)

  const engagementRate = totalMembers
    ? Math.round((activeMembersThisWeek(state).length / totalMembers) * 100)
    : 0
  // The headline rate is a *weekly unique* figure taken from live records, so it
  // cannot be differenced against the seeded *daily* history — those are not the
  // same measure. The delta therefore compares like with like: the daily-active
  // average of the current 30 days (today excluded, it is still in progress)
  // against the 30 days before it.
  const averageDailyActive = (rows) =>
    rows.length ? sum(rows, (d) => d.activeMembers) / rows.length : 0
  const currentDays = engagement.series.filter((d) => !d.live)
  const dailyActiveChange = percentChange(
    averageDailyActive(currentDays),
    averageDailyActive(engagement.previousSeries),
  )
  const dailyActiveShare = totalMembers
    ? Math.round((averageDailyActive(engagement.series) / totalMembers) * 100)
    : 0

  return {
    totalMembers,
    activeMembers: active.length,
    onlineNow: state.members.filter((m) => m.online).length,
    newThisMonth: newMembersThisMonth(state).length,
    growthPercent: percentChange(totalMembers, lastMonth),
    engagementRate,
    engagementDelta: dailyActiveChange,
    dailyActiveShare,
    posts: engagement.current.posts,
    comments: engagement.current.comments,
    reactions: engagement.current.reactions,
    postsDelta: percentChange(engagement.current.posts, engagement.previous.posts),
    commentsDelta: percentChange(engagement.current.comments, engagement.previous.comments),
    communities: state.communities.length,
    upcomingEvents: upcomingEvents(state, 99).length,
    openTasks: state.tasks.filter((t) => t.status !== 'done').length,
    overdueTasks: overdueTasks(state).length,
    unreadNotifications: unreadNotifications(state).length,
    drafts: state.content.filter((c) => c.status === 'draft').length,
    scheduledContent: state.content.filter((c) => c.status === 'scheduled').length,
    atRiskMembers: healthSummary(state).atRisk,
    openReports: state.reports.filter((r) => r.status === 'open').length,
    urgentReports: state.reports.filter((r) => r.status === 'open' && r.urgent).length,
  }
}

export function recentActivity(state, limit = 8) {
  return [...state.activity]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, limit)
}

/* ------------------------------------------------------------- small helpers -- */

export function weekLabel(date) {
  const start = startOfWeek(date)
  const end = addDays(start, 6)
  return `${start.toLocaleString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleString('en-US', { month: 'short', day: 'numeric' })}`
}

export function isToday(date) {
  return isSameDay(date, new Date())
}

export function isWeekend(date) {
  return mondayIndex(date) >= 5
}

/** Filter over the shared date-range control. */
export function withinRange(iso, range) {
  if (range === 'all') return true
  const days = { '7d': 7, '30d': 30, '90d': 90 }[range]
  if (!days) return true
  return Date.now() - new Date(iso).getTime() <= days * DAY_MS
}
