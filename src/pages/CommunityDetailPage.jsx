import { useState } from 'react'
import {
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronRight,
  CircleUser,
  FileText,
  Hash,
  ListChecks,
  MoreHorizontal,
  Pencil,
  Plus,
  Send,
  Star,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import { Link, navigate } from '../lib/router.jsx'
import {
  cn,
  formatDay,
  formatMonth,
  matchesQuery,
  relativeTime,
  slugify,
  uid,
} from '../lib/utils.js'
import {
  COMMUNITY_CATEGORIES,
  CONTENT_STATUSES,
  MEMBER_ROLES,
  MEMBER_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '../data/seed.js'
import { useApp } from '../store/AppStore.jsx'
import { communityStats, lookupMember } from '../store/selectors.js'
import { Button, IconButton } from '../components/ui/Button.jsx'
import {
  Avatar,
  Badge,
  Metric,
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
import {
  Card,
  CardBody,
  CardHeader,
  MetaRow,
  PageHeader,
  SectionTitle,
} from '../components/ui/Surface.jsx'
import { Breadcrumbs, FilterSelect, Tabs, Toolbar } from '../components/ui/Navigation.jsx'
import { ConfirmDialog, Dialog, Menu } from '../components/ui/Overlay.jsx'
import { EmptyState } from '../components/ui/Feedback.jsx'
import { Field, Input, Select, Textarea, isEmail, required, validate } from '../components/ui/Form.jsx'
import { RankedBars } from '../components/ui/Charts.jsx'

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'members', label: 'Members' },
  { key: 'channels', label: 'Channels' },
  { key: 'events', label: 'Events' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'content', label: 'Content' },
]

const HUES = [212, 348, 168, 276, 32, 190, 8, 128]
const ROLE_TONE = { owner: 'accent', moderator: 'brand', member: 'neutral' }

/** Icon-only menu trigger that still carries a specific accessible name. */
const Dots = <MoreHorizontal size={14} strokeWidth={1.9} />

const cap = (word) => String(word).charAt(0).toUpperCase() + String(word).slice(1)

const memberStatusMeta = (key) =>
  MEMBER_STATUSES.find((status) => status.key === key) || { label: cap(key), tone: 'neutral' }

const contentStatusTone = (key) =>
  CONTENT_STATUSES.find((status) => status.key === key)?.tone || 'neutral'

const priorityMeta = (key) =>
  TASK_PRIORITIES.find((priority) => priority.key === key) || { label: cap(key), tone: 'neutral' }

const isUpcoming = (event) => new Date(event.endsAt).getTime() >= Date.now()

const number = (value) => (value || 0).toLocaleString('en-US')

/* ------------------------------------------------------------- shared parts -- */

function ListRow({ children, className = '' }) {
  return (
    <li
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-control border border-line bg-surface px-3 py-2.5',
        className,
      )}
    >
      {children}
    </li>
  )
}

function ActivityTarget({ state, entry }) {
  const href =
    entry.targetKind === 'task'
      ? `/tasks?task=${entry.targetId}`
      : entry.targetKind === 'community'
        ? `/communities/${entry.targetId}`
        : entry.targetKind === 'member'
          ? `/members/${entry.targetId}`
          : entry.targetKind === 'event'
            ? `/events/${entry.targetId}`
            : `/content/${entry.targetId}`

  const record =
    entry.targetKind === 'community'
      ? state.communities.find((c) => c.id === entry.targetId)
      : entry.targetKind === 'member'
        ? state.members.find((m) => m.id === entry.targetId)
        : entry.targetKind === 'event'
          ? state.events.find((e) => e.id === entry.targetId)
          : entry.targetKind === 'content'
            ? state.content.find((c) => c.id === entry.targetId)
            : state.tasks.find((t) => t.id === entry.targetId)

  return (
    <a href={`#${href}`} className="font-medium text-brand-content underline-offset-2 hover:underline">
      {record?.name || record?.title || entry.targetId}
    </a>
  )
}

function belongsToCommunity(state, entry, communityId) {
  if (entry.targetKind === 'community') return entry.targetId === communityId
  if (entry.targetKind === 'event') {
    return state.events.find((e) => e.id === entry.targetId)?.communityId === communityId
  }
  if (entry.targetKind === 'content') {
    return state.content.find((c) => c.id === entry.targetId)?.communityId === communityId
  }
  if (entry.targetKind === 'task') {
    return state.tasks.find((t) => t.id === entry.targetId)?.communityId === communityId
  }
  if (entry.targetKind === 'member') {
    return Boolean(state.members.find((m) => m.id === entry.targetId)?.communityIds.includes(communityId))
  }
  return false
}

/* ------------------------------------------------------------------- dialogs -- */

