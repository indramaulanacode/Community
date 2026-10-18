import { useState } from 'react'
import {
  Activity,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Shield,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react'
import { navigate, Link } from '../lib/router.jsx'
import { cn, DAY_MS, formatFull, relativeTime } from '../lib/utils.js'
import { MEMBER_ROLES, MEMBER_STATUSES, TASK_STATUSES } from '../data/seed.js'
import { useApp } from '../store/AppStore.jsx'
import { lookupCommunity, lookupMember } from '../store/selectors.js'
import { Button } from '../components/ui/Button.jsx'
import { Avatar, Badge, Metric, OutlineBadge, TableShell, Td, Th, Tr } from '../components/ui/Data.jsx'
import { Card, CardBody, CardHeader, MetaRow, PageHeader } from '../components/ui/Surface.jsx'
import { Field, Input, Select, Textarea, isEmail, required, validate } from '../components/ui/Form.jsx'
import { Tabs } from '../components/ui/Navigation.jsx'
import { ConfirmDialog, Dialog, Disclosure, Menu } from '../components/ui/Overlay.jsx'
import { EmptyState } from '../components/ui/Feedback.jsx'
import { RankedBars } from '../components/ui/Charts.jsx'

const ROLE_TONE = { owner: 'accent', moderator: 'brand', member: 'neutral' }
const STATUS_LABEL = Object.fromEntries(MEMBER_STATUSES.map((s) => [s.key, s.label]))
const STATUS_TONE = Object.fromEntries(MEMBER_STATUSES.map((s) => [s.key, s.tone]))
const CONTENT_TONE = { draft: 'neutral', scheduled: 'warning', published: 'success' }
const DUE_TONE = { danger: 'text-danger', warning: 'text-warning', neutral: 'text-content-3' }
const roleLabel = (key) => MEMBER_ROLES.find((r) => r.key === key)?.label ?? key

const ACCENT_HUE = {
  brand: 212, accent: 348, 'chart-1': 225, 'chart-2': 348, 'chart-3': 168,
  'chart-4': 276, 'chart-5': 32, success: 150, warning: 38,
}
const communityHue = (community) => ACCENT_HUE[community?.accent] ?? 212

function ringStatus(member) {
  if (member.status === 'suspended') return 'suspended'
  if (member.online) return 'online'
  if (member.status === 'active' && Date.now() - new Date(member.lastActiveAt).getTime() < 2 * DAY_MS)
    return 'away'
  return 'offline'
}

function activityHref(entry) {
  switch (entry.targetKind) {
    case 'task':
      return `/tasks?task=${entry.targetId}`
    case 'content':
      return `/content/${entry.targetId}`
    case 'event':
      return `/events/${entry.targetId}`
    case 'member':
      return `/members/${entry.targetId}`
    default:
      return `/communities/${entry.targetId}`
  }
}

function activityTarget(state, entry) {
  const tables = {
    community: state.communities,
    member: state.members,
    task: state.tasks,
    content: state.content,
    event: state.events,
  }
  const row = (tables[entry.targetKind] || []).find((item) => item.id === entry.targetId)
  return row?.name || row?.title || entry.targetId
}

/** The role a person holds inside one community, derived from its roster. */
function communityRole(community, memberId) {
  if (community.ownerId === memberId) return 'Owner'
  if (community.moderatorIds.includes(memberId)) return 'Moderator'
  return 'Member'
}

/* ---------------------------------------------------------------- dialogs -- */

function EditProfileDialog({ member, onClose }) {
  const { actions } = useApp()
  const [form, setForm] = useState({
    name: member.name,
    handle: member.handle,
    email: member.email,
    title: member.title,
    location: member.location,
    bio: member.bio,
  })
  const [errors, setErrors] = useState({})
  const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))

  const save = () => {
    const found = validate(form, {
      name: (v) => required(v, 'Name'),
      handle: (v) => required(v, 'Handle'),
      email: (v) => required(v, 'Email') || isEmail(v),
    })
    if (Object.keys(found).length) {
      setErrors(found)
      return
    }
    actions.update('members', member.id, {
      name: form.name.trim(),
      handle: form.handle.trim().replace(/^@/, ''),
      email: form.email.trim(),
      title: form.title.trim(),
      location: form.location.trim(),
      bio: form.bio.trim(),
    })
    actions.notify('Profile updated', 'success')
    onClose()
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Edit profile"
      description="Changes save to the member record immediately."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" icon={CheckCircle2} onClick={save}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" error={errors.name} required>
          <Input data-autofocus value={form.name} onChange={update('name')} invalid={Boolean(errors.name)} />
        </Field>
        <Field label="Handle" error={errors.handle} required>
          <Input value={form.handle} onChange={update('handle')} invalid={Boolean(errors.handle)} />
        </Field>
        <Field label="Email" className="sm:col-span-2" error={errors.email} required>
          <Input type="email" value={form.email} onChange={update('email')} invalid={Boolean(errors.email)} />
        </Field>
        <Field label="Title">
          <Input value={form.title} onChange={update('title')} placeholder="e.g. Product Designer" />
        </Field>
        <Field label="Location">
          <Input value={form.location} onChange={update('location')} placeholder="e.g. Bandung, ID" />
        </Field>
        <Field label="Bio" className="sm:col-span-2" hint="Shown on the member's profile.">
          <Textarea rows={4} value={form.bio} onChange={update('bio')} />
        </Field>
      </div>
    </Dialog>
  )
}

