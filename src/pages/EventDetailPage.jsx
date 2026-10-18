/**
 * Event detail — schedule, location, capacity, the attendance roster and
 * registration for one session.
 *
 * `/events/:id`. An unknown id renders the empty state with a way back instead
 * of throwing, because a record can disappear when the demo is reset or the
 * event is deleted from another screen.
 */
import { useMemo, useState } from 'react'
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  Copy,
  Link2,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { Link, navigate } from '../lib/router.jsx'
import {
  appUrl,
  copyText,
  formatDateRange,
  formatDay,
  formatDayWeekday,
  formatFull,
  formatTime,
  isSameDay,
  matchesQuery,
  relativeTime,
} from '../lib/utils.js'
import { useApp } from '../store/AppStore.jsx'
import {
  lookupCommunity,
  lookupMember,
  pastEvents,
  upcomingEvents,
} from '../store/selectors.js'
import { Button } from '../components/ui/Button.jsx'
import {
  Avatar,
  Badge,
  OutlineBadge,
  Pagination,
  Progress,
  SearchInput,
  TableShell,
  Td,
  Th,
  Tr,
  paginate,
} from '../components/ui/Data.jsx'
import { Card, CardBody, CardHeader, MetaRow, PageHeader } from '../components/ui/Surface.jsx'
import { Breadcrumbs } from '../components/ui/Navigation.jsx'
import { ConfirmDialog, Menu } from '../components/ui/Overlay.jsx'
import { EmptyState, StatusMessage } from '../components/ui/Feedback.jsx'
import EventForm from './events/EventForm.jsx'
import { communityHue, duplicateEvent, kindColor, modeLabel } from './events/eventUtils.js'

const ROLE_TONE = { owner: 'accent', moderator: 'brand', member: 'neutral' }
const PAGE_SIZE = 8