function EditCommunityDialog({ community, onClose }) {
  const { actions } = useApp()
  const [form, setForm] = useState({
    name: community.name,
    category: community.category,
    visibility: community.visibility,
    about: community.about,
    tags: community.tags.join(', '),
  })
  const [errors, setErrors] = useState({})

  const set = (key) => (event) => {
    const value = event.target.value
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev))
  }

  const submit = () => {
    const next = validate(form, {
      name: (value) => required(value, 'Community name'),
      about: (value) => required(value, 'The about line'),
    })
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }
    actions.update('communities', community.id, {
      name: form.name.trim(),
      category: form.category,
      visibility: form.visibility,
      about: form.about.trim(),
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    })
    actions.notify(`Saved the details for ${form.name.trim()}`, 'success')
    onClose()
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Edit community details"
      description="Name, category, visibility and the description people read before joining."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" icon={Check} onClick={submit}>
            Save changes
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <Field label="Community name" required error={errors.name}>
          <Input value={form.name} onChange={set('name')} invalid={Boolean(errors.name)} data-autofocus />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <Select value={form.category} onChange={set('category')}>
              {COMMUNITY_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Visibility">
            <Select value={form.visibility} onChange={set('visibility')}>
              <option value="public">Public — anyone can join</option>
              <option value="private">Private — invitation only</option>
            </Select>
          </Field>
        </div>

        <Field label="About" required error={errors.about} hint="Two or three sentences is the right length.">
          <Textarea value={form.about} onChange={set('about')} invalid={Boolean(errors.about)} rows={4} />
        </Field>

        <Field label="Tags" hint="Comma separated.">
          <Input value={form.tags} onChange={set('tags')} />
        </Field>
      </form>
    </Dialog>
  )
}

