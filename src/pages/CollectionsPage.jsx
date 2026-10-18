import { useState } from 'react'
import {
  Boxes,
  ChevronRight,
  Eye,
  FolderPlus,
  Layers,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { Link, navigate } from '../lib/router.jsx'
import { cn, formatMonth, matchesQuery, sum, uid, unique } from '../lib/utils.js'
import { useApp } from '../store/AppStore.jsx'
import { lookupCommunity, lookupMember } from '../store/selectors.js'
import { Button } from '../components/ui/Button.jsx'
import {
  AvatarStack,
  Badge,
  OutlineBadge,
  SearchInput,
} from '../components/ui/Data.jsx'
import { Card, PageHeader, SectionTitle } from '../components/ui/Surface.jsx'
import { FilterSelect, Toolbar } from '../components/ui/Navigation.jsx'
import { ConfirmDialog, Dialog, Menu } from '../components/ui/Overlay.jsx'
import { EmptyState } from '../components/ui/Feedback.jsx'
import { Field, Input, Select, Textarea, required, validate } from '../components/ui/Form.jsx'

const cap = (word) => String(word).charAt(0).toUpperCase() + String(word).slice(1)

/** Icon-only menu trigger that still carries a specific accessible name. */
const Dots = <MoreHorizontal size={14} strokeWidth={1.9} />

/** Everything a collection card needs, derived from the live records. */
function collectionRows(state) {
  return state.collections.map((collection) => {
    const items = state.content.filter((item) => item.collectionId === collection.id)
    const authorIds = unique(items.map((item) => item.authorId))
    return {
      collection,
      items,
      authors: authorIds.map((id) => lookupMember(state, id)).filter(Boolean),
      views: sum(items, (item) => item.metrics.views),
      comments: sum(items, (item) => item.metrics.comments),
      drafts: items.filter((item) => item.status !== 'published').length,
      community: lookupCommunity(state, collection.communityId),
    }
  })
}

function CollectionFormDialog({ open, onClose, title, description, confirmLabel, initial, onSubmit }) {
  const { state } = useApp()
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})

  const set = (key) => (event) => {
    const value = event.target.value
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev))
  }

  const submit = () => {
    const next = validate(form, {
      name: (value) => required(value, 'Collection name'),
    })
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }
    onSubmit(form)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" icon={open ? Pencil : Plus} onClick={submit}>
            {confirmLabel}
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
          label="Name"
          required
          error={errors.name}
          hint="Short and descriptive — it is what members see in the library."
        >
          <Input value={form.name} onChange={set('name')} invalid={Boolean(errors.name)} data-autofocus />
        </Field>

        <Field label="Description" hint="One line on what belongs in this group.">
          <Textarea
            value={form.description}
            onChange={set('description')}
            rows={3}
            placeholder="Rate cards, retention benchmarks and the contract checkpoints we hand to new members."
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Community" hint="The item picker on the collection page only offers this room's content.">
            <Select value={form.communityId} onChange={set('communityId')}>
              {state.communities.map((community) => (
                <option key={community.id} value={community.id}>
                  {community.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Visibility" hint="Private collections are visible to the moderation team only.">
            <Select value={form.visibility} onChange={set('visibility')}>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </Select>
          </Field>
        </div>
      </form>
    </Dialog>
  )
}

export default function CollectionsPage({ query }) {
  const { state, actions } = useApp()
  const params = query || new URLSearchParams()
  const [search, setSearch] = useState(() => params.get('q') || '')
  const [communityId, setCommunityId] = useState('all')
  const [creating, setCreating] = useState(false)
  const [renaming, setRenaming] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const rows = collectionRows(state)
  const visible = rows.filter(
    ({ collection }) =>
      (communityId === 'all' || collection.communityId === communityId) &&
      matchesQuery(collection, search, ['name', 'description']),
  )
  const filtersOn = Boolean(search.trim()) || communityId !== 'all'

  const filedItems = sum(rows, (row) => row.items.length)
  const emptyCollections = rows.filter((row) => row.items.length === 0).length

  const clearFilters = () => {
    setSearch('')
    setCommunityId('all')
  }

  const menuFor = (row) => [
    {
      label: 'Open collection',
      icon: Boxes,
      onSelect: () => navigate(`/collections/${row.collection.id}`),
    },
    {
      label: 'Rename',
      icon: Pencil,
      onSelect: () => setRenaming(row.collection),
    },
    { divider: true },
    {
      label: 'Delete collection',
      icon: Trash2,
      danger: true,
      onSelect: () => setDeleting(row.collection),
    },
  ]

  const createInitial = () => ({
    name: '',
    description: '',
    communityId: state.communities[0]?.id || '',
    visibility: 'public',
  })

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <PageHeader
        title="Collections"
        description="Curation groups that pull the best material from a community into one order people can follow."
        meta={
          <>
            <Badge tone="brand" icon={Layers}>
              {state.collections.length} collections
            </Badge>
            <Badge tone="neutral">{filedItems} items filed</Badge>
            <Badge tone={emptyCollections ? 'warning' : 'neutral'}>
              {emptyCollections} awaiting items
            </Badge>
          </>
        }
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
            New collection
          </Button>
        }
      />

      <Toolbar>
        <SearchInput
          label="Search collections"
          placeholder="Search name or description"
          value={search}
          onChange={setSearch}
          resultCount={visible.length}
        />
        <FilterSelect
          label="Community"
          value={communityId}
          onChange={setCommunityId}
          options={[
            { value: 'all', label: 'All communities' },
            ...state.communities.map((community) => ({ value: community.id, label: community.name })),
          ]}
        />
        {filtersOn && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </Toolbar>

      {visible.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={filtersOn ? 'No collection matches those filters' : 'The library is empty'}
          body={
            filtersOn
              ? 'Search a phrase from the description, or switch back to all communities.'
              : 'Group the items a newcomer should read in order — a collection links content, it never duplicates it.'
          }
          action={
            filtersOn ? (
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button variant="primary" size="sm" icon={FolderPlus} onClick={() => setCreating(true)}>
                New collection
              </Button>
            )
          }
          tone={filtersOn ? 'neutral' : 'brand'}
        />
      ) : (
        <>
          <SectionTitle
            action={
              <span className="text-[11px] text-content-3">
                Item counts are live — they follow the content library exactly.
              </span>
            }
          >
            Curated library
          </SectionTitle>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((row) => {
              const { collection, items, authors, views, drafts, community } = row
              return (
                <Card key={collection.id} interactive className="flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-control',
                        items.length ? 'bg-brand-soft text-brand-content' : 'bg-neutral-soft text-content-3',
                      )}
                    >
                      <Boxes size={16} strokeWidth={1.9} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/collections/${collection.id}`}
                        className="block truncate text-[14px] font-semibold text-content hover:text-brand"
                      >
                        {collection.name}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {community ? (
                          <Link
                            to={`/communities/${community.id}`}
                            className="text-[11px] text-brand-content underline-offset-2 hover:underline"
                          >
                            {community.name}
                          </Link>
                        ) : (
                          <Badge tone="danger">Community deleted</Badge>
                        )}
                        <OutlineBadge tone={collection.visibility === 'public' ? 'brand' : 'neutral'}>
                          {collection.visibility === 'public' ? (
                            <Eye size={10} strokeWidth={2.2} />
                          ) : (
                            <Lock size={10} strokeWidth={2.2} />
                          )}
                          {cap(collection.visibility)}
                        </OutlineBadge>
                      </div>
                    </div>
                    <Menu
                      items={menuFor(row)}
                      label={`Actions for ${collection.name}`}
                      leading={Dots}
                      size="xs"
                    />
                  </div>

                  <p className="line-clamp-2 min-h-8 text-[12px] leading-relaxed text-content-2">
                    {collection.description ||
                      'No description yet — open the collection to add what belongs in it.'}
                  </p>

                  <dl className="grid grid-cols-3 gap-2 rounded-control border border-line bg-surface-2 px-3 py-2">
                    <div>
                      <dt className="text-[9px] font-semibold tracking-wide text-content-3 uppercase">Items</dt>
                      <dd className="text-[13px] font-semibold text-content tnum">{items.length}</dd>
                    </div>
                    <div>
                      <dt className="text-[9px] font-semibold tracking-wide text-content-3 uppercase">Views</dt>
                      <dd className="text-[13px] font-semibold text-content tnum">
                        {views.toLocaleString('en-US')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[9px] font-semibold tracking-wide text-content-3 uppercase">Unpublished</dt>
                      <dd
                        className={cn(
                          'text-[13px] font-semibold tnum',
                          drafts ? 'text-warning' : 'text-content',
                        )}
                      >
                        {drafts}
                      </dd>
                    </div>
                  </dl>

                  <div className="flex items-end justify-between gap-3 border-t border-line pt-3">
                    <span className="min-w-0">
                      {authors.length ? (
                        <>
                          <AvatarStack people={authors} max={4} size={6} className="mb-1" />
                          <span className="block truncate text-[10px] text-content-3">
                            {authors.length} author{authors.length === 1 ? '' : 's'} · added{' '}
                            {formatMonth(collection.createdAt)}
                          </span>
                        </>
                      ) : (
                        <span className="block text-[10px] text-content-3">
                          No authors yet · created {formatMonth(collection.createdAt)}
                        </span>
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="xs"
                      iconRight={ChevronRight}
                      onClick={() => navigate(`/collections/${collection.id}`)}
                    >
                      {items.length ? 'Open' : 'Add items'}
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      <p className="text-[11px] leading-relaxed text-content-3">
        Deleting a collection only removes the group: {filedItems} filed items keep their own status, metrics and
        community link, they simply stop being curated.
      </p>

      {creating && (
        <CollectionFormDialog
          open
          title="New collection"
          description="Pick the community first — the item picker on the next screen only offers its content."
          confirmLabel="Create collection"
          initial={createInitial()}
          onClose={() => setCreating(false)}
          onSubmit={(form) => {
            const id = uid('col')
            actions.add('collections', {
              id,
              name: form.name.trim(),
              description: form.description.trim(),
              communityId: form.communityId,
              visibility: form.visibility,
              createdAt: new Date().toISOString(),
              itemIds: [],
            })
            actions.notify(`“${form.name.trim()}” created`, 'success')
            setCreating(false)
            navigate(`/collections/${id}`)
          }}
        />
      )}

      {renaming && (
        <CollectionFormDialog
          key={renaming.id}
          open
          title="Rename collection"
          description={`Editing ${renaming.name}. Item links are untouched.`}
          confirmLabel="Save changes"
          initial={{
            name: renaming.name,
            description: renaming.description,
            communityId: renaming.communityId,
            visibility: renaming.visibility,
          }}
          onClose={() => setRenaming(null)}
          onSubmit={(form) => {
            actions.update('collections', renaming.id, {
              name: form.name.trim(),
              description: form.description.trim(),
              communityId: form.communityId,
              visibility: form.visibility,
            })
            actions.notify(`Collection renamed to “${form.name.trim()}”`, 'success')
            setRenaming(null)
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const itemIds = state.content
            .filter((item) => item.collectionId === deleting.id)
            .map((item) => item.id)
          actions.updateMany('content', itemIds, { collectionId: null })
          actions.remove('collections', deleting.id)
          actions.notify(
            `“${deleting.name}” deleted — ${itemIds.length} item${itemIds.length === 1 ? '' : 's'} unfiled`,
            'warning',
          )
          setDeleting(null)
        }}
        title="Delete this collection?"
        body={`“${deleting?.name || ''}” groups ${
          state.content.filter((item) => item.collectionId === deleting?.id).length
        } items. They stay in the content library with their metrics; only the curation group is removed.`}
        confirmLabel="Delete collection"
      />
    </div>
  )
}
