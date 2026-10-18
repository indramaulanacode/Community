import { useState } from 'react'
import { ArrowUpRight, MessagesSquare, SearchX } from 'lucide-react'
import { navigate } from '../lib/router.jsx'
import { cn } from '../lib/utils.js'
import { useApp } from '../store/AppStore.jsx'
import { Button } from '../components/ui/Button.jsx'
import { EmptyState } from '../components/ui/Feedback.jsx'
import { PageHeader } from '../components/ui/Surface.jsx'
import ConversationRail from './messages/ConversationRail.jsx'
import ThreadPane from './messages/ThreadPane.jsx'
import {
  conversationRows,
  groupByCommunity,
  searchConversations,
  unreadTotal,
} from './messages/messageUtils.js'

const railVisibility = (open) => (open ? 'hidden lg:flex' : 'flex')
const threadVisibility = (open) => (open ? 'flex' : 'hidden lg:flex')

export default function MessagesPage({ params }) {
  const { state } = useApp()
  const routeId = params?.id || null

  const [query, setQuery] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(false)

  const rows = conversationRows(state)
  const matched = searchConversations(rows, query)
  const groups = groupByCommunity(matched)
  const unread = unreadTotal(state)
  const communities = new Set(rows.map((row) => row.communityId)).size
  const selected = routeId ? state.conversations.find((row) => row.id === routeId) : null
  const missing = Boolean(routeId) && !selected
  const freshest = rows[0] || null

  const description = `${rows.length} channels across ${communities} communities · ${
    unread > 0
      ? `${unread} unread message${unread === 1 ? '' : 's'}`
      : 'every channel read'
  }`

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <PageHeader title="Messages" description={description} />

      {missing ? (
        <EmptyState
          icon={SearchX}
          tone="warning"
          title="This conversation is not in the workspace"
          body={`Nothing is stored at “${routeId}”. Pick a channel from the list to keep the URL valid.`}
          action={
            <Button variant="primary" icon={MessagesSquare} onClick={() => navigate('/messages')}>
              Back to all messages
            </Button>
          }
        />
      ) : (
        <section className="grid h-[calc(100dvh-12rem)] min-h-[26rem] grid-cols-1 gap-4 lg:grid-cols-[minmax(17rem,19rem)_minmax(0,1fr)]">
          <ConversationRail
            className={railVisibility(Boolean(routeId))}
            groups={groups}
            matched={matched.length}
            total={rows.length}
            unread={unread}
            query={query}
            onQueryChange={setQuery}
            activeId={routeId}
          />

          {selected ? (
            <ThreadPane
              key={selected.id}
              conversation={selected}
              detailsOpen={detailsOpen}
              onToggleDetails={() => setDetailsOpen((open) => !open)}
              className={threadVisibility(Boolean(routeId))}
            />
          ) : (
            <EmptyState
              icon={MessagesSquare}
              tone="brand"
              className={threadVisibility(false)}
              title="Pick a conversation"
              body={
                freshest
                  ? `${freshest.title} in ${freshest.communityName} has the newest activity. Opening a channel puts it in the URL, so the thread you are reading stays shareable.`
                  : 'This workspace has no channels yet — create a community and its first channel appears here.'
              }
              action={
                freshest && (
                  <Button
                    variant="primary"
                    icon={ArrowUpRight}
                    onClick={() => navigate(`/messages/${freshest.id}`)}
                  >
                    Open {freshest.title}
                  </Button>
                )
              }
            />
          )}
        </section>
      )}
    </div>
  )
}
