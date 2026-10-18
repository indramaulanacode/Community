import { useState } from 'react'
import {
  ArrowLeft,
  CalendarClock,
  Check,
  Eye,
  FileText,
  Heart,
  Layers,
  MessageSquare,
  Pencil,
  Share2,
  Trash2,
  Users,
} from 'lucide-react'
import { navigate, Link } from '../lib/router.jsx'
import {
  cn,
  formatDay,
  formatFull,
  formatNumber,
  relativeTime,
  uid,
} from '../lib/utils.js'
import { CONTENT_STATUSES } from '../data/seed.js'
import { useApp } from '../store/AppStore.jsx'
import {
  communityStats,
  lookupCommunity,
  lookupMember,
  upcomingEvents,
} from '../store/selectors.js'
import { Button } from '../components/ui/Button.jsx'
import { Avatar, Badge, Metric, OutlineBadge, Progress } from '../components/ui/Data.jsx'
import { Card, CardBody, CardHeader, MetaRow, PageHeader } from '../components/ui/Surface.jsx'
import { ConfirmDialog, Dialog, Disclosure, Menu } from '../components/ui/Overlay.jsx'
import { Field, Input } from '../components/ui/Form.jsx'
import { EmptyState } from '../components/ui/Feedback.jsx'
import ContentForm from './content/ContentForm.jsx'

const STATUS_TONE = Object.fromEntries(CONTENT_STATUSES.map((s) => [s.key, s.tone]))

