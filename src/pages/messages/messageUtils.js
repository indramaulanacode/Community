/**
 * Derived reads for the messages workspace.
 *
 * The rail, the thread and the details panel all come from these helpers, so
 * sending a message or adding a reaction updates every surface at once.
 */
import {
  DAY_MS,
  dayKey,
  formatDay,
  groupBy,
  matchesQuery,
  sum,
} from '../../lib/utils.js'
import { lookupCommunity, lookupMember } from '../../store/selectors.js'

/** Community `accent` token → avatar hue, so a room keeps one identity colour. */
const ACCENT_HUES = {
  accent: 348,
  brand: 212,
  success: 148,
  warning: 38,
  'chart-1': 212,
  'chart-3': 168,
  'chart-4': 276,
  'chart-5': 32,
}

export function communityHue(community) {
  return ACCENT_HUES[community?.accent] ?? 212
}

/** Seed copy can carry line breaks; previews only ever show the first one. */
export function firstLine(body) {
  return String(body ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)[0] || ''
}

/** Every paragraph of a message body, in order. */
export function messageLines(body) {
  return String(body ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

/** Rail rows: conversation + community + last-message preview, newest first. */
export function conversationRows(state) {
  return state.conversations
    .map((conversation) => {
      const community = lookupCommunity(state, conversation.communityId)
      const last = conversation.messages[conversation.messages.length - 1] || null
      const author = last ? lookupMember(state, last.authorId) : null
      return {
        ...conversation,
        community,
        communityName: community?.name || 'Unfiled channels',
        communityCategory: community?.category || null,
        lastMessage: last,
        previewAuthor: author ? author.name.split(' ')[0] : 'No one',
        preview: last ? firstLine(last.body) || 'Empty channel' : 'No messages yet',
      }
    })
    .sort((a, b) => new Date(b.lastActivityAt) - new Date(a.lastActivityAt))
}

/** Channel title, community name and the last message all match. */
export function searchConversations(rows, query) {
  if (!query.trim()) return rows
  return rows.filter((row) =>
    matchesQuery(
      {
        title: row.title,
        communityName: row.communityName,
        lastMessage: `${row.previewAuthor} ${row.preview}`,
      },
      query,
      ['title', 'communityName', 'lastMessage'],
    ),
  )
}

/** Channels grouped under their community, most recent group first. */
export function groupByCommunity(rows) {
  return [...groupBy(rows, (row) => row.community?.id || 'unfiled').entries()].map(
    ([communityId, channels]) => ({
      communityId,
      community: channels[0].community,
      channels,
      unread: sum(channels, (channel) => channel.unread),
    }),
  )
}

/** Day separator label: Today / Yesterday, then the kit's short date. */
export function dayHeading(iso, now = Date.now()) {
  const key = dayKey(iso)
  if (key === dayKey(now)) return 'Today'
  if (key === dayKey(now - DAY_MS)) return 'Yesterday'
  return formatDay(iso)
}

/**
 * Consecutive messages by one author on one day collapse into a single row,
 * which is what makes a long thread scannable.
 */
export function groupMessages(messages) {
  const ordered = [...messages].sort((a, b) => new Date(a.at) - new Date(b.at))
  const groups = []

  for (const message of ordered) {
    const day = dayKey(message.at)
    const open = groups[groups.length - 1]
    if (open && open.day === day && open.authorId === message.authorId) {
      open.messages.push(message)
    } else {
      groups.push({
        key: message.id,
        day,
        startedAt: message.at,
        authorId: message.authorId,
        messages: [message],
      })
    }
  }

  return groups
}

/** Message, reaction and participant counts, live from the stored records. */
export function conversationStats(conversation) {
  const messages = conversation?.messages || []
  return {
    messages: messages.length,
    reactions: sum(messages, (message) => message.reactions),
    authors: new Set(messages.map((message) => message.authorId)).size,
    lastAt: messages[messages.length - 1]?.at || conversation?.lastActivityAt || null,
  }
}

export function unreadTotal(state) {
  return sum(state.conversations, (conversation) => conversation.unread)
}

/** Owner first, then moderators, then everyone else by name. */
export function sortedParticipants(state, community, memberIds) {
  const people = memberIds.map((id) => lookupMember(state, id)).filter(Boolean)
  const rank = (person) =>
    person.id === community?.ownerId ? 0 : community?.moderatorIds?.includes(person.id) ? 1 : 2
  return [...people].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
}