function InviteMemberDialog({ community, onClose }) {
  const { state, actions } = useApp()
  const [form, setForm] = useState({ name: '', email: '', title: '', role: 'member' })
  const [errors, setErrors] = useState({})

  const set = (key) => (event) => {
    const value = event.target.value
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev))
  }

  const submit = () => {
    const next = validate(form, {
      name: (value) => required(value, 'Name'),
      email: (value) => required(value, 'Email') || isEmail(value),
      title: (value) => required(value, 'Role title'),
    })
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }

    const now = new Date().toISOString()
    const id = uid('m')
    const name = form.name.trim()
    const handleBase = slugify(name).replace(/-/g, '') || `member${id.slice(-4)}`
    const handle = state.members.some((m) => m.handle === handleBase)
      ? `${handleBase}${id.slice(-3)}`
      : handleBase

    actions.add('members', {
      id,
      name,
      handle,
      email: form.email.trim().toLowerCase(),
      title: form.title.trim(),
      location: 'Not shared yet',
      bio: 'Invitation sent — the profile fills in once they accept and post for the first time.',
      role: form.role,
      status: 'invited',
      joinedAt: now,
      lastActiveAt: now,
      online: false,
      level: 1,
      followers: 0,
      following: 0,
      hue: HUES[Math.floor(Math.random() * HUES.length)],
      contributions: { posts: 0, comments: 0, reactions: 0 },
      communityIds: [community.id],
    })
    actions.memberJoin(id, community.id)

    if (form.role === 'moderator') {
      actions.update('communities', community.id, {
        moderatorIds: [...new Set([...community.moderatorIds, id])],
        memberIds: [...new Set([...community.memberIds, id])],
      })
    }

    actions.notify(`Invitation sent to ${name}`, 'success')
    onClose()
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Invite a member"
      description={`They join ${community.name} straight away with status “invited”, and count in the roster.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" icon={Send} onClick={submit}>
            Send invitation
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <Field label="Full name" required error={errors.name}>
          <Input
            value={form.name}
            onChange={set('name')}
            invalid={Boolean(errors.name)}
            placeholder="Sanne de Vries"
            data-autofocus
          />
        </Field>
        <Field label="Email" required error={errors.email} hint="The invitation is addressed here.">
          <Input
            value={form.email}
            onChange={set('email')}
            invalid={Boolean(errors.email)}
            placeholder="sanne@atlas-studio.nl"
          />
        </Field>
        <Field label="Role title" required error={errors.title} hint="Shown under their name in the roster.">
          <Input
            value={form.title}
            onChange={set('title')}
            invalid={Boolean(errors.title)}
            placeholder="Service Designer"
          />
        </Field>
        <Field label="Community role" hint="Moderators appear in the channel header and can action reports.">
          <Select value={form.role} onChange={set('role')}>
            {MEMBER_ROLES.filter((role) => role.key !== 'owner').map((role) => (
              <option key={role.key} value={role.key}>
                {role.label}
              </option>
            ))}
          </Select>
        </Field>
      </form>
    </Dialog>
  )
}

/* ------------------------------------------------------------------- overview -- */

function OverviewTab({ community, stats }) {
  const { state } = useApp()

  const topContent = [...stats.published]
    .sort((a, b) => b.metrics.views - a.metrics.views)
    .slice(0, 6)
    .map((item) => ({ label: item.title, value: item.metrics.views }))

  const activity = state.activity
    .filter((entry) => belongsToCommunity(state, entry, community.id))
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 6)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Members" value={stats.members} hint={`${stats.online} online now`} icon={Users} tone="brand" />
        <Metric
          label="Engagement"
          value={`${stats.engagementRate}%`}
          hint={`${stats.activeThisWeek} active in the last 7 days`}
          icon={Check}
          tone={stats.engagementRate > 45 ? 'success' : 'warning'}
        />
        <Metric
          label="Upcoming events"
          value={stats.upcomingEvents}
          hint={`${stats.events} on the calendar all-time`}
          icon={CalendarDays}
          tone="info"
        />
        <Metric
          label="Open tasks"
          value={stats.openTasks}
          hint={stats.unread ? `${stats.unread} unread across channels` : 'No unread messages'}
          icon={ListChecks}
          tone={stats.openTasks ? 'accent' : 'success'}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Top content by views"
            description="Published items filed to this community, counted from their live metrics."
            icon={FileText}
            action={
              <Button
                variant="ghost"
                size="xs"
                iconRight={ChevronRight}
                onClick={() => navigate(`/communities/${community.id}?tab=content`)}
              >
                All content
              </Button>
            }
          />
          <CardBody>
            {topContent.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Nothing published here yet"
                body="Write something and its views start ranking against the rest of the room immediately."
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Plus}
                    onClick={() => navigate(`/content?new=1&community=${community.id}`)}
                  >
                    New post
                  </Button>
                }
                tone="brand"
              />
            ) : (
              <>
                <RankedBars data={topContent} valueKey="value" labelKey="label" />
                <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-line pt-3 text-[11px] text-content-2">
                  <li>
                    <span className="font-semibold text-content tnum">{stats.published.length}</span> published
                  </li>
                  <li>
                    <span className="font-semibold text-content tnum">{stats.contentCount}</span> items in total
                  </li>
                  <li>
                    <span className="font-semibold text-content tnum">{number(stats.reach)}</span> lifetime views
                  </li>
                  <li>
                    <span className="font-semibold text-content tnum">{stats.latestActivity ? relativeTime(stats.latestActivity.at) : 'no room-level event'}</span>{' '}
                    since the last community-level change
                  </li>
                </ul>
              </>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="The room today" description="Who runs it and how it is configured." icon={Hash} />
          <CardBody>
            <p className="text-[13px] leading-relaxed text-content-2">{community.about}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {community.tags.map((tag) => (
                <Badge key={tag} tone="neutral">
                  {tag}
                </Badge>
              ))}
            </div>
            <dl className="mt-3 divide-y divide-line border-t border-line">
              <MetaRow label="Owner">{stats.owner?.name || 'Unclaimed'}</MetaRow>
              <MetaRow label="Moderators">
                {stats.moderators.length ? stats.moderators.map((m) => m.name).join(', ') : 'None yet'}
              </MetaRow>
              <MetaRow label="Channels">{community.channels.length}</MetaRow>
              <MetaRow label="Visibility">{cap(community.visibility)}</MetaRow>
              <MetaRow label="Created">{formatMonth(community.createdAt)}</MetaRow>
            </dl>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader
            title="Weekly participation"
            description="Roster members with any recorded activity in the last seven days."
            icon={Check}
          />
          <CardBody>
            <p className="text-3xl font-semibold tracking-tight text-content tnum">
              {stats.activeThisWeek}
              <span className="ml-1 text-sm font-medium text-content-3">/ {stats.members}</span>
            </p>
            <Progress
              value={stats.activeThisWeek}
              max={stats.members || 1}
              className="mt-3"
              tone={stats.engagementRate > 45 ? 'success' : 'warning'}
              label="Members active this week"
            />
            <p className="mt-3 text-[11px] leading-relaxed text-content-2">
              {stats.engagementRate > 45
                ? 'Healthy. Keep the critique queue capped so the same three voices do not carry every thread.'
                : 'Below the level where threads answer themselves. A pinned prompt from the owner usually moves this inside a week.'}
            </p>
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader
            title="Latest activity"
            description="Event, task, content and member moves that belong to this community."
            icon={CalendarDays}
          />
          <CardBody>
            {activity.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No recorded activity yet"
                body="Things done in this room — posts published, tasks moved, events changed — land here as they happen."
                tone="neutral"
              />
            ) : (
              <ul className="flex flex-col gap-1">
                {activity.map((entry) => {
                  const actor = lookupMember(state, entry.actorId)
                  return (
                    <li
                      key={entry.id}
                      className="flex items-center gap-3 rounded-control px-2 py-2 transition-colors hover:bg-surface-2"
                    >
                      <Avatar
                        name={actor?.name}
                        hue={actor?.hue}
                        size={8}
                        status={actor?.online ? 'online' : undefined}
                      />
                      <p className="min-w-0 flex-1 text-[11px] leading-snug text-content-2">
                        <span className="font-semibold text-content">{actor?.name || 'A member'}</span>{' '}
                        {entry.verb} <ActivityTarget state={state} entry={entry} />
                        <span className="block text-content-3">{relativeTime(entry.at)}</span>
                      </p>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------- members -- */

function MembersTab({ community }) {
  const { state, actions, currentMember } = useApp()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('all')
  const [page, setPage] = useState(1)
  const [inviting, setInviting] = useState(false)
  const [removeTarget, setRemoveTarget] = useState(null)

  const roleOf = (member) =>
    community.ownerId === member.id
      ? 'owner'
      : community.moderatorIds.includes(member.id)
        ? 'moderator'
        : 'member'

  const roster = community.memberIds
    .map((id) => lookupMember(state, id))
    .filter(Boolean)
    .filter((member) => role === 'all' || roleOf(member) === role)
    .filter((member) => matchesQuery(member, search, ['name', 'title', 'email', 'handle']))
    .sort((a, b) => {
      const rank = { owner: 0, moderator: 1, member: 2 }
      return rank[roleOf(a)] - rank[roleOf(b)] || new Date(b.lastActiveAt) - new Date(a.lastActiveAt)
    })

  const filtersOn = Boolean(search.trim()) || role !== 'all'
  const paged = paginate(roster, page, 8)

  const setModerator = (member, next) => {
    const moderatorIds = next
      ? [...new Set([...community.moderatorIds, member.id])]
      : community.moderatorIds.filter((id) => id !== member.id)
    actions.update('communities', community.id, { moderatorIds })
    actions.notify(
      next
        ? `${member.name} now moderates ${community.name}`
        : `${member.name} is back to a plain member in ${community.name}`,
      next ? 'success' : 'info',
    )
  }

  const clearFilters = () => {
    setSearch('')
    setRole('all')
    setPage(1)
  }

  const menuFor = (member) => {
    const current = roleOf(member)
    const isSelf = member.id === currentMember.id
    return [
      {
        label: 'Open profile',
        icon: CircleUser,
        onSelect: () => navigate(`/members/${member.id}`),
      },
      { divider: true },
      {
        label: 'Promote to moderator',
        icon: Star,
        disabled: current !== 'member' || isSelf,
        hint: current === 'owner' ? 'owner' : current === 'moderator' ? 'already a moderator' : undefined,
        onSelect: () => setModerator(member, true),
      },
      {
        label: 'Demote to member',
        icon: Users,
        disabled: current !== 'moderator',
        onSelect: () => setModerator(member, false),
      },
      { divider: true },
      {
        label: 'Remove from community',
        icon: Trash2,
        danger: true,
        disabled: current === 'owner' || isSelf,
        hint: current === 'owner' ? 'owner stays' : isSelf ? 'use leave' : undefined,
        onSelect: () => setRemoveTarget(member),
      },
    ]
  }

  return (
    <Card>
      <CardHeader
        title={`Roster — ${roster.length} shown of ${community.memberIds.length}`}
        description="Community role lives on this record, so the owner and moderators here can differ from another room."
        icon={Users}
        action={
          <Button variant="primary" size="sm" icon={UserPlus} onClick={() => setInviting(true)}>
            Invite member
          </Button>
        }
      />

      <Toolbar className="mt-4">
        <SearchInput
          label="Search roster"
          placeholder="Search name, title or email"
          value={search}
          onChange={(value) => {
            setSearch(value)
            setPage(1)
          }}
          resultCount={roster.length}
        />
        <FilterSelect
          label="Role"
          value={role}
          onChange={(value) => {
            setRole(value)
            setPage(1)
          }}
          options={[
            { value: 'all', label: 'All roles' },
            ...MEMBER_ROLES.map((item) => ({ value: item.key, label: item.label })),
          ]}
        />
      </Toolbar>

      <CardBody className="mt-4">
        {roster.length === 0 ? (
          <EmptyState
            icon={Users}
            title={filtersOn ? 'Nobody matches that filter' : 'This roster is empty'}
            body={
              filtersOn
                ? 'Clear the search, or switch back to all roles to see the full roster.'
                : 'Send an invitation and the member appears here with status “invited” until they accept.'
            }
            action={
              filtersOn ? (
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button variant="primary" size="sm" icon={UserPlus} onClick={() => setInviting(true)}>
                  Invite member
                </Button>
              )
            }
            tone={filtersOn ? 'neutral' : 'brand'}
          />
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th>Member</Th>
                  <Th>Role</Th>
                  <Th>Status</Th>
                  <Th>Joined</Th>
                  <Th>Last active</Th>
                  <Th align="right" className="w-12" />
                </tr>
              </thead>
              <tbody>
                {paged.slice.map((member) => {
                  const current = roleOf(member)
                  const status = memberStatusMeta(member.status)
                  return (
                    <Tr key={member.id}>
                      <Td>
                        <span className="flex items-center gap-2.5">
                          <Avatar
                            name={member.name}
                            hue={member.hue}
                            size={8}
                            status={
                              member.online ? 'online' : member.status === 'suspended' ? 'suspended' : undefined
                            }
                          />
                          <span className="min-w-0">
                            <Link
                              to={`/members/${member.id}`}
                              className="block max-w-56 truncate text-[13px] font-medium text-content hover:text-brand"
                            >
                              {member.name}
                            </Link>
                            <span className="block max-w-56 truncate text-[11px] text-content-3">
                              {member.title} · @{member.handle}
                            </span>
                          </span>
                        </span>
                      </Td>
                      <Td>
                        <Badge tone={ROLE_TONE[current]}>{cap(current)}</Badge>
                      </Td>
                      <Td>
                        <OutlineBadge tone={status.tone}>{status.label}</OutlineBadge>
                      </Td>
                      <Td className="whitespace-nowrap text-content-2">{formatDay(member.joinedAt)}</Td>
                      <Td className="whitespace-nowrap text-content-2">{relativeTime(member.lastActiveAt)}</Td>
                      <Td align="right">
                        <Menu
                          items={menuFor(member)}
                          label={`Actions for ${member.name}`}
                          leading={Dots}
                          size="xs"
                        />
                      </Td>
                    </Tr>
                  )
                })}
              </tbody>
            </TableShell>
            <Pagination
              page={paged.page}
              pageCount={paged.pageCount}
              total={roster.length}
              pageSize={8}
              onChange={setPage}
            />
          </>
        )}
      </CardBody>

      {inviting && <InviteMemberDialog community={community} onClose={() => setInviting(false)} />}
      <ConfirmDialog
        open={Boolean(removeTarget)}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => {
          actions.memberLeave(removeTarget.id, community.id)
          actions.notify(`${removeTarget.name} no longer belongs to ${community.name}`, 'info')
          setRemoveTarget(null)
        }}
        title="Remove this member?"
        body={`${removeTarget?.name || 'This member'} loses every channel in ${community.name}. Their published items stay in the library, and you can invite them again at any time.`}
        confirmLabel="Remove member"
      />
    </Card>
  )
}

/* ------------------------------------------------------------------ channels -- */

function ChannelsTab({ community, stats }) {
  const { state } = useApp()
  const conversation = state.conversations.find((c) => c.communityId === community.id) || null

  return (
    <Card>
      <CardHeader
        title={`${community.channels.length} channels`}
        description={
          conversation
            ? `Message history in this demo is one backing thread, “${conversation.title}”. Every chat channel opens it.`
            : 'This room was created after the demo message history was generated, so no thread backs its channels yet.'
        }
        icon={Hash}
        action={
          <Badge tone={stats.unread ? 'accent' : 'neutral'}>{stats.unread} unread</Badge>
        }
      />
      <CardBody>
        <ul className="flex flex-col gap-2">
          {community.channels.map((channel) => {
            const linked = Boolean(conversation) && channel.kind === 'chat'
            return (
              <ListRow key={channel.id}>
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-control',
                    linked ? 'bg-brand-soft text-brand-content' : 'bg-neutral-soft text-content-3',
                  )}
                >
                  <Hash size={14} strokeWidth={1.9} />
                </span>
                <span className="min-w-0 flex-1">
                  {linked ? (
                    <Link
                      to={`/messages/${conversation.id}`}
                      className="block truncate text-[13px] font-medium text-content hover:text-brand"
                    >
                      #{channel.name}
                    </Link>
                  ) : (
                    <span className="block truncate text-[13px] font-medium text-content-3">
                      #{channel.name}
                    </span>
                  )}
                  <span className="block truncate text-[11px] text-content-3">
                    {linked
                      ? `${conversation.messages.length} messages · last activity ${relativeTime(conversation.lastActivityAt)}`
                      : channel.kind === 'chat'
                        ? 'No conversation in the demo dataset'
                        : `${cap(channel.kind)} channel — pinned items, no message stream`}
                  </span>
                </span>
                <Badge tone={channel.kind === 'chat' ? 'brand' : 'neutral'}>{cap(channel.kind)}</Badge>
                {channel.unread > 0 ? (
                  <Badge tone="accent">{channel.unread} new</Badge>
                ) : (
                  <span className="text-[11px] text-content-3 tnum">0 unread</span>
                )}
                {linked ? (
                  <ChevronRight size={14} className="shrink-0 text-content-3" />
                ) : (
                  <OutlineBadge tone="neutral">read-only</OutlineBadge>
                )}
              </ListRow>
            )
          })}
        </ul>

        <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-content-3">
          Announcement and resource channels hold pinned items rather than a stream, so they do not open the
          message view. Joining a private room from here is a member action, not a channel one.
        </p>
      </CardBody>
    </Card>
  )
}

/* --------------------------------------------------------------------- events -- */

function EventRow({ event }) {
  const { state, actions } = useApp()
  const host = lookupMember(state, event.hostId)
  const attendees = event.attendeeIds
  const going = attendees.includes(state.currentUserId)
  const full = !going && attendees.length >= event.capacity
  const past = !isUpcoming(event)

  const toggle = () => {
    const next = new Set(attendees)
    if (next.has(state.currentUserId)) next.delete(state.currentUserId)
    else next.add(state.currentUserId)
    actions.update('events', event.id, { attendeeIds: [...next] })
    actions.notify(
      going ? `Registration cancelled — ${event.title}` : `You are registered for ${event.title}`,
      going ? 'info' : 'success',
    )
  }

  return (
    <ListRow>
      <span className="flex w-11 shrink-0 flex-col items-center rounded-control border border-line bg-surface-2 py-1">
        <span className="text-[9px] font-semibold tracking-wide text-content-3 uppercase">
          {formatDay(event.startsAt).split(' ')[0]}
        </span>
        <span className="text-sm font-semibold text-content tnum">{new Date(event.startsAt).getDate()}</span>
      </span>
      <span className="min-w-0 flex-1">
        <Link
          to={`/events/${event.id}`}
          className="block max-w-full truncate text-[13px] font-medium text-content hover:text-brand"
        >
          {event.title}
        </Link>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-content-3">
          <span>{event.kind}</span>
          <span aria-hidden="true">·</span>
          <span className="flex items-center gap-1.5">
            <Avatar name={host?.name} hue={host?.hue} size={6} />
            {host?.name || 'Host to be assigned'}
          </span>
          <span aria-hidden="true">·</span>
          <span>{event.location?.label}</span>
        </span>
        <span className="mt-1.5 flex items-center gap-2">
          <Progress
            value={attendees.length}
            max={event.capacity}
            className="max-w-32"
            tone={
              past
                ? 'success'
                : attendees.length / (event.capacity || 1) > 0.85
                  ? 'warning'
                  : 'brand'
            }
            label={`${attendees.length} of ${event.capacity} places taken`}
          />
          <span className="text-[10px] text-content-3 tnum">
            {past ? `${attendees.length} registered` : `${attendees.length}/${event.capacity}`}
          </span>
        </span>
      </span>
      {past ? (
        <Badge tone="neutral">Ran</Badge>
      ) : going ? (
        <Button size="xs" variant="ghost" icon={Check} title="Cancel your registration" onClick={toggle}>
          Going
        </Button>
      ) : (
        <Button
          size="xs"
          variant="outline"
          disabled={full}
          title={full ? 'This session is at capacity' : undefined}
          onClick={toggle}
        >
          {full ? 'Full' : 'Register'}
        </Button>
      )}
    </ListRow>
  )
}

function EventsTab({ community, stats }) {
  const { state } = useApp()
  const events = state.events.filter((event) => event.communityId === community.id)
  const upcoming = events
    .filter(isUpcoming)
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
  const past = events
    .filter((event) => !isUpcoming(event))
    .sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt))

  const newEvent = () => navigate(`/events?new=1&community=${community.id}`)

  if (events.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Nothing on this calendar yet"
        body="Sessions run by other communities are not listed here — this tab stays honest about what this room has scheduled."
        action={
          <Button variant="primary" size="sm" icon={CalendarPlus} onClick={newEvent}>
            New event here
          </Button>
        }
        tone="brand"
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader
          title={`Upcoming — ${upcoming.length}`}
          description={`Capacity is live, and registering here writes straight to the event record. ${stats.openTasks} open task${stats.openTasks === 1 ? '' : 's'} keep this calendar running.`}
          icon={CalendarDays}
          action={
            <Button variant="secondary" size="sm" icon={CalendarPlus} onClick={newEvent}>
              New event here
            </Button>
          }
        />
        <CardBody>
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No future dates"
              body="Everything scheduled here has finished. Add the next session so members can register."
              action={
                <Button variant="primary" size="sm" icon={CalendarPlus} onClick={newEvent}>
                  Add a date
                </Button>
              }
              tone="neutral"
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {upcoming.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {past.length > 0 && (
        <Card>
          <CardHeader
            title={`Ran and done — ${past.length}`}
            description="Registrations stay on the record so the follow-up recording can be matched to the room."
            icon={Check}
          />
          <CardBody>
            <ul className="flex flex-col gap-2">
              {past.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------------- tasks -- */

function TasksTab({ community }) {
  const { state, actions } = useApp()
  const tasks = state.tasks.filter((task) => task.communityId === community.id)
  const open = tasks.filter((task) => task.status !== 'done').length

  const groups = TASK_STATUSES.map((status) => ({
    status,
    items: tasks
      .filter((task) => task.status === status.key)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)),
  })).filter((group) => group.items.length > 0)

  const toggleDone = (task) => {
    const done = task.status !== 'done'
    actions.update('tasks', task.id, {
      status: done ? 'done' : 'todo',
      completedAt: done ? new Date().toISOString() : null,
    })
    actions.notify(
      done ? `Completed “${task.title}”` : `Reopened “${task.title}” as to do`,
      done ? 'success' : 'info',
    )
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={Check}
        title="No tasks assigned to this community"
        body="Moderation, content and event chores show up here as soon as they are filed to this room."
        action={
          <Button variant="primary" size="sm" icon={Plus} onClick={() => navigate('/tasks')}>
            Open the task board
          </Button>
        }
        tone="brand"
      />
    )
  }

  return (
    <Card>
      <CardHeader
        title={`${open} open of ${tasks.length}`}
        description="Tick the box to close a task; done items can be reopened if they were marked early."
        icon={Check}
        action={
          <Button variant="ghost" size="sm" iconRight={ChevronRight} onClick={() => navigate('/tasks')}>
            Board
          </Button>
        }
      />
      <CardBody className="flex flex-col gap-5">
        {groups.map(({ status, items }) => (
          <div key={status.key} className="flex flex-col gap-2">
            <SectionTitle action={<Badge tone={status.tone}>{items.length}</Badge>}>{status.label}</SectionTitle>
            <ul className="flex flex-col gap-1.5">
              {items.map((task) => {
                const priority = priorityMeta(task.priority)
                const late = task.status !== 'done' && new Date(task.dueDate) < new Date()
                return (
                  <ListRow key={task.id}>
                    <button
                      type="button"
                      aria-label={
                        task.status === 'done' ? `Reopen ${task.title}` : `Mark ${task.title} as done`
                      }
                      onClick={() => toggleDone(task)}
                      className={cn(
                        'flex size-5 shrink-0 items-center justify-center rounded border transition-colors',
                        task.status === 'done'
                          ? 'border-transparent bg-success text-white'
                          : 'border-line-2 hover:border-success hover:bg-success-soft',
                      )}
                    >
                      {task.status === 'done' && <Check size={12} strokeWidth={2.6} />}
                    </button>
                    <span className="min-w-0 flex-1">
                      <a
                        href={`#/tasks?task=${task.id}`}
                        className={cn(
                          'block max-w-full truncate text-[13px] font-medium hover:text-brand',
                          task.status === 'done' ? 'text-content-3 line-through' : 'text-content',
                        )}
                      >
                        {task.title}
                      </a>
                      <span className="block truncate text-[11px] text-content-3">
                        {task.assigneeName} ·{' '}
                        <span className={cn(late && 'font-medium text-danger')}>
                          {relativeTime(task.dueDate)}
                        </span>
                      </span>
                    </span>
                    <Badge tone={priority.tone}>{priority.label}</Badge>
                    {task.labels.map((label) => (
                      <OutlineBadge key={label} tone="neutral">
                        {label}
                      </OutlineBadge>
                    ))}
                  </ListRow>
                )
              })}
            </ul>
          </div>
        ))}
      </CardBody>
    </Card>
  )
}