export default function ContentDetailPage({ params }) {
  const { state, actions } = useApp()
  const item = state.content.find((c) => c.id === params.id) || null

  const [editing, setEditing] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleValue, setScheduleValue] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!item) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Content not found" />
        <EmptyState
          icon={FileText}
          tone="warning"
          title="We can't open that post"
          body={`No content is stored with the id “${params.id}”. It may have been deleted.`}
          action={
            <Button variant="primary" icon={ArrowLeft} onClick={() => navigate('/content')}>
              Back to library
            </Button>
          }
        />
      </div>
    )
  }

  const author = lookupMember(state, item.authorId)
  const community = lookupCommunity(state, item.communityId)
  const collection = state.collections.find((c) => c.id === item.collectionId) || null
  const stats = community ? communityStats(state, community) : null
  const nextEvents = community ? upcomingEvents(state, 3).filter((e) => e.communityId === community.id) : []

  const engagement = item.metrics.views
    ? (((item.metrics.likes + item.metrics.comments) / item.metrics.views) * 100).toFixed(1)
    : '0.0'

  const siblings = state.content
    .filter((c) => item.collectionId && c.collectionId === item.collectionId && c.id !== item.id)
    .slice(0, 5)

  const patch = (next, message) => {
    actions.update('content', item.id, { ...next, updatedAt: new Date().toISOString() })
    actions.notify(message, 'success')
  }

  const duplicate = () => {
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
    navigate(`/content/${copy.id}`)
  }

  const menuItems = [
    { label: 'Edit', icon: Pencil, onSelect: () => setEditing(true) },
    {
      label: 'Publish',
      icon: Check,
      disabled: item.status === 'published',
      onSelect: () =>
        patch({ status: 'published', publishedAt: new Date().toISOString(), scheduledFor: null }, `Published “${item.title}”`),
    },
    {
      label: 'Move to draft',
      icon: FileText,
      disabled: item.status === 'draft',
      onSelect: () => patch({ status: 'draft', publishedAt: null, scheduledFor: null }, `“${item.title}” is now a draft`),
    },
    {
      label: 'Schedule',
      icon: CalendarClock,
      onSelect: () => {
        setScheduleValue(item.scheduledFor ? localInput(new Date(item.scheduledFor)) : '')
        setScheduleOpen(true)
      },
    },
    { label: 'Duplicate', icon: Layers, onSelect: duplicate },
    { divider: true },
    { label: 'Delete', icon: Trash2, danger: true, onSelect: () => setConfirmDelete(true) },
  ]

  const paragraphs = item.body.split('\n\n').filter(Boolean)

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <PageHeader
        title={item.title}
        breadcrumb={
          <Link
            to="/content"
            className="inline-flex items-center gap-1.5 text-[11px] text-content-3 transition-colors hover:text-brand-content"
          >
            <ArrowLeft size={12} /> Content library
          </Link>
        }
        meta={
          <>
            <Badge tone="brand">{item.type[0].toUpperCase() + item.type.slice(1)}</Badge>
            <OutlineBadge tone={STATUS_TONE[item.status]}>
              {item.status === 'scheduled' && item.scheduledFor
                ? `Scheduled · ${formatDay(item.scheduledFor)}`
                : CONTENT_STATUSES.find((s) => s.key === item.status)?.label}
            </OutlineBadge>
            {item.category && <Badge tone="neutral">{item.category}</Badge>}
            {community && (
              <Link
                to={`/communities/${community.id}`}
                className="text-[11px] text-brand-content hover:underline"
              >
                {community.name}
              </Link>
            )}
            {collection && (
              <>
                <span className="text-content-3" aria-hidden="true">·</span>
                <Link
                  to={`/collections/${collection.id}`}
                  className="text-[11px] text-brand-content hover:underline"
                >
                  {collection.name}
                </Link>
              </>
            )}
            <span className="flex items-center gap-1.5 text-[11px] text-content-2">
              <Avatar name={author?.name} hue={author?.hue} size={6} />
              {author?.name || 'Unknown author'}
            </span>
            <span className="text-[11px] text-content-3">
              {item.publishedAt
                ? `Published ${formatFull(item.publishedAt)}`
                : item.scheduledFor
                  ? `Scheduled ${formatFull(item.scheduledFor)}`
                  : `Updated ${relativeTime(item.updatedAt)}`}
            </span>
          </>
        }
        actions={
          <>
            <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/content')}>
              Back to library
            </Button>
            <Menu items={menuItems} label="Content actions" />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Views" value={formatNumber(item.metrics.views)} icon={Eye} tone="brand" />
        <Metric label="Likes" value={formatNumber(item.metrics.likes)} icon={Heart} tone="accent" />
        <Metric label="Comments" value={formatNumber(item.metrics.comments)} icon={MessageSquare} tone="info" />
        <Metric label="Shares" value={formatNumber(item.metrics.shares)} icon={Share2} tone="success" />
        <Metric label="Engagement" value={`${engagement}%`} hint="likes + comments per view" tone="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <article className="flex flex-col gap-4">
            {paragraphs.map((text, i) => (
              <p
                key={i}
                className={cn(
                  'max-w-prose text-[15px] leading-relaxed text-content',
                  i === 0 && 'font-medium',
                )}
              >
                {text}
              </p>
            ))}
          </article>
        </Card>

        <aside className="flex flex-col gap-4">
          {community && stats && (
            <Card>
              <CardHeader title="About this community" icon={Users} />
              <CardBody>
                <p className="line-clamp-3 text-xs leading-relaxed text-content-2">{community.about}</p>
                <dl className="mt-3 divide-y divide-line">
                  <MetaRow label="Members">
                    <span className="tnum">{stats.members}</span>
                  </MetaRow>
                  <MetaRow label="Upcoming events">
                    <span className="tnum">{stats.upcomingEvents}</span>
                  </MetaRow>
                  <MetaRow label="Open tasks">
                    <span className="tnum">{stats.openTasks}</span>
                  </MetaRow>
                </dl>
                <div className="mt-3">
                  <div className="mb-1.5 flex items-center justify-between text-[11px] text-content-3">
                    <span>Engagement this week</span>
                    <span className="tnum">{stats.engagementRate}%</span>
                  </div>
                  <Progress value={stats.engagementRate} label={`${stats.engagementRate} percent engaged`} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" size="xs" onClick={() => navigate(`/communities/${community.id}`)}>
                    Open community
                  </Button>
                  <Button variant="ghost" size="xs" onClick={() => navigate('/members')}>
                    Browse members
                  </Button>
                </div>
                {nextEvents.length > 0 && (
                  <ul className="mt-4 flex flex-col gap-2 border-t border-line pt-3">
                    {nextEvents.map((event) => (
                      <li key={event.id}>
                        <Link
                          to={`/events/${event.id}`}
                          className="flex items-center justify-between gap-2 text-[12px] text-content-2 hover:text-brand-content"
                        >
                          <span className="min-w-0 truncate">{event.title}</span>
                          <span className="shrink-0 text-[11px] text-content-3 tnum">
                            {formatDay(event.startsAt)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader
              title="More from this collection"
              description={collection ? collection.name : 'No collection assigned'}
            />
            <CardBody>
              {siblings.length === 0 ? (
                <p className="text-xs leading-relaxed text-content-2">
                  {collection
                    ? 'This is the only post in the collection so far.'
                    : 'Add this post to a collection to surface related reading here.'}
                </p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {siblings.map((sib) => (
                    <li key={sib.id}>
                      <Link
                        to={`/content/${sib.id}`}
                        className="group flex flex-col gap-0.5 text-[13px] font-medium text-content hover:text-brand-content"
                      >
                        <span className="line-clamp-1">{sib.title}</span>
                        <span className="text-[11px] font-normal text-content-3">
                          {CONTENT_STATUSES.find((s) => s.key === sib.status)?.label} ·{' '}
                          {relativeTime(sib.updatedAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Disclosure summary="About these metrics">
            <p className="text-xs leading-relaxed text-content-2">
              Views, likes, comments and shares are seeded demo figures stored on the record. They
              do not reflect real traffic, and engagement is calculated from them for illustration
              only. Editing or duplicating a post keeps its metrics so you can see how the UI
              handles live data.
            </p>
          </Disclosure>
        </aside>
      </div>

      <ContentForm open={editing} item={item} onClose={() => setEditing(false)} />

      <Dialog
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        size="sm"
        title="Schedule publication"
        description="Stays hidden until this time, then moves to Published in a real deployment."
        footer={
          <>
            <Button variant="ghost" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={CalendarClock}
              disabled={!scheduleValue}
              onClick={() => {
                const iso = new Date(scheduleValue).toISOString()
                patch(
                  { status: 'scheduled', scheduledFor: iso, publishedAt: null },
                  `Scheduled for ${formatDay(iso)}`,
                )
                setScheduleOpen(false)
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

      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          actions.remove('content', item.id)
          actions.notify(`Deleted “${item.title}”`, 'info')
          navigate('/content')
        }}
        title="Delete this content?"
        body={`“${item.title}” will be removed from the library. This cannot be undone in the demo.`}
        confirmLabel="Delete"
      />
    </div>
  )
}

function localInput(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
