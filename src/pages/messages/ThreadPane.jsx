import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, ChevronLeft, Info, MessagesSquare, Send, ThumbsUp } from 'lucide-react'
import { Link, navigate } from '../../lib/router.jsx'
import { clamp, cn, formatTime } from '../../lib/utils.js'
import { lookupCommunity, lookupMember } from '../../store/selectors.js'
import { useApp } from '../../store/AppStore.jsx'
import { Button, IconButton } from '../../components/ui/Button.jsx'
import { Avatar, AvatarStack, Badge } from '../../components/ui/Data.jsx'
import { Card, Divider } from '../../components/ui/Surface.jsx'
import { EmptyState } from '../../components/ui/Feedback.jsx'
import { Textarea } from '../../components/ui/Form.jsx'
import ThreadDetails from './ThreadDetails.jsx'
import {
  communityHue,
  conversationStats,
  dayHeading,
  groupMessages,
  messageLines,
  sortedParticipants,
} from './messageUtils.js'

/** One message: bubble, optional per-line time and a working reaction control. */
function MessageRow({ message, index, group, author, mine, onReact }) {
  return (
    <li className={cn('flex w-full items-start gap-2', mine && 'flex-row-reverse')}>
      <div
        className={cn(
          'max-w-2xl rounded-card border px-3 py-2 text-[13px] leading-relaxed text-content',
          mine ? 'border-brand/25 bg-brand-soft' : 'border-line bg-surface-2',
        )}
      >
        {messageLines(message.body).map((line, lineIndex) => (
          <p key={line + lineIndex} className={lineIndex ? 'mt-1.5' : ''}>
            {line}
          </p>
        ))}
      </div>

      <div className={cn('flex shrink-0 items-center gap-1.5 pt-1', mine && 'flex-row-reverse')}>
        {group.messages.length > 1 && index > 0 && (
          <span className="text-[10px] whitespace-nowrap text-content-3 tnum">
            {formatTime(message.at)}
          </span>
        )}
        <button
          type="button"
          onClick={() => onReact(message.id)}
          aria-label={`Add a reaction to ${author?.name || 'a member'}’s message`}
          className="flex items-center gap-1 rounded-full border border-line bg-surface px-1.5 py-0.5 text-[10px] font-medium text-content-3 transition-colors hover:border-line-2 hover:bg-surface-2 hover:text-content"
        >
          <ThumbsUp size={11} strokeWidth={1.9} aria-hidden="true" />
          {message.reactions > 0 && <span className="tnum">{message.reactions}</span>}
        </button>
      </div>
    </li>
  )
}

