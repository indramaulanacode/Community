/**
 * The event editor, shared by the calendar page and the event detail page so a
 * host gets one form with one set of validation rules.
 *
 * Opening is controlled by the parent (`open` + `event`), which is what lets
 * `/events?new=1` and the detail page's Edit menu drive the same dialog.
 */
import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, Check, Clock } from 'lucide-react'
import { navigate } from '../../lib/router.jsx'
import { cn, formatFull, formatTime, uid } from '../../lib/utils.js'
import { EVENT_KINDS } from '../../data/seed.js'
import { useApp } from '../../store/AppStore.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Field, Input, Select, Textarea, required, validate } from '../../components/ui/Form.jsx'
import { Dialog } from '../../components/ui/Overlay.jsx'
import { StatusMessage } from '../../components/ui/Feedback.jsx'
import {
  DURATIONS,
  KIND_BLURBS,
  LOCATION_MODES,
  eventDraft,
  fromInputs,
} from './eventUtils.js'

const CAPACITY_MAX = 100_000

function capacityRule(value) {
  const text = String(value ?? '').trim()
  if (!text) return 'Capacity is required.'
  const number = Number(text)
  if (!Number.isFinite(number) || number <= 0) return 'Capacity must be at least 1 place.'
  if (!Number.isInteger(number)) return 'Capacity must be a whole number of places.'
  if (number > CAPACITY_MAX) return `Capacity cannot exceed ${CAPACITY_MAX.toLocaleString('en-US')} places.`
  return ''
}

const RULES = {
  title: (value) => required(value, 'Title'),
  communityId: (value) => required(value, 'Community'),
  kind: (value) => required(value, 'Event type'),
  date: (value) => required(value, 'Date'),
  time: (value) => required(value, 'Start time'),
  capacity: capacityRule,
  place: (value) => required(value, 'Location details'),
}

