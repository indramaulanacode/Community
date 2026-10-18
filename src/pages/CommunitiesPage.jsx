import { useState } from 'react'
import {
  CalendarPlus,
  Copy,
  Eye,
  Lock,
  Plus,
  Star,
  Users,
} from 'lucide-react'
import { navigate, Link } from '../lib/router.jsx'
import { appUrl, cn, copyText, formatMonth, matchesQuery, oneOf, slugify, uid } from '../lib/utils.js'
import { COMMUNITY_CATEGORIES } from '../data/seed.js'
import { useApp } from '../store/AppStore.jsx'
import { communitySummaries } from '../store/selectors.js'
import { Button, IconButton } from '../components/ui/Button.jsx'
import {
  Avatar,
  AvatarStack,
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
import { Card, PageHeader } from '../components/ui/Surface.jsx'
import { FilterSelect, Segmented, Toolbar } from '../components/ui/Navigation.jsx'
import { Dialog, Menu } from '../components/ui/Overlay.jsx'
import { EmptyState } from '../components/ui/Feedback.jsx'
import { Field, Input, Select, Textarea, required, validate } from '../components/ui/Form.jsx'

const SORTS = [
  { value: 'members', label: 'Most members' },
  { value: 'engagement', label: 'Highest engagement' },
  { value: 'attention', label: 'Needs attention' },
  { value: 'recent', label: 'Recently created' },
]

/** The accent keys the seed uses, each paired with the avatar hue it implies. */
const ACCENTS = [
  { key: 'brand', hue: 212 },
  { key: 'accent', hue: 348 },
  { key: 'chart-3', hue: 168 },
  { key: 'chart-4', hue: 276 },
  { key: 'chart-5', hue: 32 },
  { key: 'chart-1', hue: 224 },
  { key: 'success', hue: 142 },
  { key: 'warning', hue: 40 },
]

const hueForCommunity = (accent) => ACCENTS.find((a) => a.key === accent)?.hue ?? 212

const CHANNEL_BLUEPRINT = [
  { suffix: 'general', kind: 'chat' },
  { suffix: 'announcements', kind: 'announcement' },
  { suffix: 'resources', kind: 'resources' },
]

const EMPTY_FORM = {
  name: '',
  category: COMMUNITY_CATEGORIES[0],
  visibility: 'public',
  about: '',
  tags: '',
}

function needsAttention(row) {
  return row.stats.openTasks * 3 + row.stats.unread * 2 - row.stats.engagementRate
}

function compare(sort) {
  if (sort === 'engagement') return (a, b) => b.stats.engagementRate - a.stats.engagementRate
  if (sort === 'attention') {
    // Open work and unread channels first; a room nobody engages with is the problem.
    return (a, b) => needsAttention(b) - needsAttention(a) || b.stats.openTasks - a.stats.openTasks
  }
  if (sort === 'recent') {
    return (a, b) => new Date(b.community.createdAt) - new Date(a.community.createdAt)
  }
  return (a, b) => b.stats.members - a.stats.members
}

function NewCommunityDialog({ open, onClose }) {
  const { state, actions, currentMember } = useApp()
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  const set = (key) => (event) => {
    const value = event.target.value
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev))
  }

  const close = () => {
    setForm(EMPTY_FORM)
    setErrors({})
    onClose()
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

    const id = uid('c')
    const name = form.name.trim()
    const base = slugify(name) || 'community'
    const tags = form.tags
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
    const founding = state.members
      .filter((m) => m.id !== currentMember.id && m.status === 'active' && m.role === 'moderator')
      .slice(0, 3)
    const memberIds = [currentMember.id, ...founding.map((m) => m.id)]

    actions.add('communities', {
      id,
      name,
      category: form.category,
      visibility: form.visibility,
      accent: ACCENTS[state.communities.length % ACCENTS.length].key,
      about: form.about.trim(),
      tags: tags.length ? tags : [form.category.toLowerCase(), base.split('-')[0]],
      ownerId: currentMember.id,
      moderatorIds: founding.slice(0, 2).map((m) => m.id),
      memberIds,
      channels: CHANNEL_BLUEPRINT.map((channel, index) => ({
        id: `${id}-ch-${index + 1}`,
        name: index === 0 ? base : `${base}-${channel.suffix}`,
        kind: channel.kind,
        unread: 0,
      })),
      createdAt: new Date().toISOString(),
      engagementRate: 0,
      isFavorite: true,
    })

    // One dispatch per roster member keeps `member.communityIds` in sync.
    memberIds.forEach((memberId) => actions.memberJoin(memberId, id))

    actions.notify(`“${name}” is live`, 'success')
    close()
    navigate(`/communities/${id}`)
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title="New community"
      description="Opens with three channels, you as the owner, and the roster seeded from your active moderators."
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" icon={Plus} onClick={submit}>
            Create community
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
        <Field
          label="Community name"
          required
          error={errors.name}
          hint="Used in the directory, search and the channel naming prefix."
        >
          <Input
            value={form.name}
            onChange={set('name')}
            invalid={Boolean(errors.name)}
            placeholder="Design Systems Circle"
            data-autofocus
          />
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
          <Field label="Visibility" hint="Private rooms still show their name in search results.">
            <Select value={form.visibility} onChange={set('visibility')}>
              <option value="public">Public — anyone can join</option>
              <option value="private">Private — invitation only</option>
            </Select>
          </Field>
        </div>

        <Field
          label="About"
          required
          error={errors.about}
          hint="Say who the room is for and what members are expected to do."
        >
          <Textarea
            value={form.about}
            onChange={set('about')}
            invalid={Boolean(errors.about)}
            rows={4}
            placeholder="Weekly critique for people who ship interfaces. Two rounds of feedback per submission, no client names."
          />
        </Field>

        <Field label="Tags" hint="Comma separated. Searched alongside the name and about text.">
          <Input value={form.tags} onChange={set('tags')} placeholder="tokens, critique, portfolio" />
        </Field>
      </form>
    </Dialog>
  )
}

