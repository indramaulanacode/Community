import { ArrowUpRight, Eraser, Hash, SearchX } from 'lucide-react'
import { Link } from '../../lib/router.jsx'
import { cn, relativeTime, sum } from '../../lib/utils.js'
import { useApp } from '../../store/AppStore.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Avatar, Badge, SearchInput } from '../../components/ui/Data.jsx'
import { EmptyState } from '../../components/ui/Feedback.jsx'
import { Card, SectionTitle } from '../../components/ui/Surface.jsx'
import { communityHue } from './messageUtils.js'

function ConversationRow({ row, active }) {
  return (
    <li>
      <Link
        to={`/messages/${row.id}`}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex items-start gap-2.5 rounded-control px-2 py-2 transition-colors',
          active ? 'bg-brand-soft' : 'hover:bg-surface-2',
        )}
      >
        <Avatar name={row.communityName} hue={communityHue(row.community)} size={9} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-[13px] font-semibold',
                active ? 'text-brand-content' : 'text-content',
              )}
            >
              {row.title}
            </span>
            <span className="shrink-0 text-[10px] whitespace-nowrap text-content-3 tnum">
              {relativeTime(row.lastActivityAt)}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-[10px] text-content-3">
            {row.communityName}
            {row.communityCategory ? ` · ${row.communityCategory}` : ''}
          </span>
          <span className="mt-1 flex items-center gap-1.5">
            <span className="min-w-0 flex-1 truncate text-[11px] text-content-2">
              <span className="font-medium text-content">{row.previewAuthor}</span> {row.preview}
            </span>
            {row.unread > 0 && (
              <Badge tone="accent">
                {row.unread}
                <span className="sr-only"> unread</span>
              </Badge>
            )}
          </span>
        </span>
      </Link>
    </li>
  )
}

function CommunityLinks() {
  const { state } = useApp()

  return (
    <div className="mt-3 rounded-card border border-line bg-surface-2 p-2.5">
      <SectionTitle
        className="px-1 pb-1.5"
        action={
          <Link
            to="/communities"
            className="text-[10px] font-semibold text-brand-content hover:underline"
          >
            Directory
          </Link>
        }
      >
        Communities
      </SectionTitle>
      <ul className="flex flex-col">
        {state.communities.map((community) => {
          const channels = state.conversations.filter(
            (conversation) => conversation.communityId === community.id,
          )
          const unread = sum(channels, (conversation) => conversation.unread)
          return (
            <li key={community.id}>
              <Link
                to={`/communities/${community.id}`}
                className="flex items-center gap-2 rounded-control px-1 py-1.5 text-[11px] text-content-2 transition-colors hover:bg-surface-3 hover:text-content"
              >
                <Avatar name={community.name} hue={communityHue(community)} size={6} />
                <span className="min-w-0 flex-1 truncate font-medium">{community.name}</span>
                {unread > 0 && <span className="shrink-0 text-content-3 tnum">{unread}</span>}
                <ArrowUpRight size={12} className="shrink-0 text-content-3" />
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function ConversationRail({
  groups,
  matched,
  total,
  unread,
  query,
  onQueryChange,
  activeId,
  className = '',
}) {
  return (
    <Card padded={false} className={cn('min-h-0 flex-col overflow-hidden', className)}>
      <div className="border-b border-line p-3">
        <SearchInput
          value={query}
          onChange={onQueryChange}
          label="Search conversations"
          resultCount={matched}
        />
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-content-3">
          <Hash size={11} className="shrink-0" aria-hidden="true" />
          <span className="tnum">{total}</span> channels
          <span aria-hidden="true">·</span>
          <span className="tnum">{unread}</span> unread
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {matched === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No channels match"
            body={
              query.trim()
                ? `Nothing found for “${query.trim()}”. Try a community name or a word from a message.`
                : 'This workspace has no channels yet.'
            }
            action={
              query.trim() ? (
                <Button variant="secondary" size="sm" icon={Eraser} onClick={() => onQueryChange('')}>
                  Clear search
                </Button>
              ) : (
                <Link
                  to="/communities"
                  className="text-[11px] font-semibold text-brand-content hover:underline"
                >
                  Open the community directory
                </Link>
              )
            }
            tone="brand"
            className="m-1"
          />
        ) : (
          groups.map((group) => (
            <div key={group.communityId} className="mb-3">
              <SectionTitle
                className="px-2 pt-1.5 pb-1"
                action={
                  group.unread > 0 ? (
                    <Badge tone="accent">
                      {group.unread}
                      <span className="sr-only"> unread in this community</span>
                    </Badge>
                  ) : null
                }
              >
                {group.community?.name || 'Unfiled'}
              </SectionTitle>
              <ul className="flex flex-col gap-0.5">
                {group.channels.map((row) => (
                  <ConversationRow key={row.id} row={row} active={row.id === activeId} />
                ))}
              </ul>
            </div>
          ))
        )}

        <CommunityLinks />
      </div>
    </Card>
  )
}
