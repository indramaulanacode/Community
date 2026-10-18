import { useMemo, useState } from 'react'
import {
  Ban,
  Download,
  Eye,
  Filter,
  LayoutGrid,
  List,
  MoreHorizontal,
  Plus,
  Shield,
  Trash2,
  UserPlus,
  Users,
  UserX,
  X,
} from 'lucide-react'
import { navigate, Link } from '../lib/router.jsx'
import { cn, DAY_MS, downloadFile, matchesQuery, oneOf, relativeTime, toCsv, uid } from '../lib/utils.js'
import { MEMBER_ROLES, MEMBER_STATUSES } from '../data/seed.js'
import { useApp } from '../store/AppStore.jsx'
import { lookupCommunity, lookupMember, newMembersThisMonth } from '../store/selectors.js'
import { Button, IconButton } from '../components/ui/Button.jsx'
import {
  Avatar,
  AvatarStack,
  Badge,
  OutlineBadge,
  Pagination,
  SearchInput,
  TableShell,
  Td,
  Th,
  Tr,
  paginate,
} from '../components/ui/Data.jsx'
import { Card, PageHeader } from '../components/ui/Surface.jsx'
import { Checkbox, Field, Input, Select, isEmail, required, validate } from '../components/ui/Form.jsx'
import { FilterSelect, Segmented, Toolbar } from '../components/ui/Navigation.jsx'
import { ConfirmDialog, Dialog, Menu } from '../components/ui/Overlay.jsx'
import { EmptyState, StatusMessage } from '../components/ui/Feedback.jsx'

/* ------------------------------------------------------------------ meta --- */

const ROLE_TONE = { owner: 'accent', moderator: 'brand', member: 'neutral' }

const STATUS_LABEL = Object.fromEntries(MEMBER_STATUSES.map((s) => [s.key, s.label]))
const STATUS_TONE = Object.fromEntries(MEMBER_STATUSES.map((s) => [s.key, s.tone]))
const STATUS_KEYS = MEMBER_STATUSES.map((s) => s.key)

const ACCENT_HUE = {
  brand: 212,
  accent: 348,
  'chart-1': 225,
  'chart-2': 348,
  'chart-3': 168,
  'chart-4': 276,
  'chart-5': 32,
  success: 150,
  warning: 38,
}

const communityHue = (community) => ACCENT_HUE[community?.accent] ?? 212

const roleLabel = (key) => MEMBER_ROLES.find((r) => r.key === key)?.label ?? key

function ringStatus(member) {
  if (member.status === 'suspended') return 'suspended'
  if (member.online) return 'online'
  if (member.status === 'active' && Date.now() - new Date(member.lastActiveAt).getTime() < 2 * DAY_MS)
    return 'away'
  return 'offline'
}

/* -------------------------------------------------------------- mutations -- */

/**
 * Change a member's global role and keep every community roster consistent:
 * moderators are mirrored into each community's moderatorIds (never the owner),
 * and removed again on demotion. Works on the pre-dispatch snapshot so a batch
 * touching the same community merges into one correct write.
 */
function applyRole(state, actions, ids, newRole) {
  actions.updateMany('members', ids, { role: newRole })

  const patchByCommunity = new Map()
  for (const id of ids) {
    const member = lookupMember(state, id)
    if (!member) continue
    for (const cid of member.communityIds) {
      const community = lookupCommunity(state, cid)
      if (!community || community.ownerId === id) continue
      const working = patchByCommunity.get(cid) ?? [...community.moderatorIds]
      const has = working.includes(id)
      if (newRole === 'moderator' && !has) working.push(id)
      else if (newRole !== 'moderator' && has) working.splice(working.indexOf(id), 1)
      patchByCommunity.set(cid, working)
    }
  }

  let touched = 0
  for (const [cid, mods] of patchByCommunity) {
    const original = lookupCommunity(state, cid).moderatorIds
    if (mods.length !== original.length || mods.some((x, i) => x !== original[i])) {
      actions.update('communities', cid, { moderatorIds: mods })
      touched += 1
    }
  }

  const label = MEMBER_ROLES.find((r) => r.key === newRole)?.label ?? newRole
  const plural = ids.length === 1 ? 'member' : 'members'
  actions.notify(
    newRole === 'moderator' && touched
      ? `Promoted ${ids.length} ${plural} to moderator and added them to ${touched} moderation team${touched === 1 ? '' : 's'}`
      : `Set ${ids.length} ${plural} to ${label}`,
    'success',
  )
}