/* -------------------------------------------------------------------- content -- */

function ContentTab({ community }) {
  const { state } = useApp()
  const [page, setPage] = useState(1)

  const items = state.content
    .filter((item) => item.communityId === community.id)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  const paged = paginate(items, page, 8)

  const newPost = () => navigate(`/content?new=1&community=${community.id}`)

  return (
    <Card>
      <CardHeader
        title={`${items.length} items`}
        description="Posts, guides, resources and reports filed to this community, with their live metrics."
        icon={FileText}
        action={
          <Button variant="primary" size="sm" icon={Plus} onClick={newPost}>
            New post
          </Button>
        }
      />
      <CardBody>
        {items.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nothing filed here yet"
            body="Anything written for this room appears here with views, comments and the last edit time."
            action={
              <Button variant="primary" size="sm" icon={Plus} onClick={newPost}>
                Write the first post
              </Button>
            }
            tone="brand"
          />
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th>Title</Th>
                  <Th>Type</Th>
                  <Th>Status</Th>
                  <Th align="right">Views</Th>
                  <Th align="right">Comments</Th>
                  <Th>Updated</Th>
                </tr>
              </thead>
              <tbody>
                {paged.slice.map((item) => (
                  <Tr key={item.id}>
                    <Td>
                      <Link
                        to={`/content/${item.id}`}
                        className="block max-w-72 truncate text-[13px] font-medium text-content hover:text-brand"
                      >
                        {item.title}
                      </Link>
                      <span className="block max-w-72 truncate text-[11px] text-content-3">
                        {item.category} · by{' '}
                        {lookupMember(state, item.authorId)?.name || 'a former member'}
                      </span>
                    </Td>
                    <Td>
                      <OutlineBadge tone="neutral">{cap(item.type)}</OutlineBadge>
                    </Td>
                    <Td>
                      <Badge tone={contentStatusTone(item.status)}>{cap(item.status)}</Badge>
                    </Td>
                    <Td align="right" className="tnum">
                      {number(item.metrics.views)}
                    </Td>
                    <Td align="right" className="tnum">
                      {item.metrics.comments}
                    </Td>
                    <Td className="whitespace-nowrap text-content-2">{relativeTime(item.updatedAt)}</Td>
                  </Tr>
                ))}
              </tbody>
            </TableShell>
            <Pagination
              page={paged.page}
              pageCount={paged.pageCount}
              total={items.length}
              pageSize={8}
              onChange={setPage}
            />
          </>
        )}
      </CardBody>
    </Card>
  )
}

