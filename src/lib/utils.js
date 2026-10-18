/** Tiny dependency-free helpers shared across the product. */

/** Concatenate truthy class names. */
export function cn(...parts) {
  return parts.filter(Boolean).join(' ')
}

export const DAY_MS = 86_400_000

/** Deterministic PRNG so seed data looks hand-written but never changes per build. */
export function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pad2(n) {
  return String(n).padStart(2, '0')
}

/* ---------------------------------------------------------------- dates -- */

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3))

export const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function addMonths(d, n) {
  const x = new Date(d)
  x.setDate(1)
  x.setMonth(x.getMonth() + n)
  return x
}

/** Monday-first index (0 = Mon … 6 = Sun). */
export function mondayIndex(d) {
  return (new Date(d).getDay() + 6) % 7
}

export function startOfWeek(d) {
  return startOfDay(addDays(d, -mondayIndex(d)))
}

export function isSameDay(a, b) {
  const x = new Date(a)
  const y = new Date(b)
  return (
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate()
  )
}

/** 6x7 grid of dates covering the month that `anchor` belongs to. */
export function monthGrid(anchor) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const start = startOfWeek(first)
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

export function dayKey(d) {
  const x = new Date(d)
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`
}

const dayFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
const dayFmtLong = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})
const fullFmt = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})
const monthFmt = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })
const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })

export const formatDay = (d) => dayFmt.format(new Date(d))
export const formatDayWeekday = (d) => dayFmtLong.format(new Date(d))
export const formatFull = (d) => fullFmt.format(new Date(d))
export const formatMonth = (d) => monthFmt.format(new Date(d))
export const formatTime = (d) => timeFmt.format(new Date(d))

export function formatDateRange(a, b) {
  const x = new Date(a)
  const y = new Date(b)
  if (x.getMonth() === y.getMonth() && x.getFullYear() === y.getFullYear()) {
    return `${MONTHS_SHORT[x.getMonth()]} ${x.getDate()}–${y.getDate()}, ${y.getFullYear()}`
  }
  return `${formatDay(x)} – ${formatDay(y)}, ${y.getFullYear()}`
}

/** "just now" / "14m ago" / "3h ago" / "2d ago" / "Mar 4" */
export function relativeTime(input, now = Date.now()) {
  const then = new Date(input).getTime()
  const diff = now - then
  const future = diff < 0
  const abs = Math.abs(diff)
  const mins = Math.round(abs / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return future ? `in ${mins}m` : `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return future ? `in ${hours}h` : `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return future ? `in ${days}d` : `${days}d ago`
  return formatDay(input)
}

/** Compact "in 3 days" / "2 days overdue" for task deadlines. */
export function dueLabel(input, now = Date.now()) {
  const due = startOfDay(input).getTime()
  const today = startOfDay(now).getTime()
  const days = Math.round((due - today) / DAY_MS)
  if (days === 0) return { text: 'Due today', tone: 'warning' }
  if (days === 1) return { text: 'Due tomorrow', tone: 'warning' }
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, tone: 'danger' }
  if (days <= 6) return { text: `Due in ${days} days`, tone: 'neutral' }
  return { text: `Due ${formatDay(input)}`, tone: 'neutral' }
}

/* --------------------------------------------------------------- numbers -- */

export function formatCount(n) {
  const x = Number(n) || 0
  if (Math.abs(x) >= 1_000_000) return `${(x / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (Math.abs(x) >= 1_000) return `${(x / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return String(Math.round(x))
}

export function formatNumber(n) {
  return (Number(n) || 0).toLocaleString('en-US')
}

/** Percentage delta between two totals, guarding a zero baseline. */
export function percentChange(current, previous) {
  if (!previous) return current ? 100 : 0
  return ((current - previous) / previous) * 100
}

export function formatPercent(value, digits = 1) {
  const v = Number(value) || 0
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(digits)}%`
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function initials(name) {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

export function slugify(input) {
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Shallow-ish equality for query objects. */
export function unique(list) {
  return [...new Set(list)]
}

export function groupBy(list, keyFn) {
  const out = new Map()
  for (const item of list) {
    const key = keyFn(item)
    const bucket = out.get(key)
    if (bucket) bucket.push(item)
    else out.set(key, [item])
  }
  return out
}

export function sum(list, keyFn = (x) => x) {
  return list.reduce((total, item) => total + (Number(keyFn(item)) || 0), 0)
}

export function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`
}

/** Case-insensitive match of one record against the named fields. */
export function matchesQuery(item, query, fields) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return fields.some((field) => String(item[field] ?? '').toLowerCase().includes(q))
}

/* ---------------------------------------------------------------- exports -- */

/**
 * Spreadsheet-safe cell. Delimiters are quoted, real numbers are left alone, and
 * a leading `= + - @` or tab in a *string* is neutralised so a crafted record
 * name cannot execute as a formula when the export is opened in a spreadsheet.
 */
export function csvCell(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  const text = String(value ?? '')
  const safe = /^[\t\r=+\-@]/.test(text) ? `'${text}` : text
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function toCsv(rows) {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
}

/** Client-side download — used by the member and analytics exports. */
export function downloadFile(filename, contents, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([contents], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

/**
 * Clipboard write that reports instead of throwing: browsers reject it outside
 * a secure context or without permission, and the caller shows the outcome.
 */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** Absolute link to a hash route, for "copy link" actions. */
export function appUrl(route) {
  const { origin, pathname } = window.location
  return `${origin}${pathname}#${route.startsWith('/') ? route : `/${route}`}`
}

/**
 * Whitelist for a filter read out of the URL, so a hand-edited query string
 * falls back to the control's default instead of an option that renders nothing.
 */
export function oneOf(value, options, fallback) {
  return options.includes(value) ? value : fallback
}