/** Detach a member from every community, then delete the record — no dangling ids. */
function removeMembers(state, actions, ids) {
  for (const id of ids) {
    const member = lookupMember(state, id)
    if (member) for (const cid of [...member.communityIds]) actions.memberLeave(id, cid)
    actions.remove('members', id)
  }
}

function handleFrom(name) {
  const [first, last = ''] = String(name).toLowerCase().split(/\s+/)
  return `${first}${last[0] || ''}`.replace(/[^a-z0-9]/g, '')
}

/* ------------------------------------------------------------ csv export --- */

/* BOM keeps Excel from mangling the accented names in the roster. */
const downloadCsv = (filename, rows) =>
  downloadFile(filename, `\ufeff${toCsv(rows)}`, 'text/csv;charset=utf-8;')

/* --------------------------------------------------------------- controls -- */

function SelectBox({ checked, onChange, label }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      aria-label={label}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => onChange(event.target.checked)}
      className="size-4 shrink-0 cursor-pointer rounded border-line-2 accent-[var(--brand-fill)]"
    />
  )
}

function FilterChip({ children, onClear }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand-soft py-0.5 pr-1 pl-2.5 text-[11px] font-medium text-brand-content">
      {children}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Clear ${children}`}
        className="flex size-4 items-center justify-center rounded-full transition-colors hover:bg-brand/20"
      >
        <X size={11} />
      </button>
    </span>
  )
}

/* ---------------------------------------------------------------- dialogs -- */

function InviteDialog({ onClose }) {
  const { state, actions } = useApp()
  const [form, setForm] = useState({ name: '', email: '', title: '', role: 'member' })
  const [communityIds, setCommunityIds] = useState([])
  const [errors, setErrors] = useState({})

  const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))

  const toggleCommunity = (id) =>
    setCommunityIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )

  const submit = () => {
    const found = validate(form, {
      name: (v) => required(v, 'Name'),
      email: (v) => required(v, 'Email') || isEmail(v),
    })
    if (Object.keys(found).length) {
      setErrors(found)
      return
    }

    const taken = new Set(state.members.map((m) => m.handle))
    let handle = handleFrom(form.name)
    let n = 1
    while (taken.has(handle)) handle = `${handleFrom(form.name)}${n++}`

    const hues = [212, 348, 168, 276, 32, 190, 8, 128]
    const id = uid('m')
    actions.add('members', {
      id,
      name: form.name.trim(),
      handle,
      email: form.email.trim(),
      title: form.title.trim() || 'Community member',
      location: '',
      bio: '',
      role: form.role,
      status: 'invited',
      joinedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      online: false,
      hue: hues[form.name.length % hues.length],
      level: 1,
      followers: 0,
      following: 0,
      contributions: { posts: 0, comments: 0, reactions: 0 },
      communityIds: [],
    })
    for (const cid of communityIds) actions.memberJoin(id, cid)

    actions.notify(
      communityIds.length
        ? `Invitation sent to ${form.name.trim()} — added to ${communityIds.length} communit${communityIds.length === 1 ? 'y' : 'ies'}`
        : `Invitation sent to ${form.name.trim()}`,
      'success',
    )
    onClose()
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Invite members"
      description="They receive an invitation and appear in the directory as Invited until they accept."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" icon={UserPlus} onClick={submit}>
            Send invitation
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Full name" error={errors.name} required>
          <Input
            data-autofocus
            value={form.name}
            onChange={update('name')}
            placeholder="e.g. Asep Nugraha"
            invalid={Boolean(errors.name)}
          />
        </Field>
        <Field label="Email" hint="The invitation is delivered here." error={errors.email} required>
          <Input
            type="email"
            value={form.email}
            onChange={update('email')}
            placeholder="name@studio.com"
            invalid={Boolean(errors.email)}
          />
        </Field>
        <Field label="Title" hint="Optional — shown under their name.">
          <Input
            value={form.title}
            onChange={update('title')}
            placeholder="e.g. Product Designer"
          />
        </Field>
        <Field label="Role">
          <Select value={form.role} onChange={update('role')}>
            {MEMBER_ROLES.map((role) => (
              <option key={role.key} value={role.key}>
                {role.label}
              </option>
            ))}
          </Select>
        </Field>
        <div>
          <p className="mb-2 text-xs font-medium text-content-2">Communities to add them to</p>
          <div className="flex flex-col gap-2 rounded-card border border-line bg-surface-2 p-3">
            {state.communities.map((community) => (
              <Checkbox
                key={community.id}
                label={community.name}
                description={`${community.memberIds.length} members · ${community.category}`}
                checked={communityIds.includes(community.id)}
                onChange={() => toggleCommunity(community.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  )
}

function RoleDialog({ ids, onClose }) {
  const { state, actions } = useApp()
  const [role, setRole] = useState('member')

  const apply = () => {
    applyRole(state, actions, ids, role)
    onClose()
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title={`Change role for ${ids.length} member${ids.length === 1 ? '' : 's'}`}
      description="Promoting to moderator also adds the member to the moderation team of every community they belong to."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" icon={Shield} onClick={apply}>
            Apply role
          </Button>
        </>
      }
    >
      <Field label="New role" hint="Owner is reserved for whoever created a community and is not set here.">
        <Select value={role} onChange={(event) => setRole(event.target.value)}>
          {MEMBER_ROLES.filter((r) => r.key !== 'owner').map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </Select>
      </Field>
    </Dialog>
  )
}

function AddCommunityDialog({ ids, onClose }) {
  const { state, actions } = useApp()
  const [chosen, setChosen] = useState([])

  const toggle = (id) =>
    setChosen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const confirm = () => {
    if (!chosen.length) {
      actions.notify('Pick at least one community', 'warning')
      return
    }
    for (const id of ids) for (const cid of chosen) actions.memberJoin(id, cid)
    actions.notify(
      `Added ${ids.length} member${ids.length === 1 ? '' : 's'} to ${chosen.length} communit${chosen.length === 1 ? 'y' : 'ies'}`,
      'success',
    )
    onClose()
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Add ${ids.length} member${ids.length === 1 ? '' : 's'} to communities`}
      description="Membership is written to both the member record and the community roster."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" icon={Plus} onClick={confirm} disabled={!chosen.length}>
            Add to {chosen.length || ''} communit{chosen.length === 1 ? 'y' : 'ies'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2.5">
        {state.communities.map((community) => (
          <Checkbox
            key={community.id}
            label={community.name}
            description={`${community.memberIds.length} members · ${community.category}`}
            checked={chosen.includes(community.id)}
            onChange={() => toggle(community.id)}
          />
        ))}
      </div>
    </Dialog>
  )
}

