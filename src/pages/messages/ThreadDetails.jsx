import { Hash, X } from 'lucide-react'
import { Link } from '../../lib/router.jsx'
import { relativeTime } from '../../lib/utils.js'
import { Avatar, Badge } from '../../components/ui/Data.jsx'
import { IconButton } from '../../components/ui/Button.jsx'
import { MetaRow, SectionTitle } from '../../components/ui/Surface.jsx'

const ROLE_TONE = { owner: 'accent', moderator: 'brand', member: 'neutral' }

const SHOWN = 10

/**
 * Channel context: what the room is for, how much has been said in it and
 * who is in it. Docked on the right at `lg`, a slide-over below it.
 */
export default function ThreadDetails({ conversation, community, people, stats, onClose }) {
  const shown = people.slice(0, SHOWN)
  const hidden = people.length - shown.length

  return (
    <aside
      aria-label={`${conversation.title} channel details`}
      className="absolute inset-y-0 right-0 z-20 flex w-[min(19rem,88%)] flex-col border-l border-line bg-surface shadow-pop lg:static lg:z-auto lg:w-[18rem] lg:shadow-none"
    >
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5">
        <SectionTitle>Details</SectionTitle>
        <IconButton icon={X} label="Close channel details" size="sm" onClick={onClose} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <p className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-content">
          <Hash size={13} className="text-content-3" aria-hidden="true" />
          <span className="min-w-0 truncate">{conversation.title}</span>
          <Badge tone="brand">{conversation.kind}</Badge>
        </p>

        {community?.about && (
          <p className="mt-2 text-[11px] leading-relaxed text-content-2">{community.about}</p>
        )}

        <dl className="mt-3 rounded-card border border-line bg-surface-2 px-3 py-1">
          <MetaRow label="Members">
            <span className="tnum">{people.length}</span>
          </MetaRow>
          <MetaRow label="Messages">
            <span className="tnum">{stats.messages}</span>
          </MetaRow>
          <MetaRow label="Reactions">
            <span className="tnum">{stats.reactions}</span>
          </MetaRow>
          <MetaRow label="People who posted">
            <span className="tnum">{stats.authors}</span>
          </MetaRow>
          <MetaRow label="Last activity">
            {stats.lastAt ? relativeTime(stats.lastAt) : 'No activity yet'}
          </MetaRow>
        </dl>

        <SectionTitle className="mt-4 pb-1">Participants</SectionTitle>
        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line">
          {shown.map((person) => (
            <li key={person.id} className="flex items-center gap-2.5 px-2.5 py-2">
              <Avatar
                name={person.name}
                hue={person.hue}
                size={8}
                status={
                  person.online
                    ? 'online'
                    : person.status === 'suspended'
                      ? 'suspended'
                      : 'offline'
                }
              />
              <span className="min-w-0 flex-1">
                <Link
                  to={`/members/${person.id}`}
                  className="block truncate text-[12px] font-medium text-content transition-colors hover:text-brand-content hover:underline"
                >
                  {person.name}
                </Link>
                <span className="block truncate text-[10px] text-content-3">{person.title}</span>
              </span>
              <Badge tone={ROLE_TONE[person.role] || 'neutral'}>{person.role}</Badge>
            </li>
          ))}
        </ul>

        {hidden > 0 && (
          <Link
            to={`/communities/${community?.id || ''}`}
            className="mt-2 block text-[11px] font-medium text-brand-content hover:underline"
          >
            See all {people.length} members on the community page
          </Link>
        )}
      </div>
    </aside>
  )
}
