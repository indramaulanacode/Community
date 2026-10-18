import { useState } from 'react'
import {
  ArrowLeft,
  Boxes,
  Check,
  Eye,
  FileText,
  Layers,
  Lock,
  MoreHorizontal,
  Plus,
  SearchX,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { Link, navigate } from '../lib/router.jsx'
import { cn, formatMonth, groupBy, matchesQuery, relativeTime, sum, uid } from '../lib/utils.js'
import { CONTENT_STATUSES } from '../data/seed.js'
import { useApp } from '../store/AppStore.jsx'
import { lookupCommunity, lookupMember } from '../store/selectors.js'
import { Button } from '../components/ui/Button.jsx'
import {
  AvatarStack,
  Badge,
  Metric,
  OutlineBadge,
  Pagination,
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
import { Breadcrumbs } from '../components/ui/Navigation.jsx'
import { ConfirmDialog, Dialog, Disclosure, Menu } from '../components/ui/Overlay.jsx'
import { EmptyState } from '../components/ui/Feedback.jsx'
import { Checkbox } from '../components/ui/Form.jsx'
import { RankedBars } from '../components/ui/Charts.jsx'

const cap = (word) => String(word).charAt(0).toUpperCase() + String(word).slice(1)

const Dots = <MoreHorizontal size={14} strokeWidth={1.9} />

const statusMeta = (key) =>
  CONTENT_STATUSES.find((status) => status.key === key) || { label: cap(key), tone: 'neutral' }

const number = (value) => (value || 0).toLocaleString('en-US')

/* -------------------------------------------------------------- add content -- */

function AddContentDialog({ collection, community, existing, onNewDraft, onClose }) {
  const { state, actions } = useApp()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState([])

  const candidates = state.content
    .filter(
      (item) =>
        item.communityId === collection.communityId &&
        item.collectionId !== collection.id &&
        matchesQuery(item, search, ['title', 'category', 'type']),
    )
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))

  const toggle = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const save = () => {
    actions.updateMany('content', selected, { collectionId: collection.id })
    actions.notify(
      `${selected.length} item${selected.length === 1 ? '' : 's'} added to ${collection.name}`,
      'success',
    )
    onClose()
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title="Add content to this collection"
      description={`Items already filed to ${community?.name || 'this community'} that are not in ${collection.name} yet. Linking does not copy or rewrite anything.`}
      footer={
        <>
          <span className="mr-auto text-[11px] text-content-3 tnum">
            {selected.length} selected of {candidates.length} available
          </span>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" icon={Check} disabled={!selected.length} onClick={save}>
            {selected.length ? `Add ${selected.length} item${selected.length === 1 ? '' : 's'}` : 'Add to collection'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <SearchInput
          label="Search available content"
          placeholder="Search title, category or type"
          value={search}
          onChange={setSearch}
          resultCount={candidates.length}
        />

        {existing > 0 && (
          <p className="text-[11px] text-content-3">
            {existing} item{existing === 1 ? '' : 's'} already in this collection are hidden from the list.
          </p>
        )}

        {candidates.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Nothing left to file here"
            body={
              search.trim()
                ? 'No item in this community matches that search. Clear it to see everything still available.'
                : `Every published and draft item in ${community?.name || 'this community'} is already curated in ${collection.name}.`
            }
            action={
              search.trim() ? (
                <Button variant="secondary" size="sm" onClick={() => setSearch('')}>
                  Clear search
                </Button>
              ) : (
                <Button variant="primary" size="sm" icon={FileText} onClick={onNewDraft}>
                  Start a new draft
                </Button>
              )
            }
            tone={search.trim() ? 'neutral' : 'brand'}
          />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {candidates.map((item) => {
              const status = statusMeta(item.status)
              const checked = selected.includes(item.id)
              return (
                <li
                  key={item.id}
                  className={cn(
                    'flex items-start gap-3 rounded-control border px-3 py-2.5 transition-colors',
                    checked ? 'border-brand-2 bg-brand-soft' : 'border-line bg-surface hover:bg-surface-2',
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onChange={() => toggle(item.id)}
                    label={item.title}
                    description={`${cap(item.type)} · ${item.category} · ${status.label} · ${number(item.metrics.views)} views · updated ${relativeTime(item.updatedAt)}`}
                    className="flex-1"
                  />
                  <Badge tone={status.tone}>{status.label}</Badge>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Dialog>
  )
}

/* ----------------------------------------------------------------------- page -- */

function MissingCollection({ id }) {
  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <PageHeader title="Collection not found" description="This URL points at a curation group that is no longer here." />
      <EmptyState
        icon={Boxes}
        title={`No collection stored under “${id}”`}
        body="It may have been deleted from the library in another tab. Nothing was lost but the group itself."
        action={
          <Link
            to="/collections"
            className="inline-flex h-9 items-center gap-2 rounded-control bg-brand-fill px-4 text-[13px] font-medium text-white transition-colors hover:bg-brand-fill-2"
          >
            <ArrowLeft size={14} />
            Back to the library
          </Link>
        }
        tone="warning"
      />
    </div>
  )
}

export default function CollectionDetailPage({ params }) {
  const { state, actions } = useApp()
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState(null)
  const [page, setPage] = useState(1)

  const collection = state.collections.find((item) => item.id === params.id)
  if (!collection) return <MissingCollection id={params.id} />

  const items = state.content
    .filter((item) => item.collectionId === collection.id)
    .sort((a, b) => b.metrics.views - a.metrics.views)

  const community = lookupCommunity(state, collection.communityId)
  const authors = items
    .map((item) => lookupMember(state, item.authorId))
    .filter((member, index, all) => member && all.findIndex((x) => x?.id === member.id) === index)

  const views = sum(items, (item) => item.metrics.views)
  const comments = sum(items, (item) => item.metrics.comments)
  const likes = sum(items, (item) => item.metrics.likes)
  const shares = sum(items, (item) => item.metrics.shares)
  const unpublished = items.filter((item) => item.status !== 'published').length
  const paged = paginate(items, page, 8)

  const byType = [...groupBy(items, (item) => item.type)].map(([type, rows]) => ({
    label: `${cap(type)} (${rows.length})`,
    value: sum(rows, (item) => item.metrics.views),
  }))

  const available = state.content.filter(
    (item) => item.communityId === collection.communityId && item.collectionId !== collection.id,
  ).length

  const newDraft = () => {
    const id = uid('p')
    const now = new Date().toISOString()
    actions.add('content', {
      id,
      title: `${collection.name} — next item outline`,
      excerpt:
        'Working outline. Open with the decision a member is trying to make, then the three things they need before they can make it.',
      body:
        'This draft was started from inside a collection, so it is already filed where it belongs.\n\nWrite the opening paragraph as an answer to one question, then list the evidence: a number, a quote, or a screenshot of the thread it came from. Collections are read in order, so each item should end with the link to whatever comes next.',
      type: 'guide',
      status: 'draft',
      category: community?.category || 'Community',
      authorId: state.currentUserId,
      communityId: collection.communityId,
      collectionId: collection.id,
      publishedAt: null,
      scheduledFor: null,
      metrics: { views: 0, likes: 0, comments: 0, shares: 0 },
      updatedAt: now,
    })
    actions.notify(`Draft started in ${collection.name}`, 'success')
    navigate(`/content/${id}`)
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <PageHeader
        breadcrumb={
          <Breadcrumbs
            items={[
              { label: 'Collections', href: '#/collections' },
              { label: collection.name },
            ]}
          />
        }
        title={collection.name}
        description={
          collection.description ||
          'No description yet — say what belongs in this group so other moderators file items consistently.'
        }
        meta={
          <>
            {community ? (
              <Link
                to={`/communities/${community.id}`}
                className="text-[11px] font-medium text-brand-content underline-offset-2 hover:underline"
              >
                {community.name}
              </Link>
            ) : (
              <Badge tone="danger">Community no longer exists</Badge>
            )}
            <OutlineBadge tone={collection.visibility === 'public' ? 'brand' : 'neutral'}>
              {collection.visibility === 'public' ? (
                <Eye size={10} strokeWidth={2.2} />
              ) : (
                <Lock size={10} strokeWidth={2.2} />
              )}
              {cap(collection.visibility)}
            </OutlineBadge>
            <Badge tone="neutral" icon={Layers}>
              {items.length} items
            </Badge>
            <OutlineBadge tone="neutral">Created {formatMonth(collection.createdAt)}</OutlineBadge>
          </>
        }
        actions={
          <>
            <Button variant="secondary" icon={FileText} onClick={newDraft}>
              New draft in collection
            </Button>
            <Button variant="primary" icon={Plus} onClick={() => setAdding(true)}>
              Add content
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Items curated"
          value={items.length}
          hint={unpublished ? `${unpublished} not published yet` : 'All published'}
          icon={Layers}
          tone={items.length ? 'brand' : 'warning'}
        />
        <Metric
          label="Total views"
          value={views}
          hint={items.length ? `${number(Math.round(views / items.length))} per item` : 'No items yet'}
          icon={Eye}
          tone="info"
        />
        <Metric label="Comments" value={comments} hint={`${likes} likes across the set`} icon={FileText} tone="accent" />
        <Metric
          label="Shares"
          value={shares}
          hint={views ? `${((shares / views) * 100).toFixed(1)}% of views shared` : 'Nothing to share yet'}
          icon={Sparkles}
          tone="success"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Card>
            <CardHeader
              title={`Curated items — ${items.length}`}
              description="Ordered by views. Removing an item only unfiles it from this collection."
              icon={Layers}
              action={
                <Button variant="secondary" size="sm" icon={Plus} onClick={() => setAdding(true)}>
                  Add content
                </Button>
              }
            />
            <CardBody>
              {items.length === 0 ? (
                <EmptyState
                  icon={SearchX}
                  title="This collection is empty"
                  body={
                    available
                      ? `${available} item${available === 1 ? '' : 's'} in ${community?.name || 'the linked community'} are waiting to be curated into an order.`
                      : `Nothing exists in ${community?.name || 'the linked community'} yet. Start a draft here and it lands in this collection automatically.`
                  }
                  action={
                    available ? (
                      <Button variant="primary" size="sm" icon={Plus} onClick={() => setAdding(true)}>
                        Add {available} available item{available === 1 ? '' : 's'}
                      </Button>
                    ) : (
                      <Button variant="primary" size="sm" icon={FileText} onClick={newDraft}>
                        New draft in collection
                      </Button>
                    )
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
                        <Th align="right" className="w-12" />
                      </tr>
                    </thead>
                    <tbody>
                      {paged.slice.map((item) => {
                        const status = statusMeta(item.status)
                        return (
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
                              <Badge tone={status.tone}>{status.label}</Badge>
                            </Td>
                            <Td align="right" className="tnum">
                              {number(item.metrics.views)}
                            </Td>
                            <Td align="right" className="tnum">
                              {item.metrics.comments}
                            </Td>
                            <Td className="whitespace-nowrap text-content-2">{relativeTime(item.updatedAt)}</Td>
                            <Td align="right">
                              <Menu
                                items={[
                                  {
                                    label: 'Open item',
                                    icon: FileText,
                                    onSelect: () => navigate(`/content/${item.id}`),
                                  },
                                  { divider: true },
                                  {
                                    label: 'Remove from collection',
                                    icon: Trash2,
                                    danger: true,
                                    onSelect: () => setRemoving(item),
                                  },
                                ]}
                                label={`Actions for ${item.title}`}
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
                    total={items.length}
                    pageSize={8}
                    onChange={setPage}
                  />
                </>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Curation notes" description="Where this group sits in the workspace." icon={Boxes} />
            <CardBody>
              <dl className="divide-y divide-line border-y border-line">
                <MetaRow label="Community">{community?.name || 'Unlinked'}</MetaRow>
                <MetaRow label="Visibility">{cap(collection.visibility)}</MetaRow>
                <MetaRow label="Items">{items.length}</MetaRow>
                <MetaRow label="Available to file">{available}</MetaRow>
                <MetaRow label="Authors">{authors.length}</MetaRow>
                <MetaRow label="Created">{formatMonth(collection.createdAt)}</MetaRow>
              </dl>
              {authors.length > 0 && (
                <div className="mt-4 flex items-center justify-between gap-3">
                  <AvatarStack people={authors} max={5} size={8} />
                  <span className="text-[11px] text-content-3">
                    {authors.length} contributor{authors.length === 1 ? '' : 's'}
                  </span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-4 w-full"
                onClick={() =>
                  navigate(community ? `/communities/${community.id}` : '/communities')
                }
              >
                {community ? `Open ${community.name}` : 'Back to communities'}
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Views by type"
              description="Shows whether the group is heavy on one format."
              icon={FileText}
            />
            <CardBody>
              {byType.length === 0 ? (
                <p className="text-[11px] leading-relaxed text-content-3">
                  Add at least one item and the mix appears here.
                </p>
              ) : (
                <RankedBars data={byType} valueKey="value" labelKey="label" color="var(--chart-4)" />
              )}
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-3">
                {CONTENT_STATUSES.map((status) => (
                  <Badge key={status.key} tone={status.tone}>
                    {status.label} · {items.filter((item) => item.status === status.key).length}
                  </Badge>
                ))}
              </div>
            </CardBody>
          </Card>

          <SectionTitle action={<span className="text-[11px] text-content-3">{items.length} linked</span>}>
            Read next
          </SectionTitle>

          <Card>
            <CardBody className="mt-0">
              <ol className="flex flex-col gap-2">
                {items.slice(0, 5).map((item, index) => (
                  <li key={item.id} className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[10px] font-semibold text-content-2 tnum">
                      {index + 1}
                    </span>
                    <Link
                      to={`/content/${item.id}`}
                      className="min-w-0 flex-1 truncate text-[12px] font-medium text-content hover:text-brand"
                    >
                      {item.title}
                    </Link>
                    <span className="shrink-0 text-[11px] text-content-3 tnum">
                      {number(item.metrics.views)}
                    </span>
                  </li>
                ))}
                {items.length === 0 && (
                  <li className="text-[11px] leading-relaxed text-content-3">
                    Nothing ordered yet. The list above follows views; once you curate items, start with the one
                    that answers the most common question in the room.
                  </li>
                )}
              </ol>
            </CardBody>
          </Card>
        </div>
      </div>

      <Disclosure summary="How collections relate to content" defaultOpen>
        <div className="flex flex-col gap-2 text-[12px] leading-relaxed text-content-2">
          <p>
            A collection is a curation group, not a copy. Each item keeps one <code>collectionId</code>, so it
            lives in at most one group at a time — adding it here removes it from whichever collection held it
            before, and the item&apos;s own status, metrics and community link are untouched.
          </p>
          <p>
            That is deliberate: a rate card should not exist twice with two view counts. If you need two orders
            of the same material, create a second collection and move the items when the first group is retired.
          </p>
          <p>
            Deleting a collection unfiles its {items.length} item{items.length === 1 ? '' : 's'} rather than
            destroying them — the content library stays the single source of truth.
          </p>
        </div>
      </Disclosure>

      {adding && (
        <AddContentDialog
          collection={collection}
          community={community}
          existing={items.length}
          onNewDraft={() => {
            setAdding(false)
            newDraft()
          }}
          onClose={() => setAdding(false)}
        />
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          actions.update('content', removing.id, { collectionId: null })
          actions.notify(`“${removing.title}” is no longer in ${collection.name}`, 'info')
          setRemoving(null)
        }}
        title="Remove this item from the collection?"
        body={`“${removing?.title || ''}” stays in the content library with its metrics and community link. Only the curation group is dropped, and you can add it back at any time.`}
        confirmLabel="Unfile item"
      />
    </div>
  )
}