/* -------------------------------------------------------------------- page -- */

export default function MemberDetailPage({ params, query }) {
  const { state, actions, currentMember } = useApp()
  const [editOpen, setEditOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const member = lookupMember(state, params.id)

  if (!member) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          title="Member not found"
          description="This person is no longer in the workspace — the record may have been removed."
          actions={
            <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/members')}>
              Back to members
            </Button>
          }
        />
        <EmptyState
          icon={Users}
          title={`No member with the id “${params.id}”`}
          body="Browse the full directory to find the person you were looking for."
          tone="brand"
          action={
            <Link
              to="/members"
              className="rounded-control bg-brand-fill px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-brand-fill-2"
            >
              Go to members
            </Link>
          }
        />
      </div>
    )
  }

  const isSelf = currentMember?.id === member.id
  const communities = member.communityIds
    .map((cid) => lookupCommunity(state, cid))
    .filter(Boolean)
  const activity = [...state.activity]
    .filter((a) => a.actorId === member.id)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
  const authoredContent = state.content.filter((c) => c.authorId === member.id)
  const assignedTasks = state.tasks.filter((t) => t.assigneeId === member.id)

  const daysSince = (Date.now() - new Date(member.lastActiveAt).getTime()) / DAY_MS

  const tab = ['overview', 'activity', 'content', 'tasks'].includes(query.get('tab'))
    ? query.get('tab')
    : 'overview'

  const setRole = (newRole) => {
    actions.update('members', member.id, { role: newRole })
    for (const community of communities) {
      if (community.ownerId === member.id) continue
      const has = community.moderatorIds.includes(member.id)
      if (newRole === 'moderator' && !has)
        actions.update('communities', community.id, { moderatorIds: [...community.moderatorIds, member.id] })
      else if (newRole !== 'moderator' && has)
        actions.update('communities', community.id, {
          moderatorIds: community.moderatorIds.filter((x) => x !== member.id),
        })
    }
    actions.notify(`${member.name} is now a ${roleLabel(newRole).toLowerCase()}`, 'success')
  }

  const rowMenu = [
    { label: 'Edit profile', icon: Pencil, onSelect: () => setEditOpen(true) },
    { divider: true },
    ...MEMBER_ROLES.filter((r) => r.key !== 'owner' && r.key !== member.role).map((r) => ({
      label: `Make ${r.label.toLowerCase()}`,
      icon: Shield,
      onSelect: () => setRole(r.key),
    })),
    { label: 'Message', icon: MessageSquare, onSelect: () => navigate('/messages') },
    { divider: true },
    {
      label: 'Suspend',
      icon: Ban,
      danger: true,
      disabled: member.status === 'suspended',
      onSelect: () =>
        setConfirm({
          title: `Suspend ${member.name}?`,
          body: 'They keep their history but lose access to every community until reinstated.',
          confirmLabel: 'Suspend member',
          run: () => {
            actions.update('members', member.id, { status: 'suspended' })
            actions.notify(`${member.name} suspended`, 'warning')
          },
        }),
    },
    ...(isSelf
      ? []
      : [
          {
            label: 'Remove from workspace',
            icon: Trash2,
            danger: true,
            onSelect: () => setRemoveOpen(true),
          },
        ]),
  ]

  const removeMember = () => {
    for (const cid of [...member.communityIds]) actions.memberLeave(member.id, cid)
    actions.remove('members', member.id)
    actions.notify(`${member.name} removed from the workspace`, 'danger')
    setRemoveOpen(false)
    navigate('/members')
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumb={
          <Link
            to="/members"
            className="mb-1 inline-flex items-center gap-1 text-[11px] text-content-2 hover:text-brand-content"
          >
            <ArrowLeft size={12} /> Members
          </Link>
        }
        title={<span className="flex items-center gap-2">{member.name}{isSelf && <Badge tone="brand">This is you</Badge>}</span>}
        description={
          <>
            @{member.handle}
            {member.title ? ` · ${member.title}` : ''}
            {member.location ? ` · ${member.location}` : ''}
          </>
        }
        meta={
          <>
            <Badge tone={ROLE_TONE[member.role]}>{roleLabel(member.role)}</Badge>
            <OutlineBadge tone={STATUS_TONE[member.status] ?? 'neutral'}>
              {STATUS_LABEL[member.status] ?? member.status}
            </OutlineBadge>
            <span className="text-[11px] text-content-3">Joined {formatFull(member.joinedAt)}</span>
            <span className="text-[11px] text-content-3">·</span>
            <span className={cn('text-[11px]', daysSince > 30 ? 'font-medium text-danger' : 'text-content-3')}>
              Active {relativeTime(member.lastActiveAt)}
            </span>
          </>
        }
        actions={
          <>
            <Button variant="secondary" icon={Pencil} onClick={() => setEditOpen(true)}>
              Edit profile
            </Button>
            <Menu
              label="Member actions"
              leading={<MoreHorizontal size={15} strokeWidth={1.9} />}
              items={rowMenu}
              align="right"
            />
          </>
        }
      />

      <div className="flex items-center gap-4">
        <Avatar name={member.name} hue={member.hue} size={16} status={ringStatus(member)} />
        <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-content-2">
          {member.bio || 'No bio has been written for this member yet.'}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        <Metric label="Level" value={member.level} hint="Community standing" icon={Shield} tone="brand" />
        <Metric label="Posts" value={member.contributions.posts} icon={FileText} tone="accent" />
        <Metric label="Comments" value={member.contributions.comments} icon={MessageSquare} tone="info" />
        <Metric label="Reactions" value={member.contributions.reactions} icon={UserCheck} tone="success" />
        <Metric label="Followers" value={member.followers} icon={Users} tone="brand" />
        <Metric label="Following" value={member.following} icon={Users} tone="info" />
        <Metric label="Communities" value={communities.length} icon={Activity} tone="accent" />
      </div>

      <Tabs
        value={tab}
        onChange={(key) => navigate(`/members/${member.id}${key === 'overview' ? '' : `?tab=${key}`}`)}
        items={[
          { key: 'overview', label: 'Overview' },
          { key: 'activity', label: 'Activity', count: activity.length },
          { key: 'content', label: 'Content', count: authoredContent.length },
          { key: 'tasks', label: 'Tasks', count: assignedTasks.length },
        ]}
      />

      {tab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Details" description="Everything on this person's record" icon={Users} />
            <CardBody>
              <dl className="m-0">
                <MetaRow label="Email">{member.email}</MetaRow>
                <MetaRow label="Handle">@{member.handle}</MetaRow>
                <MetaRow label="Role">
                  <Badge tone={ROLE_TONE[member.role]}>{roleLabel(member.role)}</Badge>
                </MetaRow>
                <MetaRow label="Status">
                  <OutlineBadge tone={STATUS_TONE[member.status] ?? 'neutral'}>
                    {STATUS_LABEL[member.status] ?? member.status}
                  </OutlineBadge>
                </MetaRow>
                <MetaRow label="Joined">{formatFull(member.joinedAt)}</MetaRow>
                <MetaRow label="Last active">
                  <span className={cn(daysSince > 30 && 'text-danger')}>{relativeTime(member.lastActiveAt)}</span>
                </MetaRow>
                <MetaRow label="Location">{member.location || '—'}</MetaRow>
                <MetaRow label="Title">{member.title || '—'}</MetaRow>
              </dl>
            </CardBody>
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader title="About" description="Written by the member" icon={Pencil} />
              <CardBody>
                <Disclosure summary={member.name.split(' ')[0] + "'s bio"} defaultOpen>
                  <p className="text-[13px] leading-relaxed text-content-2">
                    {member.bio || 'This member has not added a bio yet.'}
                  </p>
                </Disclosure>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Communities" description={`${communities.length} memberships`} icon={Activity} />
              <CardBody>
                {communities.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No communities yet"
                    body="Add this member to a community from the directory to get them started."
                    action={
                      <Button variant="outline" size="sm" onClick={() => navigate('/communities')}>
                        Browse communities
                      </Button>
                    }
                  />
                ) : (
                  <ul className="flex flex-col gap-1">
                    {communities.map((community) => (
                      <li key={community.id}>
                        <Link
                          to={`/communities/${community.id}`}
                          className="flex items-center gap-3 rounded-control px-2 py-2 transition-colors hover:bg-surface-2"
                        >
                          <Avatar name={community.name} hue={communityHue(community)} size={8} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium text-content">
                              {community.name}
                            </span>
                            <span className="block truncate text-[11px] text-content-3">
                              {community.category} · {community.memberIds.length} members
                            </span>
                          </span>
                          <Badge tone={communityRole(community, member.id) === 'Owner' ? 'accent' : communityRole(community, member.id) === 'Moderator' ? 'brand' : 'neutral'}>
                            {communityRole(community, member.id)}
                          </Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {tab === 'activity' && (
        <Card>
          <CardHeader title="Activity" description={`${activity.length} events in the recorded window`} icon={Activity} />
          <CardBody>
            {activity.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No recorded activity in the demo window"
                body="This member has not posted, commented or completed a tracked action since the log began."
                tone="brand"
              />
            ) : (
              <ol className="flex flex-col gap-0.5">
                {activity.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-center gap-2 rounded-control px-2 py-2.5 text-[13px] hover:bg-surface-2"
                  >
                    <span className="text-content-2">{entry.verb}</span>
                    <Link
                      to={activityHref(entry)}
                      className="font-medium text-brand-content underline-offset-2 hover:underline"
                    >
                      {activityTarget(state, entry)}
                    </Link>
                    <span className="ml-auto flex items-center gap-1.5 text-[11px] text-content-3">
                      <Clock size={12} /> {relativeTime(entry.at)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>
      )}

      {tab === 'content' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Published work" description={`${authoredContent.length} items`} icon={FileText} />
            <CardBody>
              {authoredContent.length === 0 ? (
                <EmptyState icon={FileText} title="Nothing authored yet" body="Content this member writes or publishes will be listed here." />
              ) : (
              <TableShell>
                <thead>
                  <tr>
                    <Th>Title</Th>
                    <Th>Status</Th>
                    <Th align="right">Views</Th>
                    <Th align="right">Likes</Th>
                    <Th align="right">Comments</Th>
                    <Th className="hidden sm:table-cell">Updated</Th>
                  </tr>
                </thead>
                <tbody>
                  {authoredContent.map((item) => (
                    <Tr key={item.id} onClick={() => navigate(`/content/${item.id}`)}>
                      <Td className="max-w-56 truncate font-medium">{item.title}</Td>
                      <Td>
                        <Badge tone={CONTENT_TONE[item.status] ?? 'neutral'}>
                          {item.status[0].toUpperCase() + item.status.slice(1)}
                        </Badge>
                      </Td>
                      <Td align="right" className="tnum">{item.metrics.views}</Td>
                      <Td align="right" className="tnum">{item.metrics.likes}</Td>
                      <Td align="right" className="tnum">{item.metrics.comments}</Td>
                      <Td className="hidden text-content-2 sm:table-cell">{relativeTime(item.updatedAt)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </TableShell>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Views by item" description="Most-viewed work first" icon={Activity} />
            <CardBody>
              {authoredContent.length === 0 ? (
                <p className="text-[13px] text-content-3">No performance data to rank yet.</p>
              ) : (
                <RankedBars
                  data={[...authoredContent]
                    .sort((a, b) => b.metrics.views - a.metrics.views)
                    .map((item) => ({ label: item.title, views: item.metrics.views }))}
                  valueKey="views"
                  labelKey="label"
                />
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {tab === 'tasks' && (
        <Card>
          <CardHeader title="Assigned tasks" description={`${assignedTasks.length} across all communities`} icon={CheckCircle2} />
          <CardBody>
            {assignedTasks.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Nothing assigned"
                body="Tasks routed to this member from the board will appear here, grouped by status."
                tone="success"
              />
            ) : (
              <div className="flex flex-col gap-4">
                {TASK_STATUSES.map((status) => {
                  const group = assignedTasks.filter((t) => t.status === status.key)
                  if (!group.length) return null
                  return (
                    <div key={status.key}>
                      <p className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold tracking-wide text-content-2 uppercase">
                        {status.label} · {group.length}
                      </p>
                      <ul className="flex flex-col gap-1">
                        {group.map((task) => {
                          const due = new Date(task.dueDate)
                          const overdue = task.status !== 'done' && due.getTime() < Date.now()
                          return (
                            <li
                              key={task.id}
                              className="flex flex-wrap items-center gap-3 rounded-control border border-line bg-surface-2 px-3 py-2"
                            >
                              <div className="min-w-0 flex-1">
                                <Link
                                  to={`/tasks?task=${task.id}`}
                                  className="block truncate text-[13px] font-medium text-content hover:text-brand-content hover:underline"
                                >
                                  {task.title}
                                </Link>
                                <span className="text-[11px] text-content-3">
                                  {lookupCommunity(state, task.communityId)?.name} ·{' '}
                                  <span className={cn(DUE_TONE[overdue ? 'danger' : 'neutral'], overdue && 'font-medium')}>
                                    {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                </span>
                              </div>
                              <Select
                                className="w-36"
                                value={task.status}
                                onChange={(event) => {
                                  const next = event.target.value
                                  actions.update('tasks', task.id, {
                                    status: next,
                                    completedAt: next === 'done' ? new Date().toISOString() : null,
                                  })
                                  actions.notify(`Moved “${task.title}” to ${TASK_STATUSES.find((s) => s.key === next)?.label}`, 'success')
                                }}
                              >
                                {TASK_STATUSES.map((s) => (
                                  <option key={s.key} value={s.key}>
                                    {s.label}
                                  </option>
                                ))}
                              </Select>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )
                })}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {editOpen && <EditProfileDialog member={member} onClose={() => setEditOpen(false)} />}

      <ConfirmDialog
        open={removeOpen}
        onCancel={() => setRemoveOpen(false)}
        onConfirm={removeMember}
        tone="danger"
        title={`Remove ${member.name}?`}
        body="They are detached from every community and their record is deleted from the workspace. This cannot be undone."
        confirmLabel="Remove from workspace"
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          confirm?.run?.()
          setConfirm(null)
        }}
        tone="danger"
        title={confirm?.title}
        body={confirm?.body}
        confirmLabel={confirm?.confirmLabel}
      />
    </div>
  )
}
