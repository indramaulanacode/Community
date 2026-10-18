/**
 * Shared composer for the content library and detail view. Renders as a Dialog
 * so "New post", "Edit" and the `?new=1` deep link all reuse one form. On save
 * it writes a complete content record through the store, then navigates to it.
 */
import { useEffect, useMemo, useState } from 'react'
import { Save } from 'lucide-react'
import { navigate } from '../../lib/router.jsx'
import { uid } from '../../lib/utils.js'
import {
  COMMUNITY_CATEGORIES,
  CONTENT_STATUSES,
  CONTENT_TYPES,
} from '../../data/seed.js'
import { useApp } from '../../store/AppStore.jsx'
import { Button } from '../../components/ui/Button.jsx'
import {
  Field,
  Input,
  Select,
  Textarea,
  required,
  validate,
} from '../../components/ui/Form.jsx'
import { Dialog } from '../../components/ui/Overlay.jsx'

const BLANK = {
  title: '',
  type: 'post',
  communityId: '',
  collectionId: '',
  category: '',
  status: 'draft',
  excerpt: '',
  body: '',
  scheduledFor: '',
}

/** Turn a Date into the value a datetime-local input expects (local time). */
function toLocalInput(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
}

function fromLocalInput(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export default function ContentForm({
  open,
  onClose,
  item = null,
  defaultCommunityId = '',
  defaultStatus = 'draft',
}) {
  const { state, actions, currentMember } = useApp()
  const [form, setForm] = useState(BLANK)
  const [errors, setErrors] = useState({})

  /* Re-seed the fields whenever the dialog opens, so editing one record after
     another never leaks the previous values. */
  useEffect(() => {
    if (!open) return
    setErrors({})
    if (item) {
      setForm({
        title: item.title ?? '',
        type: item.type ?? 'post',
        communityId: item.communityId ?? '',
        collectionId: item.collectionId ?? '',
        category: item.category ?? '',
        status: item.status ?? 'draft',
        excerpt: item.excerpt ?? '',
        body: item.body ?? '',
        scheduledFor: item.scheduledFor ? toLocalInput(new Date(item.scheduledFor)) : '',
      })
    } else {
      setForm({
        ...BLANK,
        communityId: defaultCommunityId || state.communities[0]?.id || '',
        status: CONTENT_STATUSES.some((s) => s.key === defaultStatus)
          ? defaultStatus
          : 'draft',
      })
    }
  }, [open, item, defaultCommunityId, defaultStatus, state.communities])

  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }))

  const communityCollections = useMemo(
    () => state.collections.filter((c) => c.communityId === form.communityId),
    [state.collections, form.communityId],
  )

  const onSubmit = () => {
    const nextErrors = validate(
      form,
      {
        title: (v) => required(v, 'Title'),
        communityId: (v) => required(v, 'Community'),
        body: (v) => required(v, 'Body'),
        scheduledFor: (v, all) =>
          all.status === 'scheduled' && !fromLocalInput(v)
            ? 'Pick a publish date and time.'
            : '',
      },
    )
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      return
    }

    const nowIso = new Date().toISOString()
    const excerpt =
      form.excerpt.trim() || `${form.body.trim().split(/\s+/).slice(0, 22).join(' ')}…`

    const record = {
      id: item?.id ?? uid('p'),
      title: form.title.trim(),
      excerpt,
      body: form.body.trim(),
      type: form.type,
      status: form.status,
      category: form.category.trim(),
      authorId: item?.authorId ?? currentMember.id,
      communityId: form.communityId,
      collectionId: form.collectionId || null,
      publishedAt:
        form.status === 'published' ? item?.publishedAt || nowIso : null,
      scheduledFor:
        form.status === 'scheduled' ? fromLocalInput(form.scheduledFor) : null,
      metrics: item?.metrics ?? { views: 0, likes: 0, comments: 0, shares: 0 },
      updatedAt: nowIso,
    }

    if (item) {
      actions.update('content', item.id, record)
      actions.notify(`Saved “${record.title}”`, 'success')
    } else {
      actions.add('content', record)
      actions.notify(`Created “${record.title}”`, 'success')
    }

    onClose()
    if (!item) navigate(`/content/${record.id}`)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={item ? 'Edit post' : 'New post'}
      description={
        item
          ? 'Changes are stored locally and reflected across the dashboard and analytics.'
          : 'Drafts stay private until you publish or schedule them.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" icon={Save} onClick={onSubmit}>
            {item ? 'Save changes' : 'Create post'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Title" required error={errors.title}>
          <Input
            value={form.title}
            invalid={Boolean(errors.title)}
            onChange={(e) => set('title')(e.target.value)}
            placeholder="A headline that earns the click"
          />
        </Field>

        <datalist id="content-category-options">
          {COMMUNITY_CATEGORIES.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type">
            <Select value={form.type} onChange={(e) => set('type')(e.target.value)}>
              {CONTENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type[0].toUpperCase() + type.slice(1)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Status">
            <Select value={form.status} onChange={(e) => set('status')(e.target.value)}>
              {CONTENT_STATUSES.map((status) => (
                <option key={status.key} value={status.key}>
                  {status.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Community" required error={errors.communityId}>
            <Select
              value={form.communityId}
              invalid={Boolean(errors.communityId)}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  communityId: e.target.value,
                  collectionId: '',
                }))
              }
            >
              <option value="">Select a community…</option>
              {state.communities.map((community) => (
                <option key={community.id} value={community.id}>
                  {community.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Collection"
            hint={
              communityCollections.length
                ? 'Optional — groups related posts together.'
                : 'This community has no collections yet.'
            }
          >
            <Select
              value={form.collectionId}
              disabled={!communityCollections.length}
              onChange={(e) => set('collectionId')(e.target.value)}
            >
              <option value="">Uncategorised</option>
              {communityCollections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Category" hint="Press for suggestions from the shared taxonomy.">
            <Input
              value={form.category}
              list="content-category-options"
              onChange={(e) => set('category')(e.target.value)}
              placeholder="e.g. Design systems"
            />
          </Field>

          {form.status === 'scheduled' && (
            <Field label="Scheduled for" required error={errors.scheduledFor}>
              <Input
                type="datetime-local"
                value={form.scheduledFor}
                invalid={Boolean(errors.scheduledFor)}
                onChange={(e) => set('scheduledFor')(e.target.value)}
              />
            </Field>
          )}
        </div>

        <Field
          label="Excerpt"
          hint="Left blank, we trim the first lines of the body for you."
        >
          <Textarea
            rows={2}
            value={form.excerpt}
            onChange={(e) => set('excerpt')(e.target.value)}
            placeholder="The one- or two-line summary shown in the library"
          />
        </Field>

        <Field label="Body" required error={errors.body}>
          <Textarea
            rows={8}
            value={form.body}
            invalid={Boolean(errors.body)}
            onChange={(e) => set('body')(e.target.value)}
            placeholder={'Write in paragraphs, separated by a blank line.'}
          />
        </Field>
      </div>
    </Dialog>
  )
}