export default function ThreadPane({ conversation, detailsOpen, onToggleDetails, className = '' }) {
  const { state, actions } = useApp()
  const [draft, setDraft] = useState('')
  const scroller = useRef(null)
  const field = useRef(null)

  const community = lookupCommunity(state, conversation.communityId)
  const people = sortedParticipants(state, community, conversation.memberIds)
  const stats = conversationStats(conversation)
  const groups = groupMessages(conversation.messages)

  /* Opening a channel clears its unread badge — and only when it has one. */
  useEffect(() => {
    const stored = state.conversations.find((item) => item.id === conversation.id)
    if (stored && stored.unread > 0) actions.readConversation(stored.id)
  }, [conversation.id])

  /* Follow the thread to the newest message when it opens or grows. */
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [conversation.id, conversation.messages.length])

  /* The composer grows with the draft, up to four lines. */
  useEffect(() => {
    const el = field.current
    if (el) el.style.height = `${clamp(el.scrollHeight, 80, 200)}px`
  }, [draft])

  const send = () => {
    const body = draft.trim()
    if (!body) return
    actions.sendMessage(conversation.id, body)
    setDraft('')
  }

  /* Messages live inside the conversation record, so the patch goes through it. */
  const addReaction = (messageId) => {
    actions.update('conversations', conversation.id, {
      messages: conversation.messages.map((message) =>
        message.id === messageId ? { ...message, reactions: message.reactions + 1 } : message,
      ),
    })
  }

  return (
    <Card padded={false} className={cn('relative min-h-0 flex-col overflow-hidden', className)}>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2.5 sm:px-4">
            <IconButton
              icon={ChevronLeft}
              label="Back to all conversations"
              size="sm"
              className="lg:hidden"
              onClick={() => navigate('/messages')}
            />
            <Avatar
              name={community?.name || conversation.title}
              hue={communityHue(community)}
              size={9}
              className="hidden sm:block"
            />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold text-content">{conversation.title}</h2>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-content-3">
                {community && (
                  <>
                    <Link
                      to={`/communities/${community.id}`}
                      className="font-medium text-brand-content hover:underline"
                    >
                      {community.name}
                    </Link>
                    <span aria-hidden="true">·</span>
                  </>
                )}
                <span className="tnum">{people.length} members</span>
                <span aria-hidden="true">·</span>
                <span className="tnum">{stats.messages} messages</span>
              </p>
            </div>
            <AvatarStack people={people} max={5} size={8} className="hidden md:flex" />
            {community && (
              <IconButton
                icon={ArrowUpRight}
                label={`Open ${community.name} community page`}
                size="sm"
                onClick={() => navigate(`/communities/${community.id}`)}
              />
            )}
            <IconButton
              icon={Info}
              label={detailsOpen ? 'Hide channel details' : 'Show channel details'}
              size="sm"
              active={detailsOpen}
              aria-pressed={detailsOpen}
              onClick={onToggleDetails}
            />
          </header>

          <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4">
            {groups.length === 0 ? (
              <EmptyState
                icon={MessagesSquare}
                title="No messages yet"
                body={`${conversation.title} is quiet. Say the first thing — it is saved in this browser only.`}
                tone="brand"
              />
            ) : (
              <ol className="flex flex-col gap-3.5">
                {groups.map((group, index) => {
                  const author = lookupMember(state, group.authorId)
                  const mine = group.authorId === state.currentUserId
                  const newDay = index === 0 || groups[index - 1].day !== group.day
                  return (
                    <li key={group.key} className="flex flex-col gap-2">
                      {newDay && <Divider label={dayHeading(group.startedAt)} />}
                      <div className={cn('flex gap-2.5', mine && 'flex-row-reverse')}>
                        {author ? (
                          <Link
                            to={`/members/${author.id}`}
                            aria-label={`View ${author.name}’s profile`}
                            className="shrink-0"
                          >
                            <Avatar
                              name={author.name}
                              hue={author.hue}
                              size={9}
                              status={author.online ? 'online' : undefined}
                            />
                          </Link>
                        ) : (
                          <span className="shrink-0">
                            <Avatar name="?" size={9} />
                          </span>
                        )}
                        <div className={cn('flex min-w-0 flex-1 flex-col', mine && 'items-end')}>
                          <p
                            className={cn(
                              'flex max-w-full flex-wrap items-baseline gap-x-2 gap-y-0.5',
                              mine && 'justify-end',
                            )}
                          >
                            <span className="truncate text-[13px] font-semibold text-content">
                              {author?.name || 'Former member'}
                            </span>
                            {author && (
                              <span className="truncate text-[11px] text-content-3">
                                @{author.handle}
                              </span>
                            )}
                            <span className="text-[10px] whitespace-nowrap text-content-3 tnum">
                              {formatTime(group.startedAt)}
                            </span>
                            {mine && <Badge tone="brand">You</Badge>}
                          </p>
                          <ul className={cn('mt-1 flex w-full flex-col gap-1.5', mine && 'items-end')}>
                            {group.messages.map((message, messageIndex) => (
                              <MessageRow
                                key={message.id}
                                message={message}
                                index={messageIndex}
                                group={group}
                                author={author}
                                mine={mine}
                                onReact={addReaction}
                              />
                            ))}
                          </ul>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>

          <footer className="shrink-0 border-t border-line px-3 py-3 sm:px-4">
            <form
              className="flex items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                send()
              }}
            >
              <Textarea
                ref={field}
                rows={2}
                value={draft}
                className="flex-1"
                aria-label={`Write a message to ${conversation.title}`}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    send()
                  }
                }}
              />
              <Button type="submit" variant="primary" icon={Send} disabled={!draft.trim()}>
                Send
              </Button>
            </form>
            <p className="mt-1.5 text-[10px] leading-snug text-content-3">
              Enter sends, Shift + Enter adds a line. Messages are written to this browser — the
              template has no backend to deliver them.
            </p>
          </footer>
        </div>

        {detailsOpen && (
          <ThreadDetails
            conversation={conversation}
            community={community}
            people={people}
            stats={stats}
            onClose={onToggleDetails}
          />
        )}
      </div>
    </Card>
  )
}
