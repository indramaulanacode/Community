import { useEffect, useMemo, useState } from 'react'
import {
  CalendarClock,
  Check,
  Eye,
  FileText,
  FolderInput,
  Heart,
  Layers,
  LayoutGrid,
  MessageSquare,
  Pencil,
  Plus,
  Share2,
  Table2,
  Trash2,
} from 'lucide-react'
import { navigate, Link } from '../lib/router.jsx'
import {
  cn,
  formatCount,
  formatDay,
  matchesQuery,
  oneOf,
  relativeTime,
  uid,
} from '../lib/utils.js'
import { CONTENT_STATUSES, CONTENT_TYPES } from '../data/seed.js'
import { useApp } from '../store/AppStore.jsx'
import { lookupCommunity, lookupMember } from '../store/selectors.js'
import { Button } from '../components/ui/Button.jsx'
import {
  Avatar,
  Badge,
  OutlineBadge,
  Progress,
  SearchInput,
  TableShell,
  Td,
  Th,
  Tr,
  paginate,
} from '../components/ui/Data.jsx'
import { Card, PageHeader } from '../components/ui/Surface.jsx'
import {
  FilterSelect,
  Segmented,
  Tabs,
  Toolbar,
} from '../components/ui/Navigation.jsx'
import {
  ConfirmDialog,
  Dialog,
  Menu,
} from '../components/ui/Overlay.jsx'
import { EmptyState } from '../components/ui/Feedback.jsx'
import { Field, Input } from '../components/ui/Form.jsx'
import ContentForm from './content/ContentForm.jsx'

const STATUS_TONE = Object.fromEntries(
  CONTENT_STATUSES.map((s) => [s.key, s.tone]),
)

const SORTS = [
  { value: 'updated', label: 'Recently updated' },
  { value: 'viewed', label: 'Most viewed' },
  { value: 'engagement', label: 'Highest engagement' },
  { value: 'az', label: 'A–Z' },
]

const METRIC_ICONS = [
  { key: 'views', icon: Eye },
  { key: 'likes', icon: Heart },
  { key: 'comments', icon: MessageSquare },
  { key: 'shares', icon: Share2 },
]

const engagementOf = (item) =>
  item.metrics.views ? (item.metrics.likes + item.metrics.comments) / item.metrics.views : 0

function MetricRow({ metrics, className = '' }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-3.5 gap-y-1', className)}>
      {METRIC_ICONS.map(({ key, icon: Icon }) => (
        <span
          key={key}
          className="flex items-center gap-1 text-[11px] text-content-3 tnum"
          title={`${key}: ${metrics[key]}`}
        >
          <Icon size={12} strokeWidth={1.9} />
          {formatCount(metrics[key])}
        </span>
      ))}
    </div>
  )
}

