import { useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  Check,
  FolderOpen,
  Monitor,
  Moon,
  ShieldCheck,
  Sun,
  TrendingUp,
  UsersRound,
} from 'lucide-react'
import { Link, navigate } from '../lib/router.jsx'
import { COMMUNITY_CATEGORIES } from '../data/seed.js'
import { useApp } from '../store/AppStore.jsx'
import { dashboardSummary, memberGrowthSeries } from '../store/selectors.js'
import { Button } from '../components/ui/Button.jsx'
import { AvatarStack, Badge, Metric, OutlineBadge } from '../components/ui/Data.jsx'
import { Card, CardBody, CardHeader, SectionTitle } from '../components/ui/Surface.jsx'
import { Checkbox, Field, Input, Select, isEmail, required, validate } from '../components/ui/Form.jsx'
import { Segmented } from '../components/ui/Navigation.jsx'
import { LineChart } from '../components/ui/Charts.jsx'

const THEME_OPTIONS = [
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'dark', label: 'Dark', icon: Moon },
  { key: 'system', label: 'System', icon: Monitor },
]

/** The product mark, drawn from tokens so it themes with the rest of the app. */
function SignupBrand() {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-fill text-white"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" width="18" height="18">
          <circle cx="9.5" cy="9" r="2.6" className="fill-current" />
          <circle cx="15.5" cy="9" r="2.6" className="fill-accent" />
          <path d="M4 17.5a5.5 5.5 0 0 1 11 0z" className="fill-current" />
          <path d="M12.6 17.5a5 5 0 0 1 9.4 0z" className="fill-accent" />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold tracking-tight text-content">Communities</span>
        <span className="block text-[10px] text-content-3">Community management dashboard</span>
      </span>
    </span>
  )
}