function StatCell({ label, value, tone }) {
  return (
    <div className="min-w-0 px-1.5 py-2 text-center">
      <p className="truncate text-[9px] font-semibold tracking-wide text-content-3 uppercase">{label}</p>
      <p className={cn('mt-0.5 text-[13px] font-semibold tnum', tone || 'text-content')}>{value}</p>
    </div>
  )
}

function VisibilityBadge({ visibility }) {
  return (
    <OutlineBadge tone={visibility === 'public' ? 'brand' : 'neutral'}>
      {visibility === 'public' ? <Eye size={10} strokeWidth={2.2} /> : <Lock size={10} strokeWidth={2.2} />}
      {visibility}
    </OutlineBadge>
  )
}

function CommunityCard({ row, menu, onFavorite }) {
  const { community, stats } = row
  return (
    <Card interactive className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Avatar name={community.name} hue={hueForCommunity(community.accent)} size={10} />
        <div className="min-w-0 flex-1">
          <Link to={`/communities/${community.id}`}>
            <span className="block truncate text-[14px] font-semibold text-content hover:text-brand">
              {community.name}
            </span>
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral">{community.category}</Badge>
            <VisibilityBadge visibility={community.visibility} />
          </div>
        </div>
        <IconButton
          icon={Star}
          size="sm"
          active={community.isFavorite}
          label={community.isFavorite ? `Unfavourite ${community.name}` : `Favourite ${community.name}`}
          className={cn(community.isFavorite && 'text-warning')}
          onClick={() => onFavorite(community)}
        />
      </div>

      <p className="line-clamp-2 min-h-8 text-[12px] leading-relaxed text-content-2">{community.about}</p>

      <div className="flex items-end justify-between gap-3">
        <span className="min-w-0">
          {stats.moderators.length > 0 ? (
            <>
              <AvatarStack people={stats.moderators} max={4} size={6} className="mb-1" />
              <span className="block truncate text-[10px] text-content-3">
                {stats.moderators.length} moderator{stats.moderators.length === 1 ? '' : 's'} · owned by{' '}
                {stats.owner?.name || 'unassigned'}
              </span>
            </>
          ) : (
            <span className="block text-[10px] text-content-3">
              No moderators yet · owned by {stats.owner?.name || 'unassigned'}
            </span>
          )}
        </span>
        <Menu items={menu} />
      </div>

      <dl className="grid grid-cols-4 divide-x divide-line rounded-control border border-line bg-surface-2">
        <StatCell label="Members" value={stats.members} />
        <StatCell label="Online" value={stats.online} tone={stats.online ? 'text-success' : undefined} />
        <StatCell label="Events" value={stats.upcomingEvents} />
        <StatCell label="Open tasks" value={stats.openTasks} tone={stats.openTasks ? 'text-warning' : undefined} />
      </dl>

      <div className="flex items-center gap-2">
        <Progress
          value={stats.engagementRate}
          tone={stats.engagementRate > 60 ? 'success' : stats.engagementRate > 35 ? 'brand' : 'warning'}
          label={`${stats.activeThisWeek} of ${stats.members} members active this week`}
        />
        <span className="shrink-0 text-[11px] font-medium text-content-2 tnum">
          {stats.engagementRate}% engaged
        </span>
      </div>
    </Card>
  )
}