export default function ContentPage({ query }) {
  const { state, actions } = useApp()

  const [status, setStatus] = useState(
    () => oneOf(query.get('status'), ['all', ...CONTENT_STATUSES.map((s) => s.key)], 'all'),
  )
  const [search, setSearch] = useState(() => query.get('q') || '')
  const [communityId, setCommunityId] = useState(() => query.get('community') || 'all')
  const [type, setType] = useState('all')
  const [collectionId, setCollectionId] = useState('all')
  const [sort, setSort] = useState('updated')
  const [view, setView] = useState(() => oneOf(query.get('view'), ['grid', 'table'], 'grid'))
  const [page, setPage] = useState(1)

  const [composer, setComposer] = useState({ open: false, item: null })
  const [scheduleFor, setScheduleFor] = useState(null)
  const [scheduleValue, setScheduleValue] = useState('')
  const [collectionFor, setCollectionFor] = useState(null)
  const [collectionPick, setCollectionPick] = useState('')
  const [deleteFor, setDeleteFor] = useState(null)

  const newFlag = query.get('new')
  useEffect(() => {
    if (newFlag === '1') {
      setStatus('all')
      setComposer({ open: true, item: null })
    }
  }, [newFlag])

  /* ---------------------------------------------------------------- data --- */

  const preStatus = useMemo(() => {
    const filtered = state.content.filter(
      (item) =>
        (communityId === 'all' || item.communityId === communityId) &&
        (type === 'all' || item.type === type) &&
        (collectionId === 'all' || item.collectionId === collectionId) &&
        matchesQuery(item, search, ['title', 'excerpt', 'body']),
    )
    return filtered
  }, [state.content, communityId, type, collectionId, search])

  const statusCounts = useMemo(() => {
    const counts = { all: preStatus.length }
    for (const s of CONTENT_STATUSES) {
      counts[s.key] = preStatus.filter((item) => item.status === s.key).length
    }
    return counts
  }, [preStatus])

  const rows = useMemo(() => {
    const scoped =
      status === 'all' ? preStatus : preStatus.filter((item) => item.status === status)
    const sorted = [...scoped]
    if (sort === 'updated') sorted.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    else if (sort === 'viewed') sorted.sort((a, b) => b.metrics.views - a.metrics.views)
    else if (sort === 'engagement') sorted.sort((a, b) => engagementOf(b) - engagementOf(a))
    else sorted.sort((a, b) => a.title.localeCompare(b.title))
    return sorted
  }, [preStatus, status, sort])

  const pageSize = view === 'grid' ? 9 : 12
  const { slice, pageCount, page: safePage } = paginate(rows, page, pageSize)
  const maxViews = Math.max(1, ...rows.map((r) => r.metrics.views))

  const filtersActive =
    Boolean(search) ||
    status !== 'all' ||
    communityId !== 'all' ||
    type !== 'all' ||
    collectionId !== 'all'

  const clearFilters = () => {
    setSearch('')
    setStatus('all')
    setCommunityId('all')
    setType('all')
    setCollectionId('all')
    setPage(1)
  }

  /* ------------------------------------------------------------ mutations -- */

  const patch = (item, next, message) => {
    actions.update('content', item.id, { ...next, updatedAt: new Date().toISOString() })
    actions.notify(message, 'success')
  }

  const duplicate = (item) => {
    const copy = {
      ...item,
      id: uid('p'),
      title: `${item.title} (copy)`,
      status: 'draft',
      publishedAt: null,
      scheduledFor: null,
      metrics: { views: 0, likes: 0, comments: 0, shares: 0 },
      updatedAt: new Date().toISOString(),
    }
    actions.add('content', copy)
    actions.notify(`Duplicated as a draft — “${copy.title}”`, 'success')
  }

  const openCollection = (item) => {
    setCollectionFor(item)
    setCollectionPick(item.collectionId || '')
  }

  const menuItems = (item) => [
    { label: 'Edit', icon: Pencil, onSelect: () => setComposer({ open: true, item }) },
    { label: 'View', icon: Eye, onSelect: () => navigate(`/content/${item.id}`) },
    { label: 'Duplicate', icon: Layers, onSelect: () => duplicate(item) },
    { divider: true },
    {
      label: 'Publish',
      icon: Check,
      disabled: item.status === 'published',
      hint: item.status === 'published' ? 'Live' : undefined,
      onSelect: () =>
        patch(item, { status: 'published', publishedAt: new Date().toISOString(), scheduledFor: null }, `Published “${item.title}”`),
    },
    {
      label: 'Move to draft',
      icon: FileText,
      disabled: item.status === 'draft',
      onSelect: () =>
        patch(item, { status: 'draft', publishedAt: null, scheduledFor: null }, `“${item.title}” is now a draft`),
    },
    {
      label: 'Schedule',
      icon: CalendarClock,
      onSelect: () => {
        setScheduleFor(item)
        setScheduleValue(item.scheduledFor ? localInput(new Date(item.scheduledFor)) : '')
      },
    },
    { label: 'Add to collection', icon: FolderInput, onSelect: () => openCollection(item) },
    { divider: true },
    { label: 'Delete', icon: Trash2, danger: true, onSelect: () => setDeleteFor(item) },
  ]

  const communityOptions = [
    { value: 'all', label: 'All communities' },
    ...state.communities.map((c) => ({ value: c.id, label: c.name })),
  ]
  const typeOptions = [
    { value: 'all', label: 'All types' },
    ...CONTENT_TYPES.map((t) => ({ value: t, label: t[0].toUpperCase() + t.slice(1) })),
  ]
  const collectionOptions = [
    { value: 'all', label: 'All collections' },
    ...state.collections
      .filter((c) => communityId === 'all' || c.communityId === communityId)
      .map((c) => ({ value: c.id, label: c.name })),
  ]

  /* ------------------------------------------------------------- rendering -- */

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <PageHeader
        title="Content library"
        description={`${state.content.length} posts, guides and resources across ${state.communities.length} communities.`}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setComposer({ open: true, item: null })}>
            New post
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        <Tabs
          value={status}
          onChange={(key) => {
            setStatus(key)
            setPage(1)
          }}
          items={[
            { key: 'all', label: 'All', count: statusCounts.all },
            ...CONTENT_STATUSES.map((s) => ({ key: s.key, label: s.label, count: statusCounts[s.key] })),
          ]}
        />

        <Toolbar>
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v)
              setPage(1)
            }}
            label="Search content"
            placeholder="Search titles, excerpts and bodies"
            resultCount={rows.length}
          />
          <FilterSelect
            label="Community"
            value={communityId}
            onChange={(v) => {
              setCommunityId(v)
              setCollectionId('all')
              setPage(1)
            }}
            options={communityOptions}
          />
          <FilterSelect
            label="Type"
            value={type}
            onChange={(v) => {
              setType(v)
              setPage(1)
            }}
            options={typeOptions}
          />
          <FilterSelect
            label="Collection"
            value={collectionId}
            onChange={(v) => {
              setCollectionId(v)
              setPage(1)
            }}
            options={collectionOptions}
          />
          <FilterSelect label="Sort" value={sort} onChange={setSort} options={SORTS} />
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { key: 'grid', label: 'Grid', icon: LayoutGrid },
              { key: 'table', label: 'Table', icon: Table2 },
            ]}
          />
        </Toolbar>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={filtersActive ? 'No content matches these filters' : 'The library is empty'}
          body={
            filtersActive
              ? 'Try widening the community, type or search text to find what you need.'
              : 'Create the first post and it will show up here with its live metrics.'
          }
          action={
            filtersActive ? (
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => setComposer({ open: true, item: null })}
              >
                New post
              </Button>
            )
          }
          tone="brand"
        />
      ) : view === 'grid' ? (
        <>
          <div className="grid gap-4 grid-fill [--fill-min:20rem]">
            {slice.map((item) => {
              const author = lookupMember(state, item.authorId)
              const community = lookupCommunity(state, item.communityId)
              return (
                <Card key={item.id} className="flex flex-col gap-3" interactive={false}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="brand">{item.type[0].toUpperCase() + item.type.slice(1)}</Badge>
                      <OutlineBadge tone={STATUS_TONE[item.status]}>
                        {item.status === 'scheduled' && item.scheduledFor
                          ? `Scheduled · ${formatDay(item.scheduledFor)}`
                          : CONTENT_STATUSES.find((s) => s.key === item.status)?.label}
                      </OutlineBadge>
                    </div>
                    <Menu items={menuItems(item)} label={`Actions for ${item.title}`} size="xs" />
                  </div>

                  <Link
                    to={`/content/${item.id}`}
                    className="text-[15px] leading-snug font-semibold text-content hover:text-brand-content"
                  >
                    {item.title}
                  </Link>
                  <p className="line-clamp-2 text-[13px] leading-relaxed text-content-2">
                    {item.excerpt}
                  </p>

                  <div className="mt-auto flex flex-col gap-2.5 border-t border-line pt-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={author?.name} hue={author?.hue} size={6} />
                      <span className="min-w-0 flex-1 truncate text-[11px] text-content-2">
                        {author?.name || 'Unknown author'}
                        <span className="text-content-3"> · {community?.name}</span>
                      </span>
                      <span className="shrink-0 text-[11px] text-content-3">
                        {relativeTime(item.updatedAt)}
                      </span>
                    </div>
                    <MetricRow metrics={item.metrics} />
                  </div>
                </Card>
              )
            })}
          </div>
          <PaginationBar
            page={safePage}
            pageCount={pageCount}
            total={rows.length}
            pageSize={pageSize}
            onChange={setPage}
          />
        </>
      ) : (
        <>
          <Card padded={false} className="overflow-hidden">
            <div className="px-4 pt-4">
              <TableShell>
                <thead>
                  <tr>
                    <Th>Title</Th>
                    <Th>Type</Th>
                    <Th>Status</Th>
                    <Th>Community</Th>
                    <Th>Author</Th>
                    <Th align="right">Views</Th>
                    <Th>Reach</Th>
                    <Th align="right" className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {slice.map((item) => {
                    const author = lookupMember(state, item.authorId)
                    const community = lookupCommunity(state, item.communityId)
                    return (
                      <Tr key={item.id}>
                        <Td>
                          <div className="flex flex-col gap-0.5">
                            <Link
                              to={`/content/${item.id}`}
                              className="font-medium text-content hover:text-brand-content hover:underline"
                            >
                              {item.title}
                            </Link>
                            <span className="text-[11px] text-content-3">
                              Updated {relativeTime(item.updatedAt)}
                            </span>
                          </div>
                        </Td>
                        <Td className="text-content-2 capitalize">{item.type}</Td>
                        <Td>
                          <OutlineBadge tone={STATUS_TONE[item.status]}>
                            {item.status === 'scheduled' && item.scheduledFor
                              ? formatDay(item.scheduledFor)
                              : CONTENT_STATUSES.find((s) => s.key === item.status)?.label}
                          </OutlineBadge>
                        </Td>
                        <Td className="text-content-2">{community?.name || '—'}</Td>
                        <Td>
                          <span className="flex items-center gap-2">
                            <Avatar name={author?.name} hue={author?.hue} size={6} />
                            <span className="truncate text-[12px] text-content-2">
                              {author?.name || '—'}
                            </span>
                          </span>
                        </Td>
                        <Td align="right" className="text-content-2 tnum">
                          {formatCount(item.metrics.views)}
                        </Td>
                        <Td>
                          <Progress
                            value={item.metrics.views}
                            max={maxViews}
                            className="max-w-24"
                            label={`${item.metrics.views} views`}
                          />
                        </Td>
                        <Td align="right">
                          <Menu items={menuItems(item)} label={`Actions for ${item.title}`} size="xs" />
                        </Td>
                      </Tr>
                    )
                  })}
                </tbody>
              </TableShell>
            </div>
            <div className="px-4 pb-4">
              <PaginationBar
                page={safePage}
                pageCount={pageCount}
                total={rows.length}
                pageSize={pageSize}
                onChange={setPage}
              />
            </div>
          </Card>
        </>
      )}

      <ContentForm
        open={composer.open}
        item={composer.item}
        defaultCommunityId={query.get('community') || ''}
        onClose={() => setComposer({ open: false, item: null })}
      />

      {/* Schedule dialog */}
      <Dialog
        open={Boolean(scheduleFor)}
        onClose={() => setScheduleFor(null)}
        size="sm"
        title="Schedule publication"
        description="The post stays hidden until this time, then moves to Published in a real deployment."
        footer={
          <>
            <Button variant="ghost" onClick={() => setScheduleFor(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={CalendarClock}
              disabled={!scheduleValue}
              onClick={() => {
                const iso = new Date(scheduleValue).toISOString()
                patch(
                  scheduleFor,
                  { status: 'scheduled', scheduledFor: iso, publishedAt: null },
                  `Scheduled “${scheduleFor.title}” for ${formatDay(iso)}`,
                )
                setScheduleFor(null)
              }}
            >
              Schedule
            </Button>
          </>
        }
      >
        <Field label="Publish at" hint="Local time on this device.">
          <Input
            type="datetime-local"
            value={scheduleValue}
            onChange={(e) => setScheduleValue(e.target.value)}
          />
        </Field>
      </Dialog>

      {/* Add-to-collection dialog */}
      <Dialog
        open={Boolean(collectionFor)}
        onClose={() => setCollectionFor(null)}
        size="sm"
        title="Add to collection"
        description={
          collectionFor
            ? `Collections that belong to ${lookupCommunity(state, collectionFor.communityId)?.name || 'this community'}.`
            : ''
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setCollectionFor(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={collectionFor && !collectionsOf(state, collectionFor.communityId).length}
              onClick={() => {
                const name = state.collections.find((c) => c.id === collectionPick)?.name
                patch(
                  collectionFor,
                  { collectionId: collectionPick || null },
                  collectionPick ? `Added to “${name}”` : 'Removed from its collection',
                )
                setCollectionFor(null)
              }}
            >
              Save
            </Button>
          </>
        }
      >
        {collectionFor &&
          (collectionsOf(state, collectionFor.communityId).length ? (
            <Field label="Collection">
              <select
                value={collectionPick}
                onChange={(e) => setCollectionPick(e.target.value)}
                className="h-9 w-full rounded-control border border-line bg-surface px-3 text-[13px] text-content"
              >
                <option value="">Uncategorised</option>
                {collectionsOf(state, collectionFor.communityId).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <p className="text-[13px] text-content-2">
              This community has no collections yet. Create one from the Collections page first.
            </p>
          ))}
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={Boolean(deleteFor)}
        onCancel={() => setDeleteFor(null)}
        onConfirm={() => {
          actions.remove('content', deleteFor.id)
          actions.notify(`Deleted “${deleteFor.title}”`, 'info')
          setDeleteFor(null)
        }}
        title="Delete this content?"
        body={`“${deleteFor?.title}” will be removed from the library. This cannot be undone in the demo.`}
        confirmLabel="Delete"
      />
    </div>
  )
}

function collectionsOf(state, communityId) {
  return state.collections.filter((c) => c.communityId === communityId)
}

function localInput(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function PaginationBar({ page, pageCount, total, pageSize, onChange }) {
  if (pageCount <= 1) return null
  return (
    <div className="flex items-center justify-between gap-3 rounded-panel border border-line bg-surface px-4 py-3 shadow-card">
      <p className="text-[11px] text-content-3 tnum">
        Page {page} of {pageCount} · {total} items
      </p>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="xs" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </Button>
        <Button
          variant="outline"
          size="xs"
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
        >
          Next
        </Button>
      </div>
      <span className="sr-only">{pageSize} per page</span>
    </div>
  )
}
