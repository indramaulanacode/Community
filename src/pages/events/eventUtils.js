/**
 * Shared helpers for the events module.
 *
 * The calendar page, the event detail page and the event editor all need the
 * same reading of an event record — which colour a kind carries, how a location
 * mode is worded, how a record maps onto date/time form inputs. Keeping it here
 * means the three screens can never drift apart.
 */
import { Globe2, MapPin, Video } from 'lucide-react'
import { EVENT_KINDS } from '../../data/seed.js'
import { DAY_MS, addDays, pad2, uid } from '../../lib/utils.js'

/** Filled badge tones per event kind, matching the chip colours below. */
export const KIND_TONE = {
  Workshop: 'brand',
  'Live stream': 'accent',
  AMA: 'info',
  Meetup: 'neutral',
  Panel: 'brand',
  Cohort: 'accent',
  Roundtable: 'warning',
  Social: 'success',
  Playtest: 'info',
  Demo: 'success',
}

/**
 * Chart tokens are the only colours allowed to vary per record, so each kind
 * owns one of the six series colours. Unknown kinds land on the neutral series.
 */
export function kindColor(kind) {
  const index = EVENT_KINDS.indexOf(kind)
  const safe = index < 0 ? 5 : index
  return `var(--chart-${(safe % 6) + 1})`
}

/** Soft, theme-aware tint for a kind — used by calendar chips. */
export function kindTint(kind) {
  return `color-mix(in oklab, ${kindColor(kind)} 18%, var(--surface-2))`
}

export const LOCATION_MODES = [
  { value: 'online', label: 'Online' },
  { value: 'onsite', label: 'On site' },
  { value: 'hybrid', label: 'Hybrid' },
]

const MODE_LABEL = {
  online: 'Online',
  onsite: 'On site',
  venue: 'On site',
  hybrid: 'Online + on site',
}

const MODE_ICON = {
  online: Video,
  onsite: MapPin,
  venue: MapPin,
  hybrid: Globe2,
}

export function modeLabel(mode) {
  return MODE_LABEL[mode] || 'Location to confirm'
}

export function modeIcon(mode) {
  return MODE_ICON[mode] || MapPin
}

/** Community accent tokens resolve to an avatar hue so branding stays stable. */
const ACCENT_HUES = {
  accent: 348,
  brand: 212,
  'chart-1': 212,
  'chart-3': 168,
  'chart-4': 276,
  'chart-5': 32,
  success: 152,
  warning: 32,
}

export function communityHue(community) {
  return ACCENT_HUES[community?.accent] ?? 212
}

/** Openings written the way a host would describe the session to members. */
export const KIND_BLURBS = {
  Workshop:
    'Hands-on session. Bring your own work — the first half is input, the second half is you applying it to something real.',
  'Live stream':
    'Broadcast in the community room with live chat. The recording is shared to the library the next day.',
  AMA: 'Open question thread in advance, answered live. Questions are upvoted so the best ones get airtime.',
  Meetup: 'In-person table. Capacity is set by the venue, not by moderation.',
  Panel: 'Three practitioners, forty minutes, then the floor opens. No slides.',
  Cohort: 'Scheduled learning block for enrolled cohorts. Attendance counts toward certification.',
  Roundtable: 'Chatham House rule, fifteen minutes per person, no pitching.',
  Social: 'Low-stakes hangout. Cameras optional, nobody takes notes.',
  Playtest: 'Bring a build under ten minutes long. Every playtester gives structured feedback.',
  Demo: 'Public showcase of cohort work. Invited guests are welcome.',
}

export const DURATIONS = [45, 60, 75, 90, 120]

/* ------------------------------------------------------------ form helpers -- */

export function toDateInput(value) {
  const date = new Date(value)
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function toTimeInput(value) {
  const date = new Date(value)
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

/** Local date + local clock time to a single ISO instant. Null when unusable. */
export function fromInputs(dateValue, timeValue) {
  if (!dateValue) return null
  const date = new Date(`${dateValue}T${timeValue || '09:00'}`)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Snap a record's real length onto the offered durations. */
export function durationOf(startsAt, endsAt) {
  const minutes = Math.round((new Date(endsAt) - new Date(startsAt)) / 60_000)
  if (!Number.isFinite(minutes) || minutes <= 0) return 90
  return DURATIONS.reduce(
    (nearest, option) =>
      Math.abs(option - minutes) < Math.abs(nearest - minutes) ? option : nearest,
    DURATIONS[0],
  )
}

export function newEventDraft(communityId, date) {
  const start = date ? new Date(date) : addDays(new Date(), 7)
  start.setHours(17, 0, 0, 0)
  const kind = EVENT_KINDS[0]
  return {
    title: '',
    communityId: communityId || '',
    kind,
    date: toDateInput(start),
    time: toTimeInput(start),
    duration: '90',
    capacity: '50',
    mode: 'online',
    place: 'Community room',
    description: KIND_BLURBS[kind],
  }
}

export function eventDraft(event, communityId) {
  if (!event) return newEventDraft(communityId)
  const mode = event.location?.mode
  return {
    title: event.title,
    communityId: event.communityId,
    kind: event.kind,
    date: toDateInput(event.startsAt),
    time: toTimeInput(event.startsAt),
    duration: String(durationOf(event.startsAt, event.endsAt)),
    capacity: String(event.capacity),
    // Older seeded records store `venue`; the editor offers the current set.
    mode: mode === 'venue' ? 'onsite' : mode || 'online',
    place: event.location?.label || '',
    description: event.description || '',
  }
}

/** Duplicate an event a week later, with only the organiser registered. */
export function duplicateEvent(event, organiserId) {
  const week = 7 * DAY_MS
  return {
    ...event,
    id: uid('e'),
    title: `${event.title} (copy)`,
    hostId: organiserId,
    startsAt: new Date(new Date(event.startsAt).getTime() + week).toISOString(),
    endsAt: new Date(new Date(event.endsAt).getTime() + week).toISOString(),
    attendeeIds: [organiserId],
    status: 'scheduled',
  }
}
