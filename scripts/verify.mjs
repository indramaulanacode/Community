/**
 * Logic tests for the demo data layer — run with `npm run verify`.
 *
 * Deliberately dependency-free: it imports the same ESM modules the app uses and
 * asserts the invariants the UI relies on (referential integrity, series maths,
 * formatters). Browser behaviour — rendering, dialogs, responsive layout, deep
 * links — is covered by `npm run smoke`, which drives headless Chrome.
 */
import { MEMBER_STATUSES, loadSeed } from '../src/data/seed.js'
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
check('all collections present', ['members', 'communities', 'events', 'tasks', 'content', 'collections', 'conversations', 'notifications', 'activity', 'analytics'].every((k) => Array.isArray(state[k]) || (k === 'analytics' && typeof state[k] === 'object')), 'missing a top-level key')
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
const targetPools = {
  event: ids(state.events),
  task: ids(state.tasks),
  community: communityIds,
  member: memberIds,
  content: ids(state.content),
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

/* ---------------------------------------------------------------- result ---- */

if (failures.length) {
  console.error(`\n✗ ${failures.length} check(s) failed:`)
  for (const failure of failures) console.error('  · ' + failure)
  process.exit(1)
}
console.log(`\n✓ ${passed} checks passed — data model, utils and selectors are consistent.`)
