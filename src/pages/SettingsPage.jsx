import { useState } from 'react'
import {
  AlertTriangle,
  Bell,
  Building2,
  Database,
  Download,
  Info,
  Palette,
  RefreshCw,
  RotateCcw,
  Save,
  Shield,
  Sparkles,
  UserCog,
} from 'lucide-react'
import { navigate, Link } from '../lib/router.jsx'
import { cn, downloadFile, formatFull, formatNumber, relativeTime } from '../lib/utils.js'
import { storageAvailable } from '../lib/storage.js'
import { useApp } from '../store/AppStore.jsx'
import { engagementSeries } from '../store/selectors.js'
import { Button } from '../components/ui/Button.jsx'
import {
  Avatar,
  Badge,
  Metric,
  Progress,
  TableShell,
  Td,
  Th,
  Tr,
} from '../components/ui/Data.jsx'
import {
  Field,
  Input,
  Select,
  Switch,
  Textarea,
  isEmail,
  required,
  validate,
} from '../components/ui/Form.jsx'
import { Card, CardBody, CardHeader, MetaRow, PageHeader } from '../components/ui/Surface.jsx'
import { Segmented, Tabs } from '../components/ui/Navigation.jsx'
import { ConfirmDialog } from '../components/ui/Overlay.jsx'
import { Sparkline } from '../components/ui/Charts.jsx'

const SECTIONS = [
  { key: 'profile', label: 'Profile', icon: UserCog },
  { key: 'workspace', label: 'Workspace', icon: Building2 },
  { key: 'appearance', label: 'Appearance', icon: Palette },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'data', label: 'Demo data', icon: Database },
]

const HUES = [212, 348, 168, 276, 32, 190, 8, 128]

function formatBytes(n) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

function downloadJson(filename, data) {
  downloadFile(filename, JSON.stringify(data, null, 2), 'application/json')
}

const isDirty = (a, b) => JSON.stringify(a) !== JSON.stringify(b)

/* ------------------------------------------------------------- form footer -- */

function PanelHeader({ title, description, children }) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      {children}
    </Card>
  )
}