function EventDetail({ event }) {
  const { state, actions, currentMember } = useApp()
  const currentUserId = currentMember?.id || state.currentUserId
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [attendeeSearch, setAttendeeSearch] = useState('')
  const [page, setPage] = useState(1)

  const community = lookupCommunity(state, event.communityId)
  const host = lookupMember(state, event.hostId)
  const startsAt = new Date(event.startsAt)
  const endsAt = new Date(event.endsAt)
  const durationMinutes = Math.max(15, Math.round((endsAt - startsAt) / 60_000))
  const now = Date.now()
  const ended = endsAt.getTime() < now
  const running = !ended && startsAt.getTime() <= now

  const registered = event.attendeeIds.length
  const remaining = Math.max(0, event.capacity - registered)
  const percent = (registered / (event.capacity || 1)) * 100
  const going = event.attendeeIds.includes(currentUserId)

  const statusLabel = ended ? 'Completed' : running ? 'Live now' : 'Scheduled'
  const statusTone = ended ? 'neutral' : running ? 'success' : 'info'

  const attendees = useMemo(
    () =>
      event.attendeeIds
        .map((id) => lookupMember(state, id))
        .filter(Boolean)
        .filter((member) => matchesQuery(member, attendeeSearch, ['name', 'title'])),
    [event.attendeeIds, attendeeSearch, state.members],
  )
  const paged = paginate(attendees, page, PAGE_SIZE)

  const moreUpcoming = upcomingEvents(state, 99).filter(
    (item) => item.communityId === event.communityId && item.id !== event.id,
  )
  const morePast = pastEvents(state, 99).filter(
    (item) => item.communityId === event.communityId && item.id !== event.id,
  )
  const more = (moreUpcoming.length ? moreUpcoming : morePast).slice(0, 4)
  const conversation = state.conversations.find((item) => item.communityId === event.communityId)

  const toggleRegistration = () => {
    const roster = new Set(event.attendeeIds)
    const nowGoing = !roster.has(currentUserId)
    if (nowGoing) roster.add(currentUserId)
    else roster.delete(currentUserId)
    actions.update('events', event.id, { attendeeIds: [...roster] })
    actions.notify(
      nowGoing ? `You are registered for ${event.title}` : `Registration cancelled — ${event.title}`,
      nowGoing ? 'success' : 'info',
    )
  }

  const copyLink = async () => {
    const url = appUrl(`/events/${event.id}`)
    const copied = await copyText(url)
    actions.notify(
      copied
        ? 'Event link copied to your clipboard'
        : `Clipboard is blocked in this browser — copy manually: ${url}`,
      copied ? 'success' : 'info',
    )
  }

  const duplicate = () => {
    const copy = duplicateEvent(event, currentUserId)
    actions.add('events', copy)
    actions.notify(`Duplicated as ${copy.title} — running ${formatDay(copy.startsAt)}`, 'success')
    navigate(`/events/${copy.id}`)
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={event.title}
        breadcrumb={
          <Breadcrumbs
            items={[
              { label: 'Events', href: '#/events' },
              { label: community?.name || 'Community', href: `#/communities/${event.communityId}` },
              { label: formatDay(event.startsAt) },
            ]}
          />
        }
        description={`${formatFull(startsAt)} at ${formatTime(startsAt)} · ${registered} registered of ${event.capacity} places · ${modeLabel(event.location?.mode)}`}
        meta={
          <>
            <Badge tone="brand">{event.kind}</Badge>
            <Link
              to={`/communities/${event.communityId}`}
              className="text-[11px] font-medium text-brand-content hover:underline"
            >
              {community?.name || 'Removed community'}
            </Link>
            <Badge tone={statusTone}>{statusLabel}</Badge>
            {percent >= 100 && <OutlineBadge tone="danger">Waitlist full</OutlineBadge>}
            {going && <OutlineBadge tone="success">You are registered</OutlineBadge>}
          </>
        }
        actions={
          <>
            <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Menu
              items={[
                { label: 'Duplicate a week later', icon: Copy, onSelect: duplicate },
                { label: 'Copy event link', icon: Link2, onSelect: copyLink },
                { label: 'Open the calendar', icon: CalendarDays, onSelect: () => navigate('/events') },
                { divider: true },
                { label: 'Delete event', icon: Trash2, danger: true, onSelect: () => setConfirming(true) },
              ]}
            />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader
              title="When and where"
              description={`Times are shown on your device clock. This workspace runs on ${state.workspace.timezone}.`}
              icon={CalendarDays}
            />
            <CardBody>
              <dl className="divide-y divide-line">
                <MetaRow label="Date">
                  {isSameDay(startsAt, endsAt)
                    ? `${formatDay(startsAt)}, ${startsAt.getFullYear()}`
                    : formatDateRange(startsAt, endsAt)}
                </MetaRow>
                <MetaRow label="Day">{formatDayWeekday(startsAt)}</MetaRow>
                <MetaRow label="Time">
                  <span className="tnum">
                    {formatTime(startsAt)} – {formatTime(endsAt)}
                  </span>
                </MetaRow>
                <MetaRow label="Duration">{durationMinutes} minutes</MetaRow>
                <MetaRow label="Location">
                  <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
                    <OutlineBadge>{modeLabel(event.location?.mode)}</OutlineBadge>
                    <span className="text-content-2">{event.location?.label}</span>
                  </span>
                </MetaRow>
              </dl>

              <p className="mt-4 text-[13px] leading-relaxed whitespace-pre-line text-content-2">
                {event.description}
              </p>

              <div className="mt-5 flex flex-col gap-3 rounded-card border border-line bg-surface-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-content">
                    {ended ? 'Attendance' : 'Your seat'}
                  </p>
                  <p className="text-[11px] leading-snug text-content-2">
                    {ended
                      ? 'This session has already run — the attendance list can still be corrected.'
                      : going
                        ? 'A reminder reaches you the day before, through the community channel.'
                        : remaining > 0
                          ? `${remaining} ${remaining === 1 ? 'place' : 'places'} still open.`
                          : 'Every place is claimed, so signing up adds you to the waitlist.'}
                  </p>
                </div>
                <Button
                  size="lg"
                  variant={going ? 'outline' : 'primary'}
                  icon={going ? Check : undefined}
                  className="shrink-0 sm:w-48"
                  onClick={toggleRegistration}
                >
                  {ended
                    ? going
                      ? 'Attended'
                      : 'Mark attended'
                    : going
                      ? 'Cancel registration'
                      : remaining > 0
                        ? 'Register'
                        : 'Join waitlist'}
                </Button>
              </div>

              <StatusMessage
                className="mt-3"
                tone={going ? 'success' : !ended && remaining === 0 ? 'warning' : 'neutral'}
              >
                {going
                  ? `Saved — you are on the list for “${event.title}”.`
                  : ended
                    ? `You are not on the attendance list, though ${registered} ${
                        registered === 1 ? 'member came' : 'members came'
                      }.`
                    : remaining > 0
                      ? 'You are not registered yet — places are still available.'
                      : `“${event.title}” is at capacity — registering puts you on the waitlist.`}
              </StatusMessage>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={ended ? 'Attendance' : 'Registered members'}
              description={`${registered} of ${event.capacity} places taken${
                community ? ` · roster drawn from ${community.name}` : ''
              }`}
              icon={Users}
              action={
                <Badge tone={registered >= event.capacity ? 'warning' : 'neutral'}>
                  {registered}/{event.capacity}
                </Badge>
              }
            />
            <CardBody>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <SearchInput
                  value={attendeeSearch}
                  onChange={(value) => {
                    setAttendeeSearch(value)
                    setPage(1)
                  }}
                  label="Attendee name"
                  placeholder="Search attendees"
                  resultCount={attendees.length}
                  className="sm:max-w-64"
                />
                <Button
                  variant="ghost"
                  size="xs"
                  iconRight={ArrowUpRight}
                  onClick={() => navigate('/members')}
                >
                  All members
                </Button>
              </div>

              {registered === 0 ? (
                <EmptyState
                  icon={Users}
                  tone="brand"
                  title="Nobody registered yet"
                  body="Registrations appear here as soon as members claim a place. Announcing the session in the channel usually brings the first ten."
                  action={
                    conversation ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={MessageSquare}
                        onClick={() => navigate(`/messages/${conversation.id}`)}
                      >
                        Post in {conversation.title}
                      </Button>
                    ) : undefined
                  }
                />
              ) : attendees.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No attendee matches that search"
                  body={`None of the ${registered} registered members match “${attendeeSearch}”.`}
                  action={
                    <Button variant="secondary" size="sm" icon={X} onClick={() => setAttendeeSearch('')}>
                      Clear filters
                    </Button>
                  }
                />
              ) : (
                <>
                  <TableShell>
                    <thead>
                      <tr>
                        <Th>Member</Th>
                        <Th>Role</Th>
                        <Th>Based in</Th>
                        <Th align="right">Joined</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.slice.map((member) => (
                        <Tr key={member.id} onClick={() => navigate(`/members/${member.id}`)}>
                          <Td>
                            <span className="flex items-center gap-2.5">
                              <Avatar
                                name={member.name}
                                hue={member.hue}
                                size={8}
                                status={member.online ? 'online' : undefined}
                              />
                              <span className="min-w-0">
                                <Link
                                  to={`/members/${member.id}`}
                                  className="block truncate text-[13px] font-medium text-content hover:text-brand"
                                >
                                  {member.name}
                                </Link>
                                <span className="block truncate text-[11px] text-content-3">
                                  {member.title}
                                </span>
                              </span>
                            </span>
                          </Td>
                          <Td>
                            <Badge tone={ROLE_TONE[member.role] || 'neutral'}>{member.role}</Badge>
                          </Td>
                          <Td className="text-[12px] text-content-2">{member.location}</Td>
                          <Td align="right" className="text-[12px] whitespace-nowrap text-content-3">
                            {relativeTime(member.joinedAt)}
                          </Td>
                        </Tr>
                      ))}
                    </tbody>
                  </TableShell>
                  <Pagination
                    page={paged.page}
                    pageCount={paged.pageCount}
                    total={attendees.length}
                    pageSize={PAGE_SIZE}
                    onChange={setPage}
                    className="mt-4"
                  />
                </>
              )}
            </CardBody>
          </Card>
        </div>

        {/* ------------------------------------------------------- sidebar -- */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader
              title="Capacity"
              description={
                ended
                  ? 'Doors closed when the session ran.'
                  : percent >= 100
                    ? 'Every place is claimed. New registrations become waitlist entries.'
                    : percent > 85
                      ? 'Nearly full — worth a reminder in the channel.'
                      : 'Places are still open.'
              }
              icon={Users}
            />
            <CardBody>
              <p className="text-2xl font-semibold tracking-tight text-content tnum">
                {registered}
                <span className="ml-1 text-base font-normal text-content-3">of {event.capacity} places</span>
              </p>
              <Progress
                className="mt-3"
                value={registered}
                max={event.capacity}
                tone={percent >= 100 ? 'danger' : percent > 85 ? 'warning' : 'brand'}
                label={`${registered} of ${event.capacity} places taken`}
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {ended ? (
                  <Badge tone={registered ? 'success' : 'neutral'}>
                    {registered ? `${registered} attended` : 'No attendance recorded'}
                  </Badge>
                ) : remaining > 0 ? (
                  <Badge tone={remaining <= 5 ? 'warning' : 'success'}>
                    {remaining} {remaining === 1 ? 'place' : 'places'} remaining
                  </Badge>
                ) : (
                  <Badge tone="danger">Waitlist full</Badge>
                )}
                <OutlineBadge>
                  {Math.round(percent)}% {ended ? 'turn-out' : 'claimed'}
                </OutlineBadge>
              </div>
              <dl className="mt-4 border-t border-line pt-1">
                <MetaRow label="Attendance list">{registered} names</MetaRow>
                <MetaRow label="Runs">
                  <span className="tnum">{formatTime(startsAt)}</span> –{' '}
                  <span className="tnum">{formatTime(endsAt)}</span>
                </MetaRow>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Hosted by"
              description={host ? `${host.title} · ${host.location}` : undefined}
              icon={UserRound}
            />
            <CardBody className="mt-3 flex flex-col gap-3">
              {host ? (
                <div className="flex items-center gap-3">
                  <Avatar
                    name={host.name}
                    hue={host.hue}
                    size={12}
                    status={host.online ? 'online' : undefined}
                  />
                  <div className="min-w-0">
                    <Link
                      to={`/members/${host.id}`}
                      className="block truncate text-[13px] font-semibold text-content hover:text-brand"
                    >
                      {host.name}
                    </Link>
                    <p className="truncate text-[11px] text-content-3">
                      @{host.handle} · {host.title}
                    </p>
                  </div>
                  <Badge tone={ROLE_TONE[host.role] || 'neutral'} className="ml-auto shrink-0">
                    {host.role}
                  </Badge>
                </div>
              ) : (
                <p className="text-[13px] text-content-2">
                  The host account is no longer in the member list.
                </p>
              )}

              {community && (
                <div className="flex items-center gap-3 rounded-control bg-surface-2 p-2.5">
                  <Avatar name={community.name} hue={communityHue(community)} size={9} />
                  <div className="min-w-0">
                    <Link
                      to={`/communities/${community.id}`}
                      className="block truncate text-[12px] font-medium text-content hover:text-brand"
                    >
                      {community.name}
                    </Link>
                    <p className="truncate text-[11px] text-content-3">
                      {community.category} · {community.memberIds.length} members
                    </p>
                  </div>
                  <ArrowUpRight size={14} className="ml-auto shrink-0 text-content-3" />
                </div>
              )}

              {conversation ? (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={MessageSquare}
                  onClick={() => navigate(`/messages/${conversation.id}`)}
                >
                  Ask about this in {conversation.title}
                </Button>
              ) : (
                <StatusMessage>
                  This community has no message channel in the demo data, so there is nowhere to ask
                  in public.
                </StatusMessage>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="More from this community"
              description={
                more.length
                  ? `${moreUpcoming.length ? 'Next up' : 'Most recently run'} in ${
                      community?.name || 'this community'
                    }`
                  : 'Nothing else on this community calendar'
              }
              icon={CalendarDays}
            />
            <CardBody className="mt-3">
              {more.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  tone="brand"
                  title="No other sessions"
                  body={`${community?.name || 'This community'} has an empty calendar apart from this event.`}
                  action={
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Plus}
                      onClick={() => navigate(`/events?new=1&community=${event.communityId}`)}
                    >
                      New event here
                    </Button>
                  }
                />
              ) : (
                <ul className="flex flex-col gap-1">
                  {more.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/events/${item.id}`)}
                        className="flex w-full items-center gap-3 rounded-control px-2 py-2 text-left transition-colors hover:bg-surface-2"
                      >
                        <span
                          aria-hidden="true"
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: kindColor(item.kind) }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] font-medium text-content">
                            {item.title}
                          </span>
                          <span className="block truncate text-[11px] text-content-3">
                            {formatDay(item.startsAt)} · {formatTime(item.startsAt)} · {item.kind}
                          </span>
                        </span>
                        <span className="shrink-0 text-[11px] text-content-3 tnum">
                          {item.attendeeIds.length}/{item.capacity}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <EventForm
        open={editing}
        onClose={() => setEditing(false)}
        event={event}
        defaultCommunityId={event.communityId}
      />

      <ConfirmDialog
        open={confirming}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          actions.remove('events', event.id)
          actions.notify(`Event deleted — ${event.title}`, 'info')
          navigate('/events')
        }}
        title="Delete this event?"
        body={`“${event.title}” has ${registered} registered members and runs ${formatDay(
          event.startsAt,
        )}. Deleting removes the session and every registration from the calendar — there is no undo.`}
        confirmLabel="Delete event"
      />
    </div>
  )
}

export default function EventDetailPage({ params }) {
  const { state } = useApp()
  const event = state.events.find((item) => item.id === params.id) || null

  if (event) return <EventDetail event={event} />

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Event not found"
        description="This link points at a session that is no longer on the calendar."
        breadcrumb={<Breadcrumbs items={[{ label: 'Events', href: '#/events' }, { label: 'Missing event' }]} />}
        actions={
          <Button variant="secondary" icon={CalendarDays} onClick={() => navigate('/events')}>
            Back to the calendar
          </Button>
        }
      />
      <EmptyState
        icon={CalendarDays}
        tone="warning"
        title="No event stored at that address"
        body={`Nothing matches “${params.id}”. It may have been deleted, or the demo data was reset since you opened the link. The calendar lists every session that still exists.`}
        action={
          <Link
            to="/events"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-content hover:underline"
          >
            <CalendarDays size={14} />
            Open the events calendar
          </Link>
        }
      />
    </div>
  )
}
