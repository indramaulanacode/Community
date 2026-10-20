/**
 * Logic tests for the demo data layer — run with `npm run verify`.
 *
 * Deliberately dependency-free: it imports the same ESM modules the app uses and
 * asserts the invariants the UI relies on (referential integrity, series maths,
 * formatters). Browser behaviour — rendering, dialogs, responsive layout, deep
 * links — is covered by `npm run smoke`, which drives headless Chrome.
 */
import {
  MEMBER_STATUSES,
  REPORT_KINDS,
  REPORT_REASONS,
  REPORT_STATUSES,
  loadSeed,
} from '../src/data/seed.js'
import * as S from '../src/store/selectors.js'
import {
  addDays,
  csvCell,
  dayKey,
  dueLabel,
  formatDateRange,
  formatMonth,
  matchesQuery,
  monthGrid,
  oneOf,
  percentChange,
  relativeTime,
  startOfWeek,
  toCsv,
  uid,
} from '../src/lib/utils.js'

let passed = 0
const failures = []

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`)
  }
}

function eq(name, actual, expected) {
  check(name, actual === expected, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
}

const state = loadSeed()
const now = Date.now()
const ids = (list) => new Set(list.map((row) => row.id))
const dupCount = (values) => values.length - new Set(values).size

/* ------------------------------------------------------------------ seed ---- */

console.log('seed: loadSeed() runs and returns every collection')
check('all collections present', ['members', 'communities', 'events', 'tasks', 'content', 'collections', 'conversations', 'reports', 'notifications', 'activity', 'analytics'].every((k) => Array.isArray(state[k]) || (k === 'analytics' && typeof state[k] === 'object')), 'missing a top-level key')
check('seed version is 2', state.version === 2, `got ${state.version}`)
check('workspace seeded', Boolean(state.workspace?.name && state.workspace.timezone))
check('current user exists', state.members.some((m) => m.id === state.currentUserId))
check('prefs complete', ['theme', 'sidebarCollapsed', 'landingPage'].every((k) => k in state.prefs) && typeof state.prefs.notify === 'object')

console.log('seed: stable unique identifiers, no duplicate handles or emails')
eq('duplicate member ids', dupCount(state.members.map((m) => m.id)), 0)
eq('duplicate handles', dupCount(state.members.map((m) => m.handle)), 0)
eq('duplicate emails', dupCount(state.members.map((m) => m.email)), 0)
eq('duplicate event ids', dupCount(state.events.map((e) => e.id)), 0)
eq('duplicate task ids', dupCount(state.tasks.map((t) => t.id)), 0)
eq('duplicate content ids', dupCount(state.content.map((c) => c.id)), 0)
eq('duplicate notification ids', dupCount(state.notifications.map((n) => n.id)), 0)

console.log('seed: no template placeholder copy survives')
const placeholder = /lorem ipsum|place your name|button title|messeger here|your text here/i
const haystack = [
  ...state.members.map((m) => `${m.name} ${m.title} ${m.bio}`),
  ...state.communities.map((c) => `${c.name} ${c.about}`),
  ...state.events.map((e) => `${e.title} ${e.description}`),
  ...state.tasks.map((t) => `${t.title} ${t.description}`),
  ...state.content.map((c) => `${c.title} ${c.excerpt} ${c.body}`),
].join('\n')
check('placeholder copy absent', !placeholder.test(haystack), 'found lorem/placeholder text in the seed')
check(
  'every post has its own opening copy',
  new Set(state.content.map((c) => c.excerpt)).size === state.content.length &&
    new Set(state.content.map((c) => c.body)).size === state.content.length,
)

console.log('seed: every reference resolves')
const memberIds = ids(state.members)
const communityIds = ids(state.communities)
for (const community of state.communities) {
  check(`community ${community.id} owner exists`, memberIds.has(community.ownerId))
  check(
    `community ${community.id} roster resolves`,
    community.memberIds.every((id) => memberIds.has(id)),
  )
  check(
    `community ${community.id} moderators are members`,
    community.moderatorIds.every((id) => community.memberIds.includes(id)),
  )
  check(`community ${community.id} has channels`, community.channels.length > 0)
}
for (const member of state.members) {
  check(
    `member ${member.id} communities resolve`,
    member.communityIds.every((id) => communityIds.has(id)),
  )
}
for (const event of state.events) {
  check(`event ${event.id} community resolves`, communityIds.has(event.communityId))
  check(`event ${event.id} host resolves`, memberIds.has(event.hostId))
  check(
    `event ${event.id} ends after it starts`,
    new Date(event.endsAt) > new Date(event.startsAt),
  )
  check(`event ${event.id} has a location`, Boolean(event.location?.label))
  check(
    `event ${event.id} attendees are community members`,
    event.attendeeIds.every((id) =>
      state.communities.find((c) => c.id === event.communityId)?.memberIds.includes(id),
    ),
  )
  check(`event ${event.id} within capacity`, event.attendeeIds.length <= event.capacity)
}
for (const task of state.tasks) {
  check(`task ${task.id} assignee resolves`, memberIds.has(task.assigneeId))
  check(`task ${task.id} community resolves`, communityIds.has(task.communityId))
  check(
    `task ${task.id} completedAt matches status`,
    (task.status === 'done') === Boolean(task.completedAt),
  )
}
for (const item of state.content) {
  check(`content ${item.id} author resolves`, memberIds.has(item.authorId))
  check(`content ${item.id} community resolves`, communityIds.has(item.communityId))
  check(
    `content ${item.id} collection resolves`,
    state.collections.some((c) => c.id === item.collectionId),
  )
  check(
    `content ${item.id} published flag matches status`,
    (item.status === 'published') === Boolean(item.publishedAt),
  )
  check(
    `content ${item.id} scheduled flag matches status`,
    (item.status === 'scheduled') === Boolean(item.scheduledFor),
  )
}
for (const collection of state.collections) {
  check(
    `collection ${collection.id} items resolve`,
    collection.itemIds.every((id) => state.content.some((c) => c.id === id)),
  )
}
for (const conversation of state.conversations) {
  check(`conversation ${conversation.id} has messages`, conversation.messages.length > 0)
  check(
    `conversation ${conversation.id} authors resolve`,
    conversation.messages.every((m) => memberIds.has(m.authorId)),
  )
}
const channelIds = new Set(state.communities.flatMap((c) => c.channels.map((ch) => ch.id)))
const messageIds = new Set(state.conversations.flatMap((c) => c.messages.map((m) => m.id)))
const againstPools = {
  member: memberIds,
  content: ids(state.content),
  thread: channelIds,
  message: messageIds,
}
const reportStatusKeys = REPORT_STATUSES.map((s) => s.key)
const reportKindKeys = REPORT_KINDS.map((k) => k.key)
const reportReasonKeys = REPORT_REASONS.map((r) => r.key)
eq('duplicate report ids', dupCount(state.reports.map((r) => r.id)), 0)
for (const report of state.reports) {
  check(`report ${report.id} community resolves`, communityIds.has(report.communityId))
  check(`report ${report.id} reporter resolves`, memberIds.has(report.reporterId))
  check(
    `report ${report.id} target resolves for its kind`,
    againstPools[report.kind]?.has(report.againstId) === true,
    `kind ${report.kind} against ${report.againstId}`,
  )
  check(`report ${report.id} kind is known`, reportKindKeys.includes(report.kind))
  check(`report ${report.id} reason is known`, reportReasonKeys.includes(report.reason))
  check(`report ${report.id} status is known`, reportStatusKeys.includes(report.status))
  check(
    `report ${report.id} closure matches its status`,
    (report.status === 'resolved' || report.status === 'dismissed') ===
      (Boolean(report.resolvedAt) && Boolean(report.resolution)),
  )
  check(
    `report ${report.id} resolved after created`,
    !report.resolvedAt || new Date(report.resolvedAt) >= new Date(report.createdAt),
  )
  check(`report ${report.id} detail is real copy`, report.detail.length > 40)
}
const targetPools = {
  event: ids(state.events),
  task: ids(state.tasks),
  community: communityIds,
  member: memberIds,
  content: ids(state.content),
  report: ids(state.reports),
}
for (const notification of state.notifications) {
  const pool = targetPools[notification.target?.type]
  if (pool) {
    check(`notification ${notification.id} target resolves`, pool.has(notification.target.id))
  }
}
for (const entry of state.activity) {
  check(`activity ${entry.id} actor resolves`, memberIds.has(entry.actorId))
}

console.log('seed: dates are relative to today, so the demo never looks stale')
check('has upcoming events', state.events.some((e) => new Date(e.endsAt) > now))
check('has past events', state.events.some((e) => new Date(e.endsAt) <= now))
check('has open tasks', state.tasks.some((t) => t.status !== 'done'))
check('has unread notifications', state.notifications.some((n) => !n.read))
check('has open reports', state.reports.some((r) => r.status === 'open'))
check(
  'members can be quiet for over a month (health rubric needs the range)',
  state.members.some((m) => now - new Date(m.lastActiveAt).getTime() > 30 * 86_400_000),
)

console.log('seed: the moderation story hangs together')
const hiringChannel = state.communities
  .find((c) => c.id === 'c-webdev')
  .channels.find((ch) => ch.name === 'hiring').id
const urgentReports = state.reports.filter((r) => r.urgent && r.status === 'open')
eq('two urgent open reports', urgentReports.length, 2)
check(
  'both urgent reports name the hiring channel',
  urgentReports.every((r) => r.kind === 'thread' && r.againstId === hiringChannel),
)
eq(
  'the urgent reports come from m-19 and m-20',
  [...urgentReports.map((r) => r.reporterId).sort()].join(','),
  'm-19,m-20',
)
const moderationNotice = state.notifications.find((n) => n.title === 'A thread needs your decision')
check(
  'the urgent notification points at one of the reports it describes',
  moderationNotice?.target?.type === 'report' &&
    urgentReports.some((r) => r.id === moderationNotice.target.id),
)
check(
  'the flag that made the news is in the activity feed',
  state.activity.some(
    (a) => a.actorId === 'm-19' && a.verb === 'flagged a thread in' && a.targetId === 'c-webdev',
  ),
)
check(
  'daily history spans two 30-day windows',
  state.analytics.dailyHistory.length >= 59,
  `${state.analytics.dailyHistory.length} days`,
)
check(
  'daily history has no future dates',
  state.analytics.dailyHistory.every((d) => new Date(d.key) < new Date(dayKey(new Date()))),
)
check('monthly history is 12 rows', state.analytics.monthlyHistory.length === 12)
check(
  'monthly history ends on the current month',
  state.analytics.monthlyHistory.at(-1).key ===
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
)

/* ------------------------------------------------------------- utilities ---- */

console.log('utils: formatters and date maths')
check(
  'uid() never repeats',
  new Set(Array.from({ length: 500 }, () => uid('x'))).size === 500,
)
eq('percentChange(120, 100)', percentChange(120, 100), 20)
eq('percentChange with no baseline', percentChange(10, 0), 100)
eq('startOfWeek lands on Monday', startOfWeek(new Date()).getDay(), 1)
eq('monthGrid returns whole weeks', monthGrid(new Date()).length % 7, 0)
check('monthGrid covers today', monthGrid(new Date()).some((d) => dayKey(d) === dayKey(new Date())))
eq(
  'addDays round-trips',
  dayKey(addDays(new Date(), 10)),
  dayKey(addDays(addDays(new Date(), 4), 6)),
)
check('relativeTime is non-empty', typeof relativeTime(new Date(now - 3_600_000)) === 'string' && relativeTime(new Date(now - 3_600_000)).length > 0)
check('formatDateRange mentions both ends', formatDateRange(new Date(), addDays(new Date(), 2)).length > 6)
check('formatMonth yields a month name', /[A-Za-z]+/.test(formatMonth(new Date())))
const due = dueLabel(addDays(new Date(), -3))
check('dueLabel flags a past date as late', due.tone === 'danger', JSON.stringify(due))
check(
  'matchesQuery is case-insensitive across fields',
  state.communities.some((community) =>
    matchesQuery(community, 'WEB', ['name', 'about']),
  ),
)
check('matchesQuery ignores an empty term', state.communities.every((c) => matchesQuery(c, '', ['name'])))

// Deep links hand the URL value straight to a filter control, so a hand-edited
// query string must fall back instead of filtering everything away.
console.log('utils: URL filter values are validated against the control')
eq('oneOf accepts a known option', oneOf('grid', ['grid', 'table'], 'table'), 'grid')
eq('oneOf rejects an invented option', oneOf('kanban', ['grid', 'table'], 'table'), 'table')
eq('oneOf rejects a missing param', oneOf(null, ['grid', 'table'], 'table'), 'table')
check(
  'a ?status= link can only name a status the roster actually uses',
  state.members.every((m) => oneOf(m.status, MEMBER_STATUSES.map((s) => s.key), null) === m.status),
)

console.log('utils: CSV export is spreadsheet-safe')
eq('csvCell quotes delimiters', csvCell('say "hi", ok'), '"say ""hi"", ok"')
eq('csvCell keeps numbers numeric', csvCell(-12.5), '-12.5')
eq('csvCell neutralises a leading =', csvCell('=1+1'), "'=1+1")
eq('csvCell neutralises a leading +', csvCell('+SUM(1;2)'), "'+SUM(1;2)")
eq('csvCell neutralises a leading @', csvCell('@cmd'), "'@cmd")
eq('csvCell renders null as empty', csvCell(null), '')
eq('csvCell leaves a hyphenated word alone', csvCell('well-known'), 'well-known')
check(
  'toCsv joins rows with CRLF',
  toCsv([['a', 'b'], ['c', 'd']]) === 'a,b\r\nc,d',
  JSON.stringify(toCsv([['a', 'b'], ['c', 'd']])),
)

/* ------------------------------------------------------------ selectors ---- */

console.log('selectors: growth series reconciles with the directory')
const growth = S.memberGrowthSeries(state)
eq('growth has 12 points', growth.length, 12)
check(
  'growth names each month once',
  new Set(growth.map((row) => row.key)).size === growth.length,
)
eq('growth ends on the live member count', growth.at(-1).total, state.members.length)
check(
  'growth never goes backwards below 1',
  growth.every((row) => row.total >= 1),
)
check(
  'growth walks back through the seeded joins',
  growth.at(-2).total === state.members.length - growth.at(-1).joined + growth.at(-1).departed,
  `${growth.at(-2).total} vs ${state.members.length} - ${growth.at(-1).joined}`,
)
check('last point is flagged partial', growth.at(-1).partial === true)

console.log('selectors: engagement is counted live')
const engagement = S.engagementSeries(state)
check(
  'engagement ends with a live "Today" row',
  engagement.at(-1).label === 'Today' && engagement.at(-1).live === true,
)
eq('engagement length', engagement.length, state.analytics.dailyHistory.length + 1)
const totals = S.engagementTotals(state, 30)
eq('current window length', totals.series.length, 30)
eq('previous window length', totals.previousSeries.length, 30)
eq(
  'current post total is the slice sum',
  totals.current.posts,
  totals.series.reduce((n, row) => n + row.posts, 0),
)

console.log('selectors: mutations move the numbers the dashboard shows')
const before = S.dashboardSummary(state)
const clone = { ...state, members: [...state.members, { ...state.members[0], id: 'm-test', name: 'Test Member', communityIds: [] }] }
const after = S.dashboardSummary(clone)
eq('adding a member raises the total', after.totalMembers, before.totalMembers + 1)
eq('growth series tracks the new total', S.memberGrowthSeries(clone).at(-1).total, after.totalMembers)

const taskState = { ...state, tasks: state.tasks.map((t) => (t.id === state.tasks[0].id ? { ...t, status: 'done', completedAt: new Date().toISOString() } : t)) }
eq(
  'completing a task lowers the open count',
  S.dashboardSummary(taskState).openTasks,
  before.openTasks - 1,
)

const unreadBefore = S.unreadNotifications(state).length
const readOnce = {
  ...state,
  notifications: state.notifications.map((n) => (n.id === state.notifications[0].id ? { ...n, read: true } : n)),
}
eq('marking one read lowers the unread count', S.unreadNotifications(readOnce).length, unreadBefore - 1)

console.log('selectors: community stats are computed, not stored')
for (const community of state.communities) {
  const stats = S.communityStats(state, community)
  eq(`${community.id} member count`, stats.members, community.memberIds.length)
  eq(
    `${community.id} engagement maths`,
    stats.engagementRate,
    stats.members ? Math.round((stats.activeThisWeek / stats.members) * 100) : 0,
  )
  check(`${community.id} online <= members`, stats.online <= stats.members)
  check(
    `${community.id} upcoming events are a subset`,
    stats.upcomingEvents <= stats.events,
  )
}

console.log('selectors: breakdowns cover the whole dataset exactly once')
eq('categoryBreakdown rows', S.categoryBreakdown(state).length, state.communities.length)
eq('channelMix rows', S.channelMix(state).length, state.communities.length)
eq(
  'roleSplit totals the roster',
  S.roleSplit(state).reduce((n, row) => n + row.value, 0),
  state.members.length,
)
eq(
  'publishedContent matches the records',
  S.publishedContent(state).length,
  state.content.filter((c) => c.status === 'published').length,
)
check(
  'contentPerformance is sorted by views',
  S.contentPerformance(state, 99).every(
    (row, i, all) => i === 0 || all[i - 1].views >= row.views,
  ),
)
eq(
  'upcomingEvents excludes finished ones',
  S.upcomingEvents(state, 999).length,
  state.events.filter((e) => new Date(e.endsAt).getTime() >= now).length,
)
check(
  'overdueTasks are open and past due',
  S.overdueTasks(state).every((t) => t.status !== 'done' && new Date(t.dueDate) < new Date()),
)
check('attendanceSeries only uses past events', S.attendanceSeries(state).length <= S.pastEvents(state, 999).length)

console.log('selectors: dashboard summary stays in range')
const summary = S.dashboardSummary(state)
check('engagement rate is a percentage', summary.engagementRate >= 0 && summary.engagementRate <= 100)
check('daily active share is a percentage', summary.dailyActiveShare >= 0 && summary.dailyActiveShare <= 100)
check(
  'open + done tasks account for the whole list',
  summary.openTasks + state.tasks.filter((t) => t.status === 'done').length === state.tasks.length,
)
eq('unread notifications count', summary.unreadNotifications, unreadBefore)

console.log('selectors: member health is a derived, self-explaining rubric')
const board = S.healthBoard(state)
eq('board covers the roster', board.length, state.members.length)
check('scores are integers in range', board.every((r) => Number.isInteger(r.score) && r.score >= 0 && r.score <= 100))
const bucketKeys = S.HEALTH_BUCKETS.map((b) => b.key)
check(
  'bucket always matches the threshold table',
  board.every((r) => r.risk === S.HEALTH_BUCKETS.find((b) => r.score >= b.min).key),
)
check(
  'every deducted point shows its reason',
  board.every((r) => (r.score === 100) === (r.reasons.length === 0)),
)
check(
  'reasons carry labels and tones',
  board.every((r) => r.reasons.every((x) => x.text.length > 3 && x.tone)),
)
check('board is worst first', board.every((r, i, all) => i === 0 || all[i - 1].score <= r.score))
const hs = S.healthSummary(state)
eq('buckets sum to the roster', hs.thriving + hs.steady + hs.watch + hs.atRisk, state.members.length)
eq(
  'distribution sums to the roster',
  S.riskDistribution(state).reduce((n, row) => n + row.value, 0),
  state.members.length,
)
eq('dashboard agrees with the board', summary.atRiskMembers, hs.atRisk)
check('the board has somebody at risk', hs.atRisk >= 1, `${hs.atRisk} at risk`)
check(
  'every at-risk row carries at least one danger chip',
  board.filter((r) => r.risk === 'at-risk').every((r) => r.reasons.some((x) => x.tone === 'danger')),
)
check(
  'an unaccepted invite is never counted as quiet',
  board.every(
    (r) => r.member.status !== 'invited' || !r.reasons.some((x) => x.text.startsWith('Quiet')),
  ),
)
eq('the current user reads thriving', board.find((r) => r.member.id === state.currentUserId)?.risk, 'thriving')
check(
  'every suspended member is at risk',
  board.filter((r) => r.member.status === 'suspended').every((r) => r.risk === 'at-risk'),
)

console.log('selectors: moderation counts track the queue')
const mc = S.moderationCounts(state)
eq('open count matches the records', mc.open, state.reports.filter((r) => r.status === 'open').length)
check('urgent are a subset of open', mc.urgent <= mc.open && mc.urgent >= 1)
eq(
  'the dashboard agrees too',
  summary.openReports,
  mc.open,
)
check(
  'queue is oldest first',
  S.reportsFor(state).every(
    (r, i, all) => i === 0 || new Date(all[i - 1].createdAt) <= new Date(r.createdAt),
  ),
)
eq(
  'community scoping matches the records',
  S.reportsFor(state, 'c-webdev').length,
  state.reports.filter((r) => r.communityId === 'c-webdev').length,
)
check('c-webdev has open work', S.reportsFor(state, 'c-webdev').some((r) => r.status === 'open'))

const resolvedClone = {
  ...state,
  reports: state.reports.map((r) =>
    r.id === state.reports[0].id
      ? { ...r, status: 'resolved', resolvedAt: new Date().toISOString(), resolution: 'Done' }
      : r,
  ),
}
eq('resolving lowers the open count', S.moderationCounts(resolvedClone).open, mc.open - 1)

const suspendTarget = state.members.find((m) => m.status === 'active' && m.id !== state.currentUserId)
const suspendedClone = {
  ...state,
  members: state.members.map((m) =>
    m.id === suspendTarget.id ? { ...m, status: 'suspended' } : m,
  ),
}
check(
  'suspending a member drops their score',
  S.memberHealth(suspendedClone.members.find((m) => m.id === suspendTarget.id)).score <
    S.memberHealth(suspendTarget).score,
)

/* ---------------------------------------------------------------- result ---- */

if (failures.length) {
  console.error(`\n✗ ${failures.length} check(s) failed:`)
  for (const failure of failures) console.error('  · ' + failure)
  process.exit(1)
}
console.log(`\n✓ ${passed} checks passed — data model, utils and selectors are consistent.`)