function SaveRow({ dirty, onSave, onCancel, saving }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
      <p className={cn('text-[11px]', dirty ? 'text-warning-content' : 'text-content-3')}>
        {dirty ? 'You have unsaved changes.' : 'All changes saved.'}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="ghost" disabled={!dirty} onClick={onCancel}>
          Discard
        </Button>
        <Button variant="primary" icon={Save} disabled={!dirty} loading={saving} onClick={onSave}>
          Save changes
        </Button>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- profile -- */

function ProfilePanel() {
  const { currentMember, actions } = useApp()
  const member = currentMember
  const initial = {
    name: member.name,
    handle: member.handle,
    email: member.email,
    title: member.title,
    location: member.location,
    bio: member.bio,
    hue: member.hue,
  }
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState({})
  const dirty = isDirty(draft, initial)
  const set = (key) => (value) => setDraft((prev) => ({ ...prev, [key]: value }))

  const save = () => {
    const next = validate(draft, {
      name: (v) => required(v, 'Name'),
      handle: (v) => required(v, 'Handle'),
      email: (v) => required(v, 'Email') || isEmail(v),
    })
    setErrors(next)
    if (Object.keys(next).length) return
    actions.update('members', member.id, {
      name: draft.name.trim(),
      handle: draft.handle.trim().replace(/^@/, ''),
      email: draft.email.trim(),
      title: draft.title.trim(),
      location: draft.location.trim(),
      bio: draft.bio.trim(),
      hue: draft.hue,
    })
    actions.notify('Profile updated', 'success')
  }

  return (
    <div className="flex flex-col gap-4">
      <PanelHeader
        title="Your profile"
        description="How other members see you across every community. Stored locally in the demo."
      >
        <CardBody>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Avatar name={draft.name} hue={draft.hue} size={16} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-content">{draft.name || 'Unnamed'}</p>
                <p className="truncate text-[11px] text-content-3">
                  @{draft.handle} · {draft.title}
                </p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-content-2">Avatar colour</p>
              <div className="flex flex-wrap gap-2">
                {HUES.map((hue) => (
                  <button
                    key={hue}
                    type="button"
                    aria-label={`Use accent hue ${hue}`}
                    aria-pressed={draft.hue === hue}
                    onClick={() => set('hue')(hue)}
                    className={cn(
                      'rounded-full ring-2 transition-all',
                      draft.hue === hue ? 'ring-brand' : 'ring-transparent hover:ring-line-2',
                    )}
                  >
                    <Avatar name={draft.name} hue={hue} size={9} />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Display name" required error={errors.name}>
                <Input value={draft.name} invalid={Boolean(errors.name)} onChange={(e) => set('name')(e.target.value)} />
              </Field>
              <Field label="Handle" required error={errors.handle} hint="No spaces — shown as @handle.">
                <Input value={draft.handle} invalid={Boolean(errors.handle)} onChange={(e) => set('handle')(e.target.value)} />
              </Field>
              <Field label="Email" required error={errors.email}>
                <Input type="email" value={draft.email} invalid={Boolean(errors.email)} onChange={(e) => set('email')(e.target.value)} />
              </Field>
              <Field label="Job title">
                <Input value={draft.title} onChange={(e) => set('title')(e.target.value)} />
              </Field>
              <Field label="Location">
                <Input value={draft.location} onChange={(e) => set('location')(e.target.value)} />
              </Field>
            </div>

            <Field label="Bio">
              <Textarea rows={3} value={draft.bio} onChange={(e) => set('bio')(e.target.value)} />
            </Field>

            <SaveRow
              dirty={dirty}
              onSave={save}
              onCancel={() => {
                setDraft(initial)
                setErrors({})
              }}
            />
          </div>
        </CardBody>
      </PanelHeader>

      <PanelHeader title="Account details" description="Assigned by the workspace — not editable here.">
        <CardBody>
          <dl className="grid gap-x-8 sm:grid-cols-2">
            <MetaRow label="Role">
              <span className="capitalize">{member.role}</span>
            </MetaRow>
            <MetaRow label="Level">
              <span className="tnum">Level {member.level}</span>
            </MetaRow>
            <MetaRow label="Joined">{formatFull(member.joinedAt)}</MetaRow>
            <MetaRow label="Last active">{relativeTime(member.lastActiveAt)}</MetaRow>
            <MetaRow label="Contributions">
              <span className="tnum">
                {member.contributions.posts} posts · {member.contributions.comments} comments ·{' '}
                {member.contributions.reactions} reactions
              </span>
            </MetaRow>
            <MetaRow label="Communities">
              <span className="tnum">{member.communityIds.length}</span>
            </MetaRow>
          </dl>
        </CardBody>
      </PanelHeader>
    </div>
  )
}

/* -------------------------------------------------------------- workspace -- */

function WorkspacePanel() {
  const { state, actions } = useApp()
  const ws = state.workspace
  const initial = {
    name: ws.name,
    plan: ws.plan,
    seatLimit: String(ws.seatLimit),
    domain: ws.domain,
    timezone: ws.timezone,
    billingContact: ws.billingContact,
  }
  const [draft, setDraft] = useState(initial)
  const [savedFrom, setSavedFrom] = useState(initial)
  const [errors, setErrors] = useState({})
  const [confirmReset, setConfirmReset] = useState(false)
  const dirty = isDirty(draft, savedFrom)
  const set = (key) => (value) => setDraft((prev) => ({ ...prev, [key]: value }))

  const seatsUsed = state.members.length
  const pct = Math.min(100, ws.seatLimit ? (seatsUsed / ws.seatLimit) * 100 : 0)

  const save = () => {
    const next = validate(draft, {
      name: (v) => required(v, 'Workspace name'),
      seatLimit: (v) => (/^\d+$/.test(String(v)) && Number(v) > 0 ? '' : 'Enter a whole number above zero.'),
      domain: (v) => required(v, 'Domain'),
      timezone: (v) => required(v, 'Timezone'),
      billingContact: (v) => required(v, 'Billing contact') || isEmail(v),
    })
    setErrors(next)
    if (Object.keys(next).length) return
    const patch = {
      name: draft.name.trim(),
      plan: draft.plan,
      seatLimit: Number(draft.seatLimit),
      domain: draft.domain.trim(),
      timezone: draft.timezone.trim(),
      billingContact: draft.billingContact.trim(),
    }
    actions.updateWorkspace(patch)
    setSavedFrom(draft)
    actions.notify('Workspace settings saved', 'success')
  }

  return (
    <div className="flex flex-col gap-4">
      <PanelHeader title="Workspace" description="Shared identity for the whole community network.">
        <CardBody>
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Workspace name" required error={errors.name}>
                <Input value={draft.name} invalid={Boolean(errors.name)} onChange={(e) => set('name')(e.target.value)} />
              </Field>
              <Field label="Plan">
                <Select value={draft.plan} onChange={(e) => set('plan')(e.target.value)}>
                  {['Team', 'Pro', 'Enterprise'].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Seat limit" required error={errors.seatLimit}>
                <Input
                  type="number"
                  min="1"
                  value={draft.seatLimit}
                  invalid={Boolean(errors.seatLimit)}
                  onChange={(e) => set('seatLimit')(e.target.value)}
                />
              </Field>
              <Field label="Domain" required error={errors.domain}>
                <Input value={draft.domain} invalid={Boolean(errors.domain)} onChange={(e) => set('domain')(e.target.value)} />
              </Field>
              <Field label="Timezone" required error={errors.timezone}>
                <Input value={draft.timezone} invalid={Boolean(errors.timezone)} onChange={(e) => set('timezone')(e.target.value)} />
              </Field>
              <Field label="Billing contact" required error={errors.billingContact}>
                <Input
                  type="email"
                  value={draft.billingContact}
                  invalid={Boolean(errors.billingContact)}
                  onChange={(e) => set('billingContact')(e.target.value)}
                />
              </Field>
            </div>
            <SaveRow
              dirty={dirty}
              onSave={save}
              onCancel={() => {
                setDraft(savedFrom)
                setErrors({})
              }}
            />
          </div>
        </CardBody>
      </PanelHeader>

      <PanelHeader title="Seat usage" description={`${seatsUsed} of ${ws.seatLimit} seats taken by ${state.communities.length} communities.`}>
        <CardBody>
          <Progress value={seatsUsed} max={ws.seatLimit} tone={pct > 85 ? 'warning' : 'brand'} label={`${seatsUsed} of ${ws.seatLimit} seats used`} />
          <p className="mt-2 text-[11px] text-content-3 tnum">
            {formatNumber(seatsUsed)} used · {Math.max(0, ws.seatLimit - seatsUsed)} remaining
          </p>
        </CardBody>
      </PanelHeader>

      <Card className="border-danger/30">
        <CardHeader
          title="Danger zone"
          description="Regenerate every record from the seed data. Your profile and workspace edits are discarded."
          icon={RotateCcw}
        />
        <CardBody>
          <Button variant="danger-ghost" icon={RotateCcw} onClick={() => setConfirmReset(true)}>
            Reset demo data
          </Button>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={confirmReset}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          actions.resetDemo()
          actions.notify('Demo data reset to the seed snapshot', 'info')
          setConfirmReset(false)
        }}
        title="Reset demo data?"
        body="All local changes — created posts, membership edits, workspace settings — will be replaced with the freshly generated seed. Prefs (theme, layout) are kept."
        confirmLabel="Reset data"
      />
    </div>
  )
}

/* ------------------------------------------------------------- appearance -- */

function AppearancePanel() {
  const { state, actions } = useApp()
  const { theme, sidebarCollapsed, landingPage } = state.prefs
  const spark = engagementSeries(state)
    .slice(-12)
    .map((d) => d.activeMembers)

  return (
    <div className="flex flex-col gap-4">
      <PanelHeader title="Appearance" description="Applied instantly and stored in your browser. Nothing here reloads the page.">
        <CardBody>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-content-2">Theme</p>
              <Segmented
                value={theme}
                onChange={(v) => actions.setPref('theme', v)}
                options={[
                  { key: 'system', label: 'System' },
                  { key: 'light', label: 'Light' },
                  { key: 'dark', label: 'Dark' },
                ]}
              />
              <p className="text-[11px] leading-snug text-content-3">
                The whole product re-themes the moment you switch — this preview and every other
                screen included.
              </p>
            </div>

            <div className="border-t border-line pt-4">
              <Switch
                label="Collapse the sidebar"
                description="Start with the navigation rail collapsed to icons only."
                checked={sidebarCollapsed}
                onChange={(v) => actions.setPref('sidebarCollapsed', v)}
              />
            </div>

            <div className="border-t border-line pt-4">
              <Field
                label="Start screen"
                hint="Which screen the home page opens. The logo in the sidebar takes you back to the home page."
              >
                <Select value={landingPage} onChange={(e) => actions.setPref('landingPage', e.target.value)}>
                  <option value="dashboard">Dashboard</option>
                  <option value="analytics">Analytics</option>
                  <option value="communities">Communities</option>
                  <option value="members">Members</option>
                </Select>
              </Field>
            </div>
          </div>
        </CardBody>
      </PanelHeader>

      <Card>
        <CardHeader
          title="Live preview"
          description="Real components rendered with the current theme — a specimen, not a static image."
          icon={Sparkles}
        />
        <CardBody className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric label="Members" value={state.members.length} hint="live total" icon={UserCog} tone="brand" />
            <Metric label="Communities" value={state.communities.length} hint="live total" icon={Building2} tone="accent" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="brand">Brand</Badge>
            <Badge tone="accent">Accent</Badge>
            <Badge tone="success">Success</Badge>
            <Badge tone="warning">Warning</Badge>
            <Badge tone="danger">Danger</Badge>
            <Badge tone="info">Info</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" size="sm" onClick={() => actions.notify('This is the primary button — it fires a real toast.', 'success')}>
              Primary
            </Button>
            <Button variant="secondary" size="sm" onClick={() => actions.notify('Secondary button — same live plumbing.', 'info')}>
              Secondary
            </Button>
            <Button variant="outline" size="sm" onClick={() => actions.notify('Outline button style.', 'info')}>
              Outline
            </Button>
            <Button variant="ghost" size="sm" onClick={() => actions.notify('Ghost button style.', 'info')}>
              Ghost
            </Button>
            <Button variant="danger" size="sm" onClick={() => actions.notify('Danger button style — no data was harmed.', 'danger')}>
              Danger
            </Button>
          </div>
          <div className="flex items-center gap-3 rounded-control border border-line bg-surface-2 px-3 py-2">
            <span className="text-[11px] font-medium text-content-2">Active members</span>
            <Sparkline values={spark} color="var(--chart-1)" />
            <span className="ml-auto text-[11px] text-content-3 tnum">{spark[spark.length - 1] ?? 0}</span>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

/* ---------------------------------------------------------- notifications -- */

const NOTIFY_KEYS = [
  { key: 'weeklyDigest', label: 'Weekly digest', description: 'A Monday summary of member growth, top posts and upcoming events across your communities.' },
  { key: 'eventReminders', label: 'Event reminders', description: 'A nudge shortly before every event you are registered for.' },
  { key: 'newMembers', label: 'New members', description: 'An alert when someone joins a community you own or moderate.' },
  { key: 'moderationQueue', label: 'Moderation queue', description: 'A flag when a flagged thread needs your decision.' },
  { key: 'mentions', label: 'Mentions', description: 'A ping whenever an @handle points at you in a conversation.' },
]

function NotificationsPanel() {
  const { state, actions } = useApp()
  const notify = state.prefs.notify
  const active = NOTIFY_KEYS.filter((k) => notify[k.key]).length

  return (
    <div className="flex flex-col gap-4">
      <PanelHeader
        title="Delivery preferences"
        description={`${active} of ${NOTIFY_KEYS.length} alert types on. These map to the notification centre feed.`}
        icon={Bell}
      >
        <CardBody>
          <div className="flex flex-col divide-y divide-line">
            {NOTIFY_KEYS.map((item) => (
              <div key={item.key} className="py-3 first:pt-0 last:pb-0">
                <Switch
                  label={item.label}
                  description={item.description}
                  checked={Boolean(notify[item.key])}
                  onChange={(v) => {
                    actions.setNotifyPref(item.key, v)
                    actions.notify(`${item.label} ${v ? 'turned on' : 'turned off'}`, v ? 'success' : 'info')
                  }}
                />
              </div>
            ))}
          </div>
        </CardBody>
      </PanelHeader>

      <Card>
        <CardHeader
          title="Test the alert system"
          description="Fire a real notification through the store to see how results are reported."
        />
        <CardBody>
          <Button
            variant="secondary"
            icon={Info}
            onClick={() =>
              actions.notify('Test notification — this is how the product reports results', 'info')
            }
          >
            Send a test toast
          </Button>
        </CardBody>
      </Card>
    </div>
  )
}

/* --------------------------------------------------------------- security -- */

function SecurityPanel() {
  const { state, actions } = useApp()
  const [confirmClear, setConfirmClear] = useState(false)
  const bytes = new Blob([JSON.stringify(state)]).size
  const available = storageAvailable()

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-info/30 bg-info-soft/40">
        <div className="flex gap-3">
          <Shield size={18} className="mt-0.5 shrink-0 text-info-content" />
          <p className="text-[13px] leading-relaxed text-content-2">
            <span className="font-semibold text-content">Authentication is out of scope.</span>{' '}
            This is a front-end template with no server, so there is no real login, password
            reset, SSO or connected-integration toggle to configure. Everything below operates on
            the local snapshot in your browser and is genuinely functional.
          </p>
        </div>
      </Card>

      <PanelHeader title="Local storage" description="Where the demo keeps its state between reloads.">
        <CardBody>
          <dl className="grid gap-x-8 sm:grid-cols-2">
            <MetaRow label="Storage available">
              <Badge tone={available ? 'success' : 'danger'}>{available ? 'Yes' : 'Blocked'}</Badge>
            </MetaRow>
            <MetaRow label="Snapshot size">
              <span className="tnum">{formatBytes(bytes)}</span>
            </MetaRow>
            <MetaRow label="Seeded">
              {state.seededAt ? formatFull(state.seededAt) : 'Unknown'}
            </MetaRow>
            <MetaRow label="Records">
              <span className="tnum">
                {state.members.length + state.communities.length + state.content.length + state.events.length}
              </span>
            </MetaRow>
          </dl>
        </CardBody>
      </PanelHeader>

      <PanelHeader title="Data controls" description="Export what is currently held, or wipe it.">
        <CardBody>
          <div className="flex flex-col gap-3">
            <Button
              variant="secondary"
              icon={Download}
              onClick={() => {
                downloadJson('communities-demo-data.json', state)
                actions.notify('Downloaded the demo snapshot as JSON', 'success')
              }}
            >
              Export demo data (JSON)
            </Button>
            <p className="text-[11px] leading-snug text-content-3">
              The exported file is the same object kept in local storage — reload it conceptually by
              resetting, then editing the seed if you are extending the template.
            </p>
            <div className="border-t border-line pt-3">
              <Button variant="danger-ghost" icon={RotateCcw} onClick={() => setConfirmClear(true)}>
                Clear stored data
              </Button>
            </div>
          </div>
        </CardBody>
      </PanelHeader>

      <ConfirmDialog
        open={confirmClear}
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          actions.resetDemo()
          actions.notify('Stored data cleared and reseeded', 'info')
          setConfirmClear(false)
        }}
        title="Clear stored data?"
        body="Removes the snapshot from this browser and rebuilds it from the seed. Your theme and layout preferences are preserved."
        confirmLabel="Clear data"
      />
    </div>
  )
}

/* ------------------------------------------------------------------- data -- */

const ENTITY_ROUTES = {
  members: { to: '/members', label: 'Members' },
  communities: { to: '/communities', label: 'Communities' },
  events: { to: '/events', label: 'Events' },
  tasks: { to: '/tasks', label: 'Tasks' },
  content: { to: '/content', label: 'Content' },
  collections: { to: '/collections', label: 'Collections' },
  conversations: { to: '/messages', label: 'Conversations' },
}

function DataPanel() {
  const { state, actions } = useApp()
  const [confirmReset, setConfirmReset] = useState(false)
  const entities = Object.keys(ENTITY_ROUTES)

  return (
    <div className="flex flex-col gap-4">
      <PanelHeader title="Data entities" description="Live record counts in the current store. Open any row to inspect it on its own page.">
        <CardBody>
          <TableShell>
            <thead>
              <tr>
                <Th>Entity</Th>
                <Th align="right">Records</Th>
                <Th align="right">Page</Th>
              </tr>
            </thead>
            <tbody>
              {entities.map((key) => (
                <Tr key={key}>
                  <Td className="font-medium">{ENTITY_ROUTES[key].label}</Td>
                  <Td align="right" className="tnum">
                    {state[key].length}
                  </Td>
                  <Td align="right">
                    <Link to={ENTITY_ROUTES[key].to} className="text-[12px] text-brand-content hover:underline">
                      Open
                    </Link>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableShell>
        </CardBody>
      </PanelHeader>

      <PanelHeader title="Maintenance" description="These buttons call the real store actions — no server involved.">
        <CardBody>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                icon={RefreshCw}
                onClick={async () => {
                  await actions.reload()
                  actions.notify('Re-read the snapshot from local storage', 'success')
                }}
              >
                Reload from storage
              </Button>
              <Button variant="outline" icon={RotateCcw} onClick={() => setConfirmReset(true)}>
                Reset to seed
              </Button>
              <Button
                variant="danger-ghost"
                icon={AlertTriangle}
                onClick={() => actions.fail('Demo snapshot failed to load')}
              >
                Simulate a load error
              </Button>
            </div>
            <dl className="divide-y divide-line">
              <MetaRow label="Seed age policy">Auto-refreshes when older than 14 days</MetaRow>
              <MetaRow label="Seeded at">{state.seededAt ? formatFull(state.seededAt) : 'Unknown'}</MetaRow>
            </dl>
            <p className="text-[11px] leading-snug text-content-3">
              “Simulate a load error” triggers the same failure path the store exposes: the shell
              swaps to the error screen, and its Retry button runs a full reset to the seed.
            </p>
          </div>
        </CardBody>
      </PanelHeader>

      <ConfirmDialog
        open={confirmReset}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          actions.resetDemo()
          actions.notify('Data reset to the seed snapshot', 'info')
          setConfirmReset(false)
        }}
        title="Reset to seed data?"
        body="Every entity is rebuilt from the generated seed. Local edits to members, content, events and tasks are lost."
        confirmLabel="Reset"
      />
    </div>
  )
}

/* ------------------------------------------------------------------ page -- */

const PANELS = {
  profile: ProfilePanel,
  workspace: WorkspacePanel,
  appearance: AppearancePanel,
  notifications: NotificationsPanel,
  security: SecurityPanel,
  data: DataPanel,
}

export default function SettingsPage({ params }) {
  const raw = params.section
  const active = SECTIONS.some((s) => s.key === raw) ? raw : 'profile'
  const meta = SECTIONS.find((s) => s.key === active)
  const Panel = PANELS[active]

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <PageHeader
        title="Settings"
        description="Everything here writes to the local store — the template has no server to configure."
        meta={
          <>
            <Badge tone="brand">{meta.label}</Badge>
            <Link to="/settings/data" className="text-[11px] text-brand-content hover:underline">
              Manage demo data
            </Link>
          </>
        }
      />

      <Tabs
        className="lg:hidden"
        value={active}
        onChange={(key) => navigate(`/settings/${key}`)}
        items={SECTIONS.map((s) => ({ key: s.key, label: s.label }))}
      />

      <div className="grid gap-4 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="hidden flex-col gap-1 lg:flex">
          {SECTIONS.map((section) => {
            const on = section.key === active
            const Icon = section.icon
            return (
              <Link
                key={section.key}
                to={`/settings/${section.key}`}
                aria-current={on ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-control px-3 py-2 text-[13px] transition-colors',
                  on
                    ? 'bg-brand-soft font-medium text-brand-content'
                    : 'text-content-2 hover:bg-surface-2 hover:text-content',
                )}
              >
                <Icon size={15} strokeWidth={1.9} />
                {section.label}
              </Link>
            )
          })}
        </nav>

        <Panel key={active} />
      </div>
    </div>
  )
}