export default function EventForm({
  open,
  onClose,
  event = null,
  defaultCommunityId = '',
  defaultDate = null,
}) {
  const { state, actions, currentMember } = useApp()
  const [form, setForm] = useState(() => eventDraft(event, defaultCommunityId))
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)

  /* Re-seed the draft whenever the dialog is opened, so a stale half-edit from a
     previous create never leaks into the next one. */
  useEffect(() => {
    if (!open) return
    setForm(eventDraft(event, defaultCommunityId))
    setErrors({})
    setSubmitted(false)
  }, [open, event, defaultCommunityId, defaultDate])

  const change = (key) => (changeEvent) => {
    const value = changeEvent.target.value
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (submitted) setErrors(validate(next, RULES))
      return next
    })
  }

  const start = fromInputs(form.date, form.time)
  const end = start ? new Date(start.getTime() + Number(form.duration) * 60_000) : null
  const attendeeCount = event ? event.attendeeIds.length : 0

  const warnings = useMemo(() => {
    const list = []
    if (start && start.getTime() < Date.now()) {
      list.push(
        'This start time has already passed, so the event lands in the past list rather than on the upcoming rail.',
      )
    }
    if (event && Number(form.capacity) > 0 && Number(form.capacity) < attendeeCount) {
      list.push(
        `${attendeeCount} members are already registered but capacity is ${form.capacity} — nobody is removed, and the event reads as over capacity.`,
      )
    }
    return list
  }, [start, event, form.capacity, attendeeCount])

  const onKindChange = (changeEvent) => {
    const kind = changeEvent.target.value
    setForm((prev) => {
      /* Only adopt the suggested blurb while the host has not written their own. */
      const untouched = !prev.description.trim() || Object.values(KIND_BLURBS).includes(prev.description)
      return { ...prev, kind, description: untouched ? KIND_BLURBS[kind] || '' : prev.description }
    })
    if (submitted) setErrors(validate({ ...form, kind }, RULES))
  }

  const submit = () => {
    const found = validate(form, RULES)
    setSubmitted(true)
    setErrors(found)
    if (Object.keys(found).length) return

    const begins = fromInputs(form.date, form.time)
    if (!begins) {
      setErrors({ date: 'That date and time could not be read. Pick a day and a start time.' })
      return
    }
    const finishes = new Date(begins.getTime() + Number(form.duration) * 60_000)
    const shared = {
      title: form.title.trim(),
      kind: form.kind,
      communityId: form.communityId,
      startsAt: begins.toISOString(),
      endsAt: finishes.toISOString(),
      capacity: Number(form.capacity),
      location: { mode: form.mode, label: form.place.trim() },
      description: form.description.trim() || KIND_BLURBS[form.kind] || '',
    }

    if (event) {
      actions.update('events', event.id, shared)
      actions.notify(`Event updated — ${shared.title}`, 'success')
      onClose()
      return
    }

    const record = {
      id: uid('e'),
      ...shared,
      hostId: currentMember?.id || state.currentUserId,
      attendeeIds: [],
      status: 'scheduled',
    }
    actions.add('events', record)
    actions.notify(`Event created — ${record.title}`, 'success')
    onClose()
    navigate(`/events/${record.id}`)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={event ? 'Edit event' : 'New event'}
      description={
        event
          ? 'Changes go straight to the calendar, the agenda and every member who is registered.'
          : 'Scheduled events appear on the community calendar immediately and can be registered for.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" icon={Check} onClick={submit}>
            {event ? 'Save changes' : 'Create event'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="flex flex-wrap items-center gap-2 rounded-control bg-surface-2 px-3 py-2 text-[11px] text-content-2">
          <CalendarClock size={13} className="shrink-0 text-content-3" />
          {start && end ? (
            <span>
              <span className="font-medium text-content">{formatFull(start)}</span>
              <span className="mx-1.5 text-content-3">·</span>
              <span className="inline-flex items-center gap-1 tnum">
                <Clock size={11} className="text-content-3" />
                {formatTime(start)} – {formatTime(end)}
                {` (${form.duration} min)`}
              </span>
            </span>
          ) : (
            <span>Pick a date and a start time to see the full schedule line.</span>
          )}
          <span className="text-content-3">
            This workspace runs on {state.workspace.timezone}.
          </span>
        </p>

        {warnings.map((warning) => (
          <StatusMessage key={warning} tone="warning">
            {warning}
          </StatusMessage>
        ))}

        <Field label="Title" required error={errors.title}>
          <Input
            value={form.title}
            onChange={change('title')}
            invalid={Boolean(errors.title)}
            placeholder="Playtest swap: vertical slice"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Community" required error={errors.communityId}>
            <Select
              value={form.communityId}
              onChange={change('communityId')}
              invalid={Boolean(errors.communityId)}
            >
              <option value="">Select a community</option>
              {state.communities.map((community) => (
                <option key={community.id} value={community.id}>
                  {community.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Event type" required error={errors.kind}>
            <Select value={form.kind} onChange={onKindChange} invalid={Boolean(errors.kind)}>
              {EVENT_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Date" required error={errors.date}>
            <Input
              type="date"
              value={form.date}
              onChange={change('date')}
              invalid={Boolean(errors.date)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start time" required error={errors.time}>
              <Input
                type="time"
                value={form.time}
                onChange={change('time')}
                invalid={Boolean(errors.time)}
              />
            </Field>
            <Field label="Duration">
              <Select value={form.duration} onChange={change('duration')}>
                {DURATIONS.map((minutes) => (
                  <option key={minutes} value={String(minutes)}>
                    {minutes} min
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field
            label="Capacity"
            required
            error={errors.capacity}
            hint={
              event
                ? `${attendeeCount} registered right now.`
                : 'Places available. Registration closes when this is reached.'
            }
          >
            <Input
              type="number"
              min="1"
              step="1"
              value={form.capacity}
              onChange={change('capacity')}
              invalid={Boolean(errors.capacity)}
              className={cn('tnum', errors.capacity && 'border-danger')}
            />
          </Field>

          <Field label="Location mode" hint="On-site events need a venue in the details field.">
            <Select value={form.mode} onChange={change('mode')}>
              {LOCATION_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label="Location details"
          required
          error={errors.place}
          hint="Room, stream link or address members need to find the session."
        >
          <Input
            value={form.place}
            onChange={change('place')}
            invalid={Boolean(errors.place)}
            placeholder="Studio 4, Jl. Braga 22 + online"
          />
        </Field>

        <Field
          label="Description"
          hint="Shown on the event page and in the registration confirmation."
        >
          <Textarea
            rows={4}
            value={form.description}
            onChange={change('description')}
            placeholder="What happens in the session and what members should bring."
          />
        </Field>
      </div>
    </Dialog>
  )
}