/* ----------------------------------------------------------------------- page -- */

function MissingCommunity({ id }) {
  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <PageHeader
        title="Community not found"
        description="This URL points at a room that is no longer in the workspace."
      />
      <EmptyState
        icon={Trash2}
        title={`Nothing is stored under the id “${id}”`}
        body="It may have been deleted from another tab, or the link was mistyped. The directory lists every room still here."
        action={
          <Link
            to="/communities"
            className="inline-flex h-9 items-center gap-2 rounded-control bg-brand-fill px-4 text-[13px] font-medium text-white transition-colors hover:bg-brand-fill-2"
          >
            <ArrowLeft size={14} />
            Back to the directory
          </Link>
        }
        tone="warning"
      />
    </div>
  )
}

function CommunityView({ community, query }) {
  const { state, actions, currentMember } = useApp()
  const [editing, setEditing] = useState(false)
  const [confirmingLeave, setConfirmingLeave] = useState(false)

  const stats = communityStats(state, community)
  const requested = query.get('tab')
  const tab = TABS.some((item) => item.key === requested) ? requested : 'overview'
  const isFavourite = community.isFavorite
  const isOwner = community.ownerId === currentMember.id

  const counts = {
    members: stats.members,
    channels: community.channels.length,
    events: stats.events,
    tasks: state.tasks.filter((task) => task.communityId === community.id).length,
    content: stats.contentCount,
  }

  const toggleFavourite = () => {
    actions.update('communities', community.id, { isFavorite: !isFavourite })
    actions.notify(
      isFavourite ? `${community.name} removed from favourites` : `${community.name} added to favourites`,
      isFavourite ? 'info' : 'success',
    )
  }

  const menu = [
    { label: 'Edit details', icon: Pencil, onSelect: () => setEditing(true) },
    {
      label: isFavourite ? 'Remove favourite' : 'Mark favourite',
      icon: Star,
      onSelect: toggleFavourite,
    },
    { divider: true },
    {
      label: 'New event here',
      icon: CalendarPlus,
      onSelect: () => navigate(`/events?new=1&community=${community.id}`),
    },
    {
      label: 'Leave community',
      icon: ArrowLeft,
      danger: true,
      disabled: isOwner,
      hint: isOwner ? 'you are the owner' : undefined,
      onSelect: () => setConfirmingLeave(true),
    },
  ]

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <PageHeader
        breadcrumb={<Breadcrumbs items={[{ label: 'Communities', href: '#/communities' }, { label: community.name }]} />}
        title={community.name}
        description={community.about}
        meta={
          <>
            <Badge tone="brand">{community.category}</Badge>
            <OutlineBadge tone={community.visibility === 'public' ? 'brand' : 'neutral'}>
              {cap(community.visibility)}
            </OutlineBadge>
            <Badge tone="neutral" icon={Users}>
              {stats.members} members
            </Badge>
            <OutlineBadge tone="neutral">Created {formatMonth(community.createdAt)}</OutlineBadge>
            {isFavourite && (
              <Badge tone="warning" icon={Star}>
                Favourite
              </Badge>
            )}
          </>
        }
        actions={
          <>
            <IconButton
              icon={Star}
              variant="secondary"
              size="lg"
              active={isFavourite}
              label={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
              onClick={toggleFavourite}
            />
            <Menu items={menu} label="Community actions" size="md" />
            <Button variant="primary" icon={FileText} onClick={() => navigate(`/content?new=1&community=${community.id}`)}>
              New post
            </Button>
          </>
        }
      />

      <Tabs
        value={tab}
        onChange={(key) => navigate(`/communities/${community.id}?tab=${key}`)}
        items={TABS.map((item) => ({ ...item, count: counts[item.key] }))}
      />

      {tab === 'overview' && <OverviewTab community={community} stats={stats} />}
      {tab === 'members' && <MembersTab community={community} />}
      {tab === 'channels' && <ChannelsTab community={community} stats={stats} />}
      {tab === 'events' && <EventsTab community={community} stats={stats} />}
      {tab === 'tasks' && <TasksTab community={community} />}
      {tab === 'content' && <ContentTab community={community} />}

      {editing && <EditCommunityDialog community={community} onClose={() => setEditing(false)} />}
      <ConfirmDialog
        open={confirmingLeave}
        onCancel={() => setConfirmingLeave(false)}
        onConfirm={() => {
          actions.memberLeave(currentMember.id, community.id)
          actions.notify(`You left ${community.name}`, 'info')
          setConfirmingLeave(false)
          navigate('/communities')
        }}
        title="Leave this community?"
        body={`You lose access to all ${community.channels.length} channels in ${community.name}. Items you published stay in the library with your name on them, and the roster keeps your join date.`}
        confirmLabel="Leave community"
      />
    </div>
  )
}

export default function CommunityDetailPage({ params, query }) {
  const { state } = useApp()
  const community = state.communities.find((item) => item.id === params.id)
  if (!community) return <MissingCommunity id={params.id} />
  return <CommunityView community={community} query={query} />
}