/** Real components over live records — the preview is the product, not a picture of it. */
function WorkspacePreview() {
  const { state } = useApp()
  const summary = dashboardSummary(state)
  const growth = memberGrowthSeries(state)
  const stack = [...state.members]
    .sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt))
    .slice(0, 5)
    .map((member) => ({ id: member.id, name: member.name, hue: member.hue }))
  const busiest = [...state.communities]
    .sort((a, b) => b.memberIds.length - a.memberIds.length)
    .slice(0, 3)

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <SectionTitle action={<OutlineBadge tone="success">Live demo data</OutlineBadge>}>
        Inside the workspace
      </SectionTitle>

      <div className="grid grid-cols-2 gap-3">
        <Metric
          label="Members"
          value={summary.totalMembers}
          hint={`${summary.onlineNow} online now`}
          icon={UsersRound}
          tone="brand"
        />
        <Metric
          label="Engagement"
          value={`${summary.engagementRate}%`}
          hint={`${summary.activeMembers} active accounts`}
          icon={TrendingUp}
          tone="accent"
        />
        <Metric
          label="Events"
          value={summary.upcomingEvents}
          hint="on the calendar ahead"
          icon={CalendarDays}
          tone="info"
        />
        <Metric
          label="Library items"
          value={state.content.length}
          hint={`${summary.drafts} still drafts`}
          icon={FolderOpen}
          tone="success"
        />
      </div>

      <Card>
        <CardHeader
          title="Member growth"
          description={`Trailing 12 months across ${state.communities.length} communities, counted from the roster.`}
          icon={TrendingUp}
        />
        <CardBody>
          <LineChart
            data={growth}
            xKey="label"
            height={180}
            series={[{ key: 'total', label: 'Members' }]}
            formatValue={(value) => Math.round(value)}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Who is here"
          description={`The five newest of the ${state.members.length} members in the roster.`}
          icon={UsersRound}
          action={<AvatarStack people={stack} max={5} size={8} />}
        />
        <CardBody>
          <ul className="flex flex-col gap-1.5">
            {busiest.map((community) => (
              <li
                key={community.id}
                className="flex items-center gap-2 rounded-control border border-line bg-surface-2 px-2.5 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-content">
                  {community.name}
                </span>
                <OutlineBadge tone="neutral">{community.memberIds.length} members</OutlineBadge>
                <OutlineBadge tone={community.visibility === 'private' ? 'warning' : 'success'}>
                  {community.visibility}
                </OutlineBadge>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge tone="brand">{state.events.length} events scheduled</Badge>
            <Badge tone="accent">{state.tasks.filter((task) => task.status !== 'done').length} open tasks</Badge>
            <Badge tone="info">{state.conversations.length} channels</Badge>
            <Badge tone="neutral">{summary.overdueTasks} overdue</Badge>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

export default function SignupPage() {
  const { state, actions, currentMember } = useApp()
  const [form, setForm] = useState({ workspace: '', name: '', email: '', focus: '' })
  const [errors, setErrors] = useState({})
  const [emailOptIn, setEmailOptIn] = useState(false)

  const setField = (key) => (event) => {
    const { value } = event.target
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  const rules = {
    workspace: (value) => required(value, 'Workspace name'),
    name: (value) => required(value, 'Your name'),
    email: (value) => required(value, 'Work email') || isEmail(value),
    focus: (value) => required(value, 'Community focus'),
  }

  const onSubmit = (event) => {
    event.preventDefault()
    const found = validate(form, rules)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      actions.notify('Check the highlighted fields to continue', 'warning')
      return
    }

    /* Demo mode: write the entered details into the store, then hand over to the app. */
    actions.updateWorkspace({ name: form.workspace.trim(), focus: form.focus })
    if (currentMember) actions.update('members', currentMember.id, { name: form.name.trim() })
    actions.notify(
      emailOptIn
        ? 'Workspace created — demo mode, nothing left the browser. Product updates noted.'
        : 'Workspace created — demo mode, nothing left the browser',
      'success',
    )
    navigate('/dashboard')
  }

  const summary = dashboardSummary(state)
  const benefits = [
    {
      icon: UsersRound,
      title: 'A directory you can actually run',
      body: `${state.communities.length} communities with their categories, channels, owners and unread activity — searchable, filterable, paginated.`,
    },
    {
      icon: ShieldCheck,
      title: 'A roster with roles and moderation',
      body: `${summary.totalMembers} members tracked by role, status and presence, from owner down to invited, each with their own profile route.`,
    },
    {
      icon: Check,
      title: 'The rest of the workflow',
      body: `${summary.upcomingEvents} upcoming events on a real calendar, ${summary.openTasks} open tasks on the board, ${state.content.length} library items and analytics computed from the same records.`,
    },
  ]

  return (
    <div className="flex min-h-dvh flex-col bg-bg lg:flex-row">
      <section className="flex min-w-0 flex-1 flex-col justify-center px-5 py-8 sm:px-8 lg:px-12 xl:px-16">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6">
          <div className="flex items-center justify-between gap-3">
            <SignupBrand />
            <Segmented
              size="sm"
              value={state.prefs.theme}
              onChange={(value) => actions.setPref('theme', value)}
              options={THEME_OPTIONS}
            />
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-content sm:text-3xl">
              Bring every community into one workspace
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-content-2">
              Communities is a community-management dashboard for directories, rosters, events,
              tasks, content and analytics. Create a workspace below and the demo re-renders around
              your name.
            </p>
          </div>

          <ul className="flex flex-col gap-2.5">
            {benefits.map((benefit) => (
              <li key={benefit.title} className="flex gap-2.5">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-control bg-brand-soft text-brand-content">
                  <benefit.icon size={14} strokeWidth={1.9} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-content">
                    {benefit.title}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-content-2">
                    {benefit.body}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
            <Field
              label="Workspace name"
              required
              error={errors.workspace}
              hint="Shown in the sidebar and on every workspace screen."
            >
              <Input
                name="workspace"
                autoComplete="organization"
                value={form.workspace}
                onChange={setField('workspace')}
                invalid={Boolean(errors.workspace)}
              />
            </Field>

            <Field
              label="Your name"
              required
              error={errors.name}
              hint="Sets the greeting on your dashboard."
            >
              <Input
                name="name"
                autoComplete="name"
                value={form.name}
                onChange={setField('name')}
                invalid={Boolean(errors.name)}
              />
            </Field>

            <Field
              label="Work email"
              required
              error={errors.email}
              hint="Demo only — this template never sends email."
            >
              <Input
                type="email"
                inputMode="email"
                name="email"
                autoComplete="email"
                value={form.email}
                onChange={setField('email')}
                invalid={Boolean(errors.email)}
              />
            </Field>

            <Field
              label="Community focus"
              required
              error={errors.focus}
              hint="Saved with your workspace record so the demo knows what you are building."
            >
              <Select
                name="focus"
                value={form.focus}
                onChange={setField('focus')}
                invalid={Boolean(errors.focus)}
              >
                <option value="">Choose a focus</option>
                {COMMUNITY_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </Field>

            <Checkbox
              label="Product updates by email"
              description="Reflected in the confirmation toast — nothing is sent anywhere."
              checked={emailOptIn}
              onChange={(event) => setEmailOptIn(event.target.checked)}
            />

            <Button type="submit" variant="primary" size="lg" iconRight={ArrowRight} className="w-full">
              Create workspace
            </Button>

            <p className="text-center text-[11px] text-content-2">
              Just looking?{' '}
              <Link to="/dashboard" className="font-semibold text-brand-content hover:underline">
                Explore the demo without signing up
              </Link>
            </p>

            <p className="rounded-card border border-line bg-surface-2 px-3 py-2 text-[11px] leading-relaxed text-content-3">
              This is a front-end demo template. Submitted values are stored in{' '}
              <span className="font-mono text-content-2">localStorage</span> in this browser only —
              no account is created, no password is asked for and no request leaves the page.
            </p>
          </form>

          <div className="grid grid-cols-3 gap-3 lg:hidden">
            <Metric label="Members" value={summary.totalMembers} icon={UsersRound} tone="brand" />
            <Metric label="Communities" value={state.communities.length} icon={ShieldCheck} tone="accent" />
            <Metric label="Events" value={summary.upcomingEvents} icon={CalendarDays} tone="info" />
          </div>
        </div>
      </section>

      <section
        aria-label="Product preview"
        className="hidden min-w-0 flex-col items-center justify-center border-l border-line bg-surface px-8 py-10 lg:flex lg:w-[46%] xl:px-10"
      >
        <WorkspacePreview />
      </section>
    </div>
  )
}
