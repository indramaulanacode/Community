/**
 * Events — the community calendar.
 *
 * Three views over one filtered set of records: a month grid for planning, a
 * week board for the running order, and an agenda where registration happens.
 * Deep links are honoured: `/events?new=1` opens the editor and
 * `?community=c-webdev` pre-selects the host community.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  List,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { Link, navigate } from '../lib/router.jsx'
import {
  addDays,
  addMonths,
  cn,
  dayKey,
  formatDay,
  formatDayWeekday,
  formatFull,
  formatMonth,
  formatTime,
  isSameDay,
  matchesQuery,
  monthGrid,
  startOfDay,
  startOfWeek,
  oneOf,
  WEEKDAYS_SHORT,
} from '../lib/utils.js'
import { EVENT_KINDS } from '../data/seed.js'
import { useApp } from '../store/AppStore.jsx'
import {
  eventsByWeekday,
  eventsOn,
  lookupCommunity,
  lookupMember,
  pastEvents,
  upcomingEvents,
  weekLabel,
} from '../store/selectors.js'
import { Button, IconButton } from '../components/ui/Button.jsx'
import {
  Avatar,
  AvatarStack,
  Badge,
  OutlineBadge,
  Pagination,
  Progress,
  SearchInput,
  paginate,
} from '../components/ui/Data.jsx'
import { Card, CardBody, CardHeader, PageHeader, SectionTitle } from '../components/ui/Surface.jsx'
import { FilterSelect, Segmented, Toolbar } from '../components/ui/Navigation.jsx'
import { ConfirmDialog, Menu } from '../components/ui/Overlay.jsx'
import { EmptyState, StatusMessage } from '../components/ui/Feedback.jsx'
import EventForm from './events/EventForm.jsx'
import { useMediaQuery } from './events/useMediaQuery.js'
import { duplicateEvent, kindColor, kindTint, modeIcon, modeLabel } from './events/eventUtils.js'

const PAGE_SIZE = 8
const CHIP_LIMIT = 3

const VIEWS = [
  { key: 'month', label: 'Month', icon: CalendarDays },
  { key: 'week', label: 'Week', icon: CalendarRange },
  { key: 'agenda', label: 'Agenda', icon: List },
]

const byStart = (a, b) => new Date(a.startsAt) - new Date(b.startsAt)

function DayBlock({ value, muted = false }) {
  const date = new Date(value)
  return (
    <span className="flex w-11 shrink-0 flex-col items-center rounded-control border border-line bg-surface-2 py-1">
      <span className="text-[9px] font-semibold tracking-wide text-content-3 uppercase">
        {formatDay(date).split(' ')[0]}
      </span>
      <span className={cn('text-sm font-semibold tnum', muted ? 'text-content-3' : 'text-content')}>
        {date.getDate()}
      </span>
    </span>
  )
}

function KindDot({ kind }) {
  return (
    <span
      aria-hidden="true"
      className="size-1.5 shrink-0 rounded-full"
      style={{ backgroundColor: kindColor(kind) }}
    />
  )
}

function LocationLine({ location }) {
  const Icon = modeIcon(location?.mode)
  return (
    <span className="inline-flex min-w-0 items-center gap-1 text-[11px] text-content-3">
      <Icon size={11} className="shrink-0" />
      <span className="truncate">
        {modeLabel(location?.mode)} · {location?.label}
      </span>
    </span>
  )
}

function CommunityLink({ state, communityId, className = '' }) {
  const community = lookupCommunity(state, communityId)
  if (!community) {
    return <span className="text-[11px] text-content-3">Community removed</span>
  }
  return (
    <Link to={`/communities/${community.id}`} className={className}>
      {community.name}
    </Link>
  )
}

export default function EventsPage({ query }) {
  const { state, actions, currentMember } = useApp()
  const currentUserId = currentMember?.id || state.currentUserId
  const params = query || new URLSearchParams()
  const wantsNew = params.get('new') === '1'
  const communityParam = params.get('community') || ''

  const [view, setView] = useState(() => oneOf(params.get('view'), VIEWS.map((v) => v.key), 'month'))
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()))
  const [search, setSearch] = useState(() => params.get('q') || '')
  const [communityId, setCommunityId] = useState(communityParam || 'all')
  const [kind, setKind] = useState('all')
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()))
  const [agendaDay, setAgendaDay] = useState(null)
  const [editor, setEditor] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [pageUpcoming, setPageUpcoming] = useState(1)
  const [pagePast, setPagePast] = useState(1)

  const canMonth = useMediaQuery('(min-width: 36rem)')
  const canWeek = useMediaQuery('(min-width: 48rem)')

  useEffect(() => {
    if (wantsNew) setEditor({ eventId: null, communityId: communityParam, date: null })
  }, [wantsNew, communityParam])

  useEffect(() => {
    setPageUpcoming(1)
    setPagePast(1)
  }, [search, communityId, kind, agendaDay])

  const closeEditor = () => {
    setEditor(null)
    if (wantsNew) navigate('/events', { replace: true })
  }

  const filtersOn = Boolean(search) || communityId !== 'all' || kind !== 'all'
  const clearFilters = () => {
    setSearch('')
    setCommunityId('all')
    setKind('all')
  }

  const passes = (event) =>
    matchesQuery(event, search, ['title', 'description']) &&
    (communityId === 'all' || event.communityId === communityId) &&
    (kind === 'all' || event.kind === kind)

  const filtered = useMemo(
    () => state.events.filter((event) => passes(event)),
    [state.events, search, communityId, kind],
  )

  const monthDays = useMemo(() => monthGrid(anchor), [anchor])
  const eventsByDay = useMemo(() => {
    const map = new Map()
    for (const day of monthDays) {
      const rows = eventsOn(state, day).filter((event) => passes(event))
      if (rows.length) map.set(dayKey(day), rows)
    }
    return map
  }, [state.events, monthDays, search, communityId, kind])

  const upcomingCount = upcomingEvents(state, 999).length
  const pastCount = pastEvents(state, 999).length
  const thisWeek = new Set(
    eventsByWeekday(state, new Date())
      .flat()
      .map((event) => event.id),
  ).size

  const toggleRegistration = (event) => {
    const attendees = new Set(event.attendeeIds)
    const going = attendees.has(currentUserId)
    if (going) attendees.delete(currentUserId)
    else attendees.add(currentUserId)
    actions.update('events', event.id, { attendeeIds: [...attendees] })
    actions.notify(
      going ? `Registration cancelled — ${event.title}` : `You are registered for ${event.title}`,
      going ? 'info' : 'success',
    )
  }

  const duplicate = (event) => {
    const copy = duplicateEvent(event, currentUserId)
    actions.add('events', copy)
    actions.notify(`Duplicated as ${copy.title} — running ${formatDay(copy.startsAt)}`, 'success')
  }

  const openAgendaFor = (day) => {
    setView('agenda')
    setAgendaDay(startOfDay(day))
    setAnchor(startOfDay(day))
  }

  const openEditor = (options) => setEditor({ eventId: null, communityId: '', date: null, ...options })

  const newForContext = (date) =>
    openEditor({
      eventId: null,
      communityId: communityId !== 'all' ? communityId : '',
      date,
    })

  const shift = (direction) => {
    if (view === 'agenda' && agendaDay) {
      const next = startOfDay(addDays(agendaDay, direction))
      setAgendaDay(next)
      setAnchor(next)
      return
    }
    if (view === 'week') {
      setAnchor((current) => addDays(current, direction * 7))
      return
    }
    setAnchor((current) => addMonths(current, direction))
  }

  const goToday = () => {
    setAnchor(startOfDay(new Date()))
    setAgendaDay(null)
  }

  const agendaForced = (view === 'month' && !canMonth) || (view === 'week' && !canWeek)
  const activeView = agendaForced ? 'agenda' : view

  const periodLabel =
    activeView === 'week'
      ? weekLabel(anchor)
      : agendaDay
        ? formatFull(agendaDay)
        : formatMonth(anchor)
  const periodStep = agendaDay ? 'day' : activeView === 'week' ? 'week' : 'month'

  const editorEvent = editor?.eventId
    ? state.events.find((event) => event.id === editor.eventId) || null
    : null

  const menuFor = (event) => [
    {
      label: 'Open event',
      icon: ExternalLink,
      onSelect: () => navigate(`/events/${event.id}`),
    },
    { label: 'Edit details', icon: Pencil, onSelect: () => openEditor({ eventId: event.id }) },
    {
      label: 'Duplicate',
      icon: Copy,
      hint: '+7 days',
      onSelect: () => duplicate(event),
    },
    { divider: true },
    { label: 'Delete event', icon: Trash2, danger: true, onSelect: () => setPendingDelete(event) },
  ]

  /* -------------------------------------------------------------- month -- */
  const monthView = (
    <Card padded={false}>
      <div className="grid grid-cols-7 border-b border-line">
        {WEEKDAYS_SHORT.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-[10px] font-semibold tracking-wide text-content-3 uppercase"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {monthDays.map((day) => {
          const rows = eventsByDay.get(dayKey(day)) || []
          const outside = day.getMonth() !== anchor.getMonth()
          const today = isSameDay(day, new Date())
          const selected = dayKey(day) === dayKey(selectedDay)
          const hidden = Math.max(0, rows.length - CHIP_LIMIT)
          return (
            <button
              key={dayKey(day)}
              type="button"
              onClick={() => setSelectedDay(day)}
              aria-label={`${formatDayWeekday(day)} — ${rows.length} ${rows.length === 1 ? 'event' : 'events'}`}
              className={cn(
                'flex min-h-24 flex-col items-start gap-1 border-r border-b border-line p-1.5 text-left transition-colors hover:bg-surface-2',
                outside && 'bg-surface-2',
                selected && 'bg-brand-soft hover:bg-brand-soft',
              )}
            >
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded-full text-[11px] font-semibold tnum',
                  today
                    ? 'bg-brand-soft text-brand-content ring-1 ring-brand'
                    : outside
                      ? 'text-content-3'
                      : 'text-content-2',
                )}
              >
                {day.getDate()}
              </span>
              {rows.slice(0, CHIP_LIMIT).map((event) => (
                <span
                  key={event.id}
                  tabIndex={-1}
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation()
                    navigate(`/events/${event.id}`)
                  }}
                  title={`${event.title} · ${formatTime(event.startsAt)}`}
                  className="w-full cursor-pointer rounded-[5px] px-1 py-0.5 text-[10px] transition-[filter] hover:brightness-95"
                  style={{ backgroundColor: kindTint(event.kind) }}
                >
                  <span className="flex min-w-0 items-center gap-1">
                    <KindDot kind={event.kind} />
                    <span className="shrink-0 text-content-2 tnum">{formatTime(event.startsAt)}</span>
                    <span className="min-w-0 truncate font-medium text-content">{event.title}</span>
                  </span>
                </span>
              ))}
              {hidden > 0 && (
                <span
                  tabIndex={-1}
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation()
                    openAgendaFor(day)
                  }}
                  className="cursor-pointer px-1 text-[10px] font-medium text-brand-content hover:underline"
                >
                  +{hidden} more
                </span>
              )}
            </button>
          )
        })}
      </div>
    </Card>
  )

  /* --------------------------------------------------------------- week -- */
  const weekStart = startOfWeek(anchor)
  const weekColumns = eventsByWeekday(state, anchor)
  const weekView = (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
      {weekColumns.map((rows, index) => {
        const day = addDays(weekStart, index)
        const visible = rows.filter((event) => passes(event))
        return (
          <div key={dayKey(day)} className="min-w-0 rounded-card border border-line bg-surface p-2 shadow-card">
            <p className="mb-2 flex items-baseline justify-between gap-2 border-b border-line pb-1.5">
              <span className="truncate text-[11px] font-semibold text-content">
                {formatDayWeekday(day)}
              </span>
              <span className="shrink-0 text-[10px] text-content-3 tnum">{visible.length}</span>
            </p>
            {visible.length === 0 ? (
              <p className="px-1 py-3 text-[11px] text-content-3">Nothing scheduled.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {visible.map((event) => {
                  const host = lookupMember(state, event.hostId)
                  return (
                    <li key={event.id}>
                      <div
                        className="rounded-control border border-line bg-surface-2 p-2 transition-colors hover:border-line-2"
                        style={{ borderLeft: `2px solid ${kindColor(event.kind)}` }}
                      >
                        <p className="text-[10px] font-medium text-content-2 tnum">
                          {formatTime(event.startsAt)}
                        </p>
                        <Link
                          to={`/events/${event.id}`}
                          className="mt-0.5 block text-[12px] leading-snug font-medium text-content hover:text-brand"
                        >
                          {event.title}
                        </Link>
                        <p className="mt-1 truncate text-[10px] text-content-3">
                          <CommunityLink
                            state={state}
                            communityId={event.communityId}
                            className="text-content-3 hover:text-brand-content hover:underline"
                          />
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-content-2 tnum">
                            {event.attendeeIds.length}/{event.capacity}
                          </span>
                          <Avatar name={host?.name} hue={host?.hue} size={6} />
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )

  /* ------------------------------------------------------------- agenda -- */
  const scoped = agendaDay ? eventsOn(state, agendaDay).filter((event) => passes(event)) : null
  const agendaFloor = startOfDay(agendaDay || anchor).getTime()
  const nowMs = Date.now()
  const upcomingRows = scoped
    ? scoped.filter((event) => new Date(event.endsAt).getTime() >= nowMs)
    : filtered
        .filter((event) => new Date(event.endsAt).getTime() >= agendaFloor)
        .sort(byStart)
  const pastRows = scoped
    ? scoped.filter((event) => new Date(event.endsAt).getTime() < nowMs)
    : filtered
        .filter((event) => new Date(event.endsAt).getTime() < agendaFloor)
        .sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt))

  const upPaged = paginate(upcomingRows, pageUpcoming, PAGE_SIZE)
  const pastPaged = paginate(pastRows, pagePast, PAGE_SIZE)

  const agendaView = (
    <div className="flex flex-col gap-4">
      {agendaDay && (
        <div className="flex flex-wrap items-center gap-2 rounded-control border border-line bg-surface px-3 py-2 text-[11px] text-content-2">
          <CalendarDays size={13} className="text-content-3" />
          <span>
            Scoped to <span className="font-medium text-content">{formatFull(agendaDay)}</span> —
            opened from a day in the month grid.
          </span>
          <IconButton
            icon={X}
            label="Clear the day scope and show every date"
            size="sm"
            className="ml-auto"
            onClick={() => setAgendaDay(null)}
          />
        </div>
      )}

      <section className="flex flex-col gap-2">
        <SectionTitle
          action={
            <span className="text-[11px] text-content-3 tnum">
              {upcomingRows.length} {upcomingRows.length === 1 ? 'session' : 'sessions'}
            </span>
          }
        >
          Upcoming
        </SectionTitle>
        {upcomingRows.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            tone="brand"
            title={filtersOn ? 'No upcoming events match these filters' : 'Nothing scheduled from here'}
            body={
              filtersOn
                ? 'Widen the filters, or schedule a new session — the calendar reads it as soon as it is saved.'
                : 'Add an event and members can register for it straight from this list.'
            }
            action={
              filtersOn ? (
                <Button variant="secondary" size="sm" icon={X} onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button variant="primary" size="sm" icon={Plus} onClick={() => newForContext(null)}>
                  New event
                </Button>
              )
            }
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {upPaged.slice.map((event) => (
              <AgendaRow
                key={event.id}
                event={event}
                state={state}
                currentUserId={currentUserId}
                onToggle={toggleRegistration}
                menu={menuFor(event)}
              />
            ))}
          </ul>
        )}
        <Pagination
          page={upPaged.page}
          pageCount={upPaged.pageCount}
          total={upcomingRows.length}
          pageSize={PAGE_SIZE}
          onChange={setPageUpcoming}
        />
      </section>

      <section className="flex flex-col gap-2">
        <SectionTitle
          action={
            <span className="text-[11px] text-content-3 tnum">
              {pastRows.length} {pastRows.length === 1 ? 'session' : 'sessions'}
            </span>
          }
        >
          Past
        </SectionTitle>
        {pastRows.length === 0 ? (
          <StatusMessage>
            No completed sessions {agendaDay ? 'on this day' : 'before this date'}. Attendance and
            recordings show up here once an event has run.
          </StatusMessage>
        ) : (
          <ul className="flex flex-col gap-2">
            {pastPaged.slice.map((event) => (
              <AgendaRow
                key={event.id}
                event={event}
                state={state}
                currentUserId={currentUserId}
                past
                onToggle={toggleRegistration}
                menu={menuFor(event)}
              />
            ))}
          </ul>
        )}
        <Pagination
          page={pastPaged.page}
          pageCount={pastPaged.pageCount}
          total={pastRows.length}
          pageSize={PAGE_SIZE}
          onChange={setPagePast}
        />
      </section>
    </div>
  )

  /* ----------------------------------------------------------- day panel -- */
  const dayRows = eventsOn(state, selectedDay).filter((event) => passes(event))
  const daySignups = dayRows.reduce((total, event) => total + event.attendeeIds.length, 0)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Events"
        description={`${upcomingCount} upcoming · ${thisWeek} this week · ${pastCount} past. Showing ${filtered.length} of ${state.events.length} sessions with the current filters.`}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => newForContext(null)}>
            New event
          </Button>
        }
      />

      <Toolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          label="Event title"
          placeholder="Search events"
          resultCount={filtered.length}
          className="min-w-40 sm:max-w-64"
        />
        <FilterSelect
          label="Community"
          value={communityId}
          onChange={setCommunityId}
          options={[
            { value: 'all', label: 'All communities' },
            ...state.communities.map((community) => ({
              value: community.id,
              label: community.name,
            })),
          ]}
        />
        <FilterSelect
          label="Type"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'all', label: 'All types' },
            ...EVENT_KINDS.map((option) => ({ value: option, label: option })),
          ]}
        />
        {filtersOn && (
          <Button variant="ghost" size="xs" icon={X} onClick={clearFilters}>
            Clear filters
          </Button>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Segmented options={VIEWS} value={view} onChange={setView} />
          <div className="flex items-center gap-0.5 rounded-control border border-line bg-surface p-0.5">
            <IconButton
              icon={ChevronLeft}
              label={`Previous ${periodStep}`}
              size="sm"
              onClick={() => shift(-1)}
            />
            <span className="min-w-32 px-1 text-center text-xs font-semibold whitespace-nowrap text-content">
              {periodLabel}
            </span>
            <IconButton
              icon={ChevronRight}
              label={`Next ${periodStep}`}
              size="sm"
              onClick={() => shift(1)}
            />
            <Button variant="ghost" size="xs" onClick={goToday}>
              Today
            </Button>
          </div>
        </div>
      </Toolbar>

      {agendaForced && (
        <StatusMessage>
          The {view} grid needs seven columns, so at this width the same records are listed in the
          agenda instead. Widen the window to get the grid back.
        </StatusMessage>
      )}

      {activeView === 'month' && monthView}
      {activeView === 'week' && weekView}
      {activeView === 'agenda' && agendaView}

      {activeView === 'month' && (
        <Card>
          <CardHeader
            title={formatFull(selectedDay)}
            description={
              dayRows.length
                ? `${dayRows.length} ${dayRows.length === 1 ? 'session' : 'sessions'} · ${daySignups} registrations across them`
                : 'Nothing scheduled on this day yet.'
            }
            icon={CalendarDays}
            action={
              <>
                <Button
                  variant="ghost"
                  size="xs"
                  iconRight={ArrowUpRight}
                  onClick={() => openAgendaFor(selectedDay)}
                >
                  Agenda
                </Button>
                <Button variant="primary" size="xs" icon={Plus} onClick={() => newForContext(selectedDay)}>
                  New event on this day
                </Button>
              </>
            }
          />
          <CardBody className="mt-3">
            {dayRows.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                tone="brand"
                title="No events on this day"
                body="Pick a community, a start time and a capacity — the slot is on the calendar immediately."
                action={
                  <Button variant="primary" size="sm" icon={Plus} onClick={() => newForContext(selectedDay)}>
                    Schedule an event
                  </Button>
                }
              />
            ) : (
              <ul className="flex flex-col gap-1">
                {dayRows.map((event) => {
                  const going = event.attendeeIds.includes(currentUserId)
                  const filled = (event.attendeeIds.length / event.capacity) * 100
                  return (
                    <li
                      key={event.id}
                      className="flex flex-wrap items-center gap-3 rounded-control px-2 py-2 transition-colors hover:bg-surface-2 sm:flex-nowrap"
                    >
                      <span className="w-16 shrink-0 text-[11px] font-medium text-content-2 tnum">
                        {formatTime(event.startsAt)}
                      </span>
                      <KindDot kind={event.kind} />
                      <span className="min-w-0 flex-1 basis-40">
                        <Link
                          to={`/events/${event.id}`}
                          className="block truncate text-[13px] font-medium text-content hover:text-brand"
                        >
                          {event.title}
                        </Link>
                        <span className="mt-0.5 flex flex-wrap items-center gap-2">
                          <Badge tone="neutral">{event.kind}</Badge>
                          <CommunityLink
                            state={state}
                            communityId={event.communityId}
                            className="text-[11px] text-content-3 hover:text-brand-content hover:underline"
                          />
                          <LocationLine location={event.location} />
                        </span>
                      </span>
                      <span className="flex w-32 shrink-0 items-center gap-2">
                        <Progress
                          value={event.attendeeIds.length}
                          max={event.capacity}
                          tone={filled > 85 ? 'warning' : 'brand'}
                          label={`${event.attendeeIds.length} of ${event.capacity} places taken`}
                        />
                        <span className="text-[10px] text-content-3 tnum">
                          {event.attendeeIds.length}/{event.capacity}
                        </span>
                      </span>
                      <Button
                        size="xs"
                        variant={going ? 'ghost' : 'outline'}
                        icon={going ? Check : undefined}
                        onClick={() => toggleRegistration(event)}
                      >
                        {going ? 'Going' : 'Register'}
                      </Button>
                      <Menu items={menuFor(event)} size="xs" />
                    </li>
                  )
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      )}

      <EventForm
        open={Boolean(editor)}
        onClose={closeEditor}
        event={editorEvent}
        defaultCommunityId={editor?.communityId || ''}
        defaultDate={editor?.date || null}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          actions.remove('events', pendingDelete.id)
          actions.notify(`Event deleted — ${pendingDelete.title}`, 'info')
          setPendingDelete(null)
        }}
        title="Delete this event?"
        body={`“${pendingDelete?.title || 'This event'}” runs ${formatDay(
          pendingDelete?.startsAt || new Date(),
        )} and has ${pendingDelete?.attendeeIds.length || 0} members registered. Deleting takes the session and every registration off the calendar — there is no undo.`}
        confirmLabel="Delete event"
      />
    </div>
  )
}

/* -------------------------------------------------------------- agenda row -- */

function AgendaRow({ event, state, currentUserId, past = false, onToggle, menu }) {
  const host = lookupMember(state, event.hostId)
  const going = event.attendeeIds.includes(currentUserId)
  const filled = (event.attendeeIds.length / event.capacity) * 100
  const full = !going && event.attendeeIds.length >= event.capacity

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface p-3 shadow-card transition-colors hover:border-line-2 sm:flex-nowrap">
      <DayBlock value={event.startsAt} muted={past} />

      <div className="min-w-0 flex-1 basis-52">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/events/${event.id}`}
            className="text-[13px] font-semibold text-content hover:text-brand"
          >
            {event.title}
          </Link>
          <Badge tone={past ? 'neutral' : 'brand'}>{event.kind}</Badge>
          {past && <OutlineBadge>Completed</OutlineBadge>}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-content-3">
          <span className="tnum">{formatTime(event.startsAt)}</span>
          <span aria-hidden="true">·</span>
          <CommunityLink
            state={state}
            communityId={event.communityId}
            className="hover:text-brand-content hover:underline"
          />
          <LocationLine location={event.location} />
        </p>
      </div>

      <div className="w-full shrink-0 sm:w-36">
        <Progress
          value={event.attendeeIds.length}
          max={event.capacity}
          tone={filled > 85 ? 'warning' : 'brand'}
          label={`${event.attendeeIds.length} of ${event.capacity} places taken`}
        />
        <p className="mt-1 text-[10px] text-content-3 tnum">
          {event.attendeeIds.length} of {event.capacity} places
          {filled > 85 && filled < 100 ? ' — nearly full' : filled >= 100 ? ' — at capacity' : ''}
        </p>
      </div>

      <AvatarStack
        className="shrink-0"
        max={3}
        size={8}
        people={host ? [{ id: host.id, name: host.name, hue: host.hue }] : []}
      />

      <Button
        size="xs"
        variant={going ? 'ghost' : 'outline'}
        icon={going ? Check : undefined}
        disabled={full && !past}
        title={
          past
            ? going
              ? 'Remove yourself from the attendance list'
              : 'Add yourself to the attendance list for this session'
            : full
              ? 'This event is at capacity'
              : undefined
        }
        onClick={() => onToggle(event)}
      >
        {past ? (going ? 'Attended' : 'Mark attended') : going ? 'Going' : full ? 'Full' : 'Register'}
      </Button>

      <Menu items={menu} size="xs" />
    </li>
  )
}