/* ------------------------------------------------------------------- page -- */

export default function MembersPage({ query }) {
  const { state, actions } = useApp()

  const [search, setSearch] = useState(() => query.get('q') || '')
  const [role, setRole] = useState('all')
  const [status, setStatus] = useState(() => {
    const initial = query.get('status')
    return STATUS_KEYS.includes(initial) ? initial : 'all'
  })
  const [community, setCommunity] = useState(() => {
    const initial = query.get('community')
    return state.communities.some((c) => c.id === initial) ? initial : 'all'
  })
  const [sort, setSort] = useState('recent')
  const [view, setView] = useState(() => oneOf(query.get('view'), ['table', 'grid'], 'table'))
  const [page, setPage] = useState(1)

  const [selected, setSelected] = useState(() => new Set())
  const [inviteOpen, setInviteOpen] = useState(false)
  const [roleFor, setRoleFor] = useState(null)
  const [addFor, setAddFor] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const pageSize = 12

  const filtersActive =
    Boolean(search) || role !== 'all' || status !== 'all' || community !== 'all'

  const filtered = useMemo(() => {
    const comparators = {
      recent: (a, b) => new Date(b.joinedAt) - new Date(a.joinedAt),
      active: (a, b) => new Date(b.lastActiveAt) - new Date(a.lastActiveAt),
      name: (a, b) => a.name.localeCompare(b.name),
      level: (a, b) => b.level - a.level,
    }
    return state.members
      .filter((member) => {
        if (!matchesQuery(member, search, ['name', 'handle', 'email', 'title', 'location']))
          return false
        if (role !== 'all' && member.role !== role) return false
        if (status !== 'all' && member.status !== status) return false
        if (community !== 'all' && !member.communityIds.includes(community)) return false
        return true
      })
      .sort(comparators[sort])
  }, [state.members, search, role, status, community, sort])

  const { pageCount, page: current, slice } = paginate(filtered, page, pageSize)

  const selectedIds = state.members.filter((m) => selected.has(m.id)).map((m) => m.id)
  const visibleIds = slice.map((m) => m.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id))

  const clearFilters = () => {
    setSearch('')
    setRole('all')
    setStatus('all')
    setCommunity('all')
    setPage(1)
  }

  const toggleVisible = (checked) =>
    setSelected((prev) => {
      const next = new Set(prev)
      visibleIds.forEach((id) => (checked ? next.add(id) : next.delete(id)))
      return next
    })

  const toggleOne = (id, checked) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })

  const exportCsv = () => {
    const rows = [
      ['Name', 'Handle', 'Email', 'Title', 'Location', 'Role', 'Status', 'Level', 'Communities', 'Joined', 'Last active'],
      ...filtered.map((m) => [
        m.name,
        `@${m.handle}`,
        m.email,
        m.title,
        m.location,
        m.role,
        m.status,
        m.level,
        m.communityIds
          .map((cid) => lookupCommunity(state, cid)?.name)
          .filter(Boolean)
          .join(' | '),
        new Date(m.joinedAt).toISOString().slice(0, 10),
        new Date(m.lastActiveAt).toISOString().slice(0, 10),
      ]),
    ]
    downloadCsv('members.csv', rows)
    actions.notify(`Exported ${filtered.length} member${filtered.length === 1 ? '' : 's'} to CSV`, 'info')
  }

  const bulkStatus = (value, message) => {
    actions.updateMany('members', selectedIds, { status: value })
    actions.notify(message, 'success')
    setSelected(new Set())
  }

  const rowItems = (member) => [
    { label: 'Open profile', icon: Eye, onSelect: () => navigate(`/members/${member.id}`) },
    { label: 'Change role', icon: Shield, onSelect: () => setRoleFor([member.id]) },
    {
      label: 'Mark inactive',
      icon: UserX,
      onSelect: () => {
        actions.update('members', member.id, { status: 'inactive' })
        actions.notify(`${member.name} marked inactive`, 'info')
      },
    },
    { divider: true },
    {
      label: 'Suspend',
      icon: Ban,
      danger: true,
      onSelect: () =>
        setConfirm({
          kind: 'suspend',
          ids: [member.id],
          title: `Suspend ${member.name}?`,
          body: 'They keep their history but lose access to every community until reinstated.',
          confirmLabel: 'Suspend member',
        }),
    },
    {
      label: 'Remove from workspace',
      icon: Trash2,
      danger: true,
      onSelect: () =>
        setConfirm({
          kind: 'remove',
          ids: [member.id],
          title: `Remove ${member.name}?`,
          body: 'This detaches them from every community and deletes their directory record. This cannot be undone.',
          confirmLabel: 'Remove member',
        }),
    },
  ]

  const onConfirm = () => {
    if (!confirm) return
    if (confirm.kind === 'suspend') {
      actions.updateMany('members', confirm.ids, { status: 'suspended' })
      actions.notify(`${confirm.ids.length} member${confirm.ids.length === 1 ? '' : 's'} suspended`, 'warning')
    } else if (confirm.kind === 'remove') {
      removeMembers(state, actions, confirm.ids)
      setSelected(new Set())
      actions.notify(`${confirm.ids.length} member${confirm.ids.length === 1 ? '' : 's'} removed from the workspace`, 'danger')
    }
    setConfirm(null)
  }

  const onlineNow = state.members.filter((m) => m.online).length
  const newMonth = newMembersThisMonth(state).length

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Members"
        description={`${state.members.length} people across ${state.communities.length} communities · ${onlineNow} online now · ${newMonth} joined this month`}
        actions={
          <>
            <Button variant="secondary" icon={Download} onClick={exportCsv}>
              Export CSV
            </Button>
            <Button variant="primary" icon={Plus} onClick={() => setInviteOpen(true)}>
              Invite members
            </Button>
          </>
        }
      />

      <Toolbar>
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value)
            setPage(1)
          }}
          label="Members"
          placeholder="Search name, handle, email, title or location"
          resultCount={filtered.length}
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
            ...MEMBER_ROLES.map((r) => ({ value: r.key, label: r.label })),
          ]}
        />
        <FilterSelect
          label="Status"
          value={status}
          onChange={(value) => {
            setStatus(value)
            setPage(1)
          }}
          options={[
            { value: 'all', label: 'All statuses' },
            ...STATUS_KEYS.map((key) => ({ value: key, label: STATUS_LABEL[key] })),
          ]}
        />
        <FilterSelect
          label="Community"
          value={community}
          onChange={(value) => {
            setCommunity(value)
            setPage(1)
          }}
          options={[
            { value: 'all', label: 'All communities' },
            ...state.communities.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <FilterSelect
          label="Sort"
          value={sort}
          onChange={setSort}
          options={[
            { value: 'recent', label: 'Recently joined' },
            { value: 'active', label: 'Most active' },
            { value: 'name', label: 'Name A–Z' },
            { value: 'level', label: 'Level' },
          ]}
        />
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { key: 'table', label: 'Table', icon: List },
            { key: 'grid', label: 'Grid', icon: LayoutGrid },
          ]}
        />
      </Toolbar>

      {filtersActive && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-content-3">
            <Filter size={12} /> Filters
          </span>
          {search && <FilterChip onClear={() => setSearch('')}>“{search}”</FilterChip>}
          {role !== 'all' && (
            <FilterChip onClear={() => setRole('all')}>
              {MEMBER_ROLES.find((r) => r.key === role)?.label}
            </FilterChip>
          )}
          {status !== 'all' && (
            <FilterChip onClear={() => setStatus('all')}>{STATUS_LABEL[status]}</FilterChip>
          )}
          {community !== 'all' && (
            <FilterChip onClear={() => setCommunity('all')}>
              {lookupCommunity(state, community)?.name}
            </FilterChip>
          )}
          <Button variant="ghost" size="xs" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-panel border border-brand/40 bg-brand-soft/40 p-2.5">
          <StatusMessage tone="success">
            {selectedIds.length} selected
          </StatusMessage>
          <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
          <Button
            size="sm"
            variant="secondary"
            onClick={() => bulkStatus('active', `${selectedIds.length} member${selectedIds.length === 1 ? '' : 's'} set to active`)}
          >
            Set status to active
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={UserPlus}
            onClick={() => bulkStatus('invited', `Re-invited ${selectedIds.length} member${selectedIds.length === 1 ? '' : 's'}`)}
          >
            Invite again
          </Button>
          <Button size="sm" variant="secondary" icon={Shield} onClick={() => setRoleFor(selectedIds)}>
            Change role
          </Button>
          <Button size="sm" variant="secondary" icon={Plus} onClick={() => setAddFor(selectedIds)}>
            Add to community
          </Button>
          <Button
            size="sm"
            variant="danger-ghost"
            icon={Trash2}
            onClick={() =>
              setConfirm({
                kind: 'remove',
                ids: selectedIds,
                title: `Remove ${selectedIds.length} member${selectedIds.length === 1 ? '' : 's'}?`,
                body: 'Each one is detached from every community before the record is deleted. This cannot be undone.',
                confirmLabel: 'Remove from workspace',
              })
            }
          >
            Remove from workspace
          </Button>
          <div className="ml-auto">
            <IconButton
              icon={X}
              label="Clear selection"
              size="sm"
              onClick={() => setSelected(new Set())}
            />
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No members match these filters"
          body="Try a different status, community or search term. Everyone in the workspace is listed once filters are cleared."
          tone="brand"
          action={
            <Button variant="secondary" icon={X} onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : view === 'grid' ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {slice.map((member) => (
              <Card key={member.id} interactive className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <Avatar name={member.name} hue={member.hue} size={12} status={ringStatus(member)} />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/members/${member.id}`}
                      className="block truncate text-sm font-semibold text-content hover:text-brand-content"
                    >
                      {member.name}
                    </Link>
                    <p className="truncate text-[11px] text-content-3">@{member.handle}</p>
                  </div>
                </div>
                <p className="line-clamp-1 text-[11px] text-content-2">{member.title}</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone={ROLE_TONE[member.role]}>{roleLabel(member.role)}</Badge>
                  <OutlineBadge tone={STATUS_TONE[member.status] ?? 'neutral'}>
                    {STATUS_LABEL[member.status] ?? member.status}
                  </OutlineBadge>
                </div>
                <div className="flex items-center gap-3 border-t border-line pt-2.5 text-[11px] text-content-2">
                  <span className="flex items-center gap-1">
                    <Shield size={12} className="text-content-3" /> Level {member.level}
                  </span>
                  <span className="tnum">{member.contributions.posts} posts</span>
                  <span className="tnum">{member.contributions.comments} comments</span>
                </div>
                <div className="flex items-center justify-between">
                  <AvatarStack
                    people={member.communityIds.map((cid) => {
                      const c = lookupCommunity(state, cid)
                      return c ? { id: c.id, name: c.name, hue: communityHue(c) } : null
                    }).filter(Boolean)}
                    size={6}
                  />
                  <Link
                    to={`/members/${member.id}`}
                    className="text-[11px] font-medium text-brand-content hover:underline"
                  >
                    View profile
                  </Link>
                </div>
              </Card>
            ))}
          </div>
          <Pagination
            page={current}
            pageCount={pageCount}
            total={filtered.length}
            pageSize={pageSize}
            onChange={setPage}
          />
        </>
      ) : (
        <Card>
          <TableShell>
            <thead>
              <tr>
                <Th className="w-10">
                  <SelectBox
                    checked={allVisibleSelected}
                    onChange={toggleVisible}
                    label="Select all members on this page"
                  />
                </Th>
                <Th>Member</Th>
                <Th className="hidden lg:table-cell">Title</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th className="hidden xl:table-cell">Communities</Th>
                <Th className="hidden md:table-cell">Joined</Th>
                <Th className="hidden sm:table-cell">Last active</Th>
                <Th align="right" className="w-12" />
              </tr>
            </thead>
            <tbody>
              {slice.map((member) => {
                const daysSince = (Date.now() - new Date(member.lastActiveAt).getTime()) / DAY_MS
                const people = member.communityIds
                  .map((cid) => {
                    const c = lookupCommunity(state, cid)
                    return c ? { id: c.id, name: c.name, hue: communityHue(c) } : null
                  })
                  .filter(Boolean)
                return (
                  <Tr key={member.id} selected={selected.has(member.id)}>
                    <Td>
                      <SelectBox
                        checked={selected.has(member.id)}
                        onChange={(checked) => toggleOne(member.id, checked)}
                        label={`Select ${member.name}`}
                      />
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={member.name} hue={member.hue} size={9} status={ringStatus(member)} />
                        <div className="min-w-0">
                          <Link
                            to={`/members/${member.id}`}
                            className="block max-w-40 truncate text-[13px] font-medium text-content hover:text-brand-content hover:underline"
                          >
                            {member.name}
                          </Link>
                          <span className="block truncate text-[11px] text-content-3">@{member.handle}</span>
                        </div>
                      </div>
                    </Td>
                    <Td className="hidden max-w-40 truncate lg:table-cell text-content-2">{member.title}</Td>
                    <Td>
                      <Badge tone={ROLE_TONE[member.role]}>{roleLabel(member.role)}</Badge>
                    </Td>
                    <Td>
                      <OutlineBadge tone={STATUS_TONE[member.status] ?? 'neutral'}>
                        {STATUS_LABEL[member.status] ?? member.status}
                      </OutlineBadge>
                    </Td>
                    <Td className="hidden xl:table-cell">
                      {people.length ? <AvatarStack people={people} size={6} max={4} /> : <span className="text-content-3">None</span>}
                    </Td>
                    <Td className="hidden text-content-2 md:table-cell tnum">{new Date(member.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Td>
                    <Td className={cn('hidden sm:table-cell', daysSince > 30 ? 'font-medium text-danger' : 'text-content-2')}>
                      {relativeTime(member.lastActiveAt)}
                    </Td>
                    <Td align="right">
                      <Menu
                        label={`Actions for ${member.name}`}
                        leading={<MoreHorizontal size={15} strokeWidth={1.9} />}
                        items={rowItems(member)}
                        align="right"
                      />
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </TableShell>
          <div className="pt-4">
            <Pagination
              page={current}
              pageCount={pageCount}
              total={filtered.length}
              pageSize={pageSize}
              onChange={setPage}
            />
          </div>
        </Card>
      )}

      {inviteOpen && <InviteDialog onClose={() => setInviteOpen(false)} />}
      {roleFor && <RoleDialog ids={roleFor} onClose={() => setRoleFor(null)} />}
      {addFor && <AddCommunityDialog ids={addFor} onClose={() => setAddFor(null)} />}
      <ConfirmDialog
        open={Boolean(confirm)}
        onCancel={() => setConfirm(null)}
        onConfirm={onConfirm}
        title={confirm?.title}
        body={confirm?.body}
        confirmLabel={confirm?.confirmLabel}
        tone="danger"
      />
    </div>
  )
}