export default function CommunitiesPage({ query }) {
  const { state, actions } = useApp()
  const params = query || new URLSearchParams()
  const [search, setSearch] = useState(() => params.get('q') || '')
  const [category, setCategory] = useState(() =>
    oneOf(params.get('category'), ['all', ...COMMUNITY_CATEGORIES], 'all'),
  )
  const [sort, setSort] = useState('members')
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)
  // A shared ?view= link wins over the stored preference, but only until the
  // visitor flips the toggle themselves.
  const [viewLink, setViewLink] = useState(() => oneOf(params.get('view'), ['grid', 'table'], null))
  const view = viewLink ?? (state.prefs.communitiesView === 'table' ? 'table' : 'grid')

  const rows = communitySummaries(state)
    .filter(
      ({ community }) =>
        (category === 'all' || community.category === category) &&
        matchesQuery(community, search, ['name', 'about', 'tags']),
    )
    .sort(compare(sort))

  const pageSize = view === 'grid' ? 6 : 10
  const paged = paginate(rows, page, pageSize)
  const filtersOn = Boolean(search.trim()) || category !== 'all'

  const clearFilters = () => {
    setSearch('')
    setCategory('all')
    setPage(1)
  }

  const toggleFavorite = (community) => {
    const next = !community.isFavorite
    actions.update('communities', community.id, { isFavorite: next })
    actions.notify(
      next
        ? `“${community.name}” added to favourites`
        : `“${community.name}” removed from favourites`,
      next ? 'success' : 'info',
    )
  }

  const copyLink = async (community) => {
    const url = appUrl(`/communities/${community.id}`)
    const copied = await copyText(url)
    actions.notify(
      copied
        ? `Link to ${community.name} copied`
        : `Clipboard is blocked here — copy manually: ${url}`,
      copied ? 'success' : 'warning',
    )
  }

  const menuFor = (community) => [
    {
      label: 'Open details',
      icon: Users,
      onSelect: () => navigate(`/communities/${community.id}`),
    },
    {
      label: community.isFavorite ? 'Remove favourite' : 'Mark favourite',
      icon: Star,
      onSelect: () => toggleFavorite(community),
    },
    { divider: true },
    {
      label: 'New event here',
      icon: CalendarPlus,
      onSelect: () => navigate(`/events?new=1&community=${community.id}`),
    },
    { label: 'Copy link', icon: Copy, onSelect: () => copyLink(community) },
  ]

  const favorites = state.communities.filter((community) => community.isFavorite).length

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <PageHeader
        title="Communities"
        description="Every room your team runs, with the live numbers that decide where the next hour goes."
        meta={
          <>
            <Badge tone="brand" icon={Users}>
              {state.communities.length} communities
            </Badge>
            <Badge tone="neutral">{favorites} favourited</Badge>
            <Badge tone="neutral">
              {state.communities.filter((c) => c.visibility === 'public').length} public
            </Badge>
            <Badge tone="neutral">
              {state.communities.filter((c) => c.visibility === 'private').length} private
            </Badge>
          </>
        }
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
            New community
          </Button>
        }
      />

      <Toolbar>
        <SearchInput
          label="Search communities"
          placeholder="Search name, about or tags"
          value={search}
          onChange={(value) => {
            setSearch(value)
            setPage(1)
          }}
          resultCount={rows.length}
        />
        <FilterSelect
          label="Category"
          value={category}
          onChange={(value) => {
            setCategory(value)
            setPage(1)
          }}
          options={[{ value: 'all', label: 'All categories' }, ...COMMUNITY_CATEGORIES]}
        />
        <FilterSelect label="Sort" value={sort} onChange={setSort} options={SORTS} />
        <Segmented
          value={view}
          onChange={(key) => {
            actions.setPref('communitiesView', key)
            setViewLink(key)
            setPage(1)
          }}
          options={[
            { key: 'grid', label: 'Grid' },
            { key: 'table', label: 'Table' },
          ]}
        />
      </Toolbar>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={filtersOn ? 'No community matches those filters' : 'No communities yet'}
          body={
            filtersOn
              ? 'Try another category, or search part of a name such as “critique” or “playtest”.'
              : 'Create the first room and its channels, roster and calendar start from here.'
          }
          action={
            filtersOn ? (
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button variant="primary" size="sm" icon={Plus} onClick={() => setCreating(true)}>
                New community
              </Button>
            )
          }
          tone={filtersOn ? 'neutral' : 'brand'}
        />
      ) : view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {paged.slice.map((row) => (
            <CommunityCard
              key={row.community.id}
              row={row}
              menu={menuFor(row.community)}
              onFavorite={toggleFavorite}
            />
          ))}
        </div>
      ) : (
        <Card padded={false} className="overflow-hidden">
          <p className="px-4 py-3 text-xs text-content-2">
            Engagement is the share of each roster active in the last seven days, counted live from member
            records.
          </p>
          <TableShell className="px-0">
            <thead>
              <tr>
                <Th>Community</Th>
                <Th>Category</Th>
                <Th align="right">Members</Th>
                <Th align="right">Online</Th>
                <Th>Engagement</Th>
                <Th align="right">Events</Th>
                <Th align="right">Open tasks</Th>
                <Th>Created</Th>
                <Th align="right" className="w-12" />
              </tr>
            </thead>
            <tbody>
              {paged.slice.map((row) => {
                const { community, stats } = row
                return (
                  <Tr key={community.id} onClick={() => navigate(`/communities/${community.id}`)}>
                    <Td>
                      <span className="flex items-center gap-2.5">
                        <Avatar name={community.name} hue={hueForCommunity(community.accent)} size={8} />
                        <span className="min-w-0">
                          <span className="block max-w-56 truncate text-[13px] font-medium text-content">
                            {community.name}
                          </span>
                          <span className="block max-w-56 truncate text-[11px] text-content-3">
                            {community.tags.join(' · ')}
                          </span>
                        </span>
                        {community.isFavorite && (
                          <Star size={12} className="shrink-0 fill-current text-warning" aria-label="Favourited" />
                        )}
                      </span>
                    </Td>
                    <Td>
                      <Badge tone="neutral">{community.category}</Badge>
                    </Td>
                    <Td align="right" className="tnum">
                      {stats.members}
                    </Td>
                    <Td align="right" className="tnum">
                      {stats.online}
                    </Td>
                    <Td>
                      <span className="flex items-center gap-2">
                        <Progress
                          value={stats.engagementRate}
                          tone={
                            stats.engagementRate > 60
                              ? 'success'
                              : stats.engagementRate > 35
                                ? 'brand'
                                : 'warning'
                          }
                          className="max-w-20"
                          label={`${community.name} engagement this week`}
                        />
                        <span className="text-[11px] text-content-2 tnum">{stats.engagementRate}%</span>
                      </span>
                    </Td>
                    <Td align="right" className="tnum">
                      {stats.upcomingEvents}
                    </Td>
                    <Td align="right" className="tnum">
                      {stats.openTasks}
                    </Td>
                    <Td className="whitespace-nowrap text-content-2">{formatMonth(community.createdAt)}</Td>
                    <Td align="right">
                      <span onClick={(event) => event.stopPropagation()}>
                        <Menu items={menuFor(community)} />
                      </span>
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </TableShell>
        </Card>
      )}

      {rows.length > pageSize && (
        <div className="rounded-panel border border-line bg-surface px-4 py-3">
          <Pagination
            page={paged.page}
            pageCount={paged.pageCount}
            total={rows.length}
            pageSize={pageSize}
            onChange={setPage}
            className="border-0 pt-0"
          />
        </div>
      )}

      <NewCommunityDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}
