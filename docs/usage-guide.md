# Using Communities — a working guide

This is the manual for the product itself: what each screen is for, how the everyday
jobs are done, and where your data actually goes. For install, scripts and code layout,
see `README.md`; for the component API, `docs/ui-kit.md`.

---

## What this is, and what it is not

Communities is a dashboard for someone who runs several online communities at once —
the rooms, the people in them, the events, the moderation and publishing queue, and the
numbers that say whether any of it is working.

**Everything you do here is real.** Creating a community, moving a task, registering for
an event or sending a message writes to a single store, and every figure on every screen
is computed from that store. Nothing is a picture of data.

**There is no server.** No accounts, no logins, no sync between machines. The whole
workspace lives in your browser's `localStorage` under one key, `communities.v1`. The
`/signup` screen is a real form that renames the demo workspace — it does not create an
account, and nothing leaves the browser.

---

## Sixty seconds of orientation

| Region | What it holds |
| --- | --- |
| Sidebar (left) | Eleven destinations in four groups — Overview, Manage, Connect, Account — plus your own card at the bottom. Collapsible to icons. |
| Top bar | Breadcrumb, global search (⌘K), notifications bell, theme control, your avatar menu. |
| Page header | The screen's title, what it counts, and the actions that belong to it. |
| Toolbar | Search, filters, then the view switch (grid/table/board/list/month/agenda). |
| Content | The work. Lists are paginated; empty results always offer a "Clear filters" action. |

Start on **Dashboard**. Its "Needs your attention" card is the intended entry point, and
each row is a button onto the exact filtered view where you can act:

| Row | Opens |
| --- | --- |
| Overdue tasks | `#/tasks?filter=overdue` |
| Unread notifications | `#/notifications` |
| Invites pending | `#/members?status=invited` |
| Content drafts | `#/content?status=draft` |

Below it: the growth/engagement chart, upcoming events you can register for, your task
queue, the activity feed, message volume by community and a community performance table.

---

## The everyday jobs

### Add a community

Communities → **New community** → name, category, visibility (public or private), about
and comma-separated tags → **Create**. Name and about are required; the dialog tells you
what you get: three channels, you as the owner, and a roster seeded from your active
moderators.

- Submitting empty flags both required fields with inline errors and the dialog stays
  open.
- On success the card appears in the directory, the community becomes an option in every
  community filter in the product, and a toast confirms it.
- New communities have no seeded history — that is expected, not a bug. They start with
  zero members, zero channels and zero events.

Note: communities can be created but not deleted in this demo. **Settings → Demo data →
Reset demo data** is the way back to the seeded eight.

### Run the member roster

Members is the directory: table or grid, searchable across name, handle, email, job
title and location, filterable by status, role and community, sortable by recently joined
/ most active / name / level. Twelve rows per page.

- **Select rows** with the checkboxes to act in bulk: set active, re-invite, change role.
- **Export** writes the roster you currently have filtered — not the whole directory —
  as CSV, with a UTF-8 BOM so Excel reads accented names correctly.
- **Invite** opens a dialog that creates a real member record with `invited` status.
- The row menu offers Open profile, Change role, Mark inactive, Suspend and Remove from
  workspace. Every destructive one asks first, and cancelling changes nothing.

Open a profile to see their activity, content and tasks in tabs. Changing a member's
role there also updates the community's moderator list — the two views cannot disagree.
Suspension keeps their history and blocks the actions a suspended member would take.

### Work the task board

Tasks opens on the kanban: To do, In progress, In review, Done.

- **Drag a card** into another column to move it. No pointer? The card's ⋯ menu has the
  same four moves.
- **Open a card** for the drawer: title (validated), description, status, priority,
  assignee, due date, community and labels. Labels are added with Enter and drive the
  board filters.
- **List view** (`?view=list`) is a sortable table with the same 12-per-page rhythm.
- The **Overdue** filter is the one to check every morning; the dashboard's attention
  queue counts the same set.

A completed task stops reporting how late its deadline was and reports when it landed
instead ("Completed 3 hours ago").

### Publish content

Content is a three-state pipeline: **draft → scheduled → published**.

- The composer takes title, type (post, guide, resource, report, lesson), status,
  community, collection, category, excerpt and body. Choosing *scheduled* adds a required
  date field.
- Each item's ⋯ menu publishes, schedules, reverts to draft, or deletes with confirmation.
- Grid view is the reading experience; table view is the queue, with status badges and
  engagement counts.
- Open an item for the full body, its metrics and its status controls.

### Curate a collection

Collections group library items across types — a reading list, an onboarding pack, a
resource shelf. Create one (name, description, owning community, public or private),
then open it to add items, remove them, or bulk-assign a selection from the content
library. Private collections are labelled as moderation-team-only.

### Run an event

Events has three views on one dataset: **month** grid, **week** strip, **agenda** list.

- **New event** takes title, community, type, date, start time, duration, capacity,
  location mode and details, and description. Required fields block an empty save.
- Open an event to see attendees against capacity and to **register** or **cancel**.
  The count moves immediately, and Analytics' attendance series re-derives from it.
- The same register button is on the dashboard's upcoming-events card.

### Read and reply in messages

Messages lists conversations grouped by community, each with its own unread count, and
opening one clears it. Enter sends, Shift+Enter is a newline. The details pane shows
members, message count, reactions and last activity.

Two other places surface unread activity, and they count different things: the sidebar's
**Busy right now** block ranks the four communities with the most unread *channel*
activity, while the bell and the Notifications nav badge track unread *notifications*.
Neither one is a message counter — for threads, the rail inside Messages is the
authority.

One honesty note built into the UI: the demo's channels are backed by a single seeded
thread, which the Channels tab of a community says out loud. Announcement and resource
channels hold pinned items rather than a stream.

### Clear notifications

Notifications has All / Unread / Urgent tabs and six types (events, tasks, members,
content, moderation, reports), each with its own icon and colour. Per item: open the
target, mark read, or copy a link to it. **Mark all read** is in the header, and the
sidebar badge follows.

### Make it yours

Settings → **Appearance**: theme (system / light / dark), start with the sidebar
collapsed, and which page "Home" points at. Below the controls is a live specimen — real
components in the current theme, not a preview image.

Settings → **Profile** edits your display name, handle, email, job title, location and
bio. **Workspace** holds the name, plan, seat limit, domain, timezone and billing
contact, all validated. **Notifications** toggles five topics and fires a real test
toast. **Security** is honest: it explains that authentication is out of scope and shows
what the local snapshot is doing instead.

---

## Keyboard

| Keys | What they do |
| --- | --- |
| ⌘K / Ctrl+K | Global search over communities, members, events, tasks, content and collections |
| ↑ / ↓ then Enter | Move through search results and menu items, and choose one |
| Enter or Space | Open a focused menu, or select the highlighted item |
| Escape | Close a dialog, drawer, popover or menu |
| Tab | Move focus — every control shows a visible focus ring |
| Shift+Enter | New line in the message composer (Enter alone sends) |

Tabs and segmented controls are ordinary buttons inside a `tablist`: reach them with Tab
and activate with Enter. That is also how the board is worked without a pointer — focus a
card's ⋯ menu, arrow to the column, Enter.

---

## Your data, where it lives, and how to get it out

- One `localStorage` key: `communities.v1`. It holds the records, your preferences
  (including the theme) and the seed timestamp.
- **Seeds older than 14 days are rebuilt on next load.** That is deliberate: it keeps
  "3 hours ago" and "next Thursday" true whenever you open the demo. It also means a
  two-week-old experiment gets reset.
- **Export**: Settings → Demo data → *Export demo data (JSON)* downloads the whole
  snapshot. Members exports the roster you currently have filtered; Analytics exports
  five datasets for the selected range (member growth, daily engagement, community
  breakdown, event attendance and content performance) into one CSV.
- **Reset**: Settings → Demo data → *Reset demo data* (with confirmation). Or clear the
  key yourself.
- **Storage disabled?** If `localStorage` is unavailable — private mode, blocked site
  data — the app still runs, in memory, and says so in Settings → Security. You lose
  changes on reload.
- Exports are spreadsheet-safe: a record name starting with `=`, `+`, `-` or `@` is
  neutralised so it cannot execute as a formula.

---

## Filters in the URL

Every filter that is worth sharing is written into the address, so a link reproduces the
exact view you were looking at. Hand-edit them freely: an unknown value falls back to the
default rather than showing an empty screen.

| Screen | Parameters |
| --- | --- |
| Communities | `?q=` `?category=` `?view=grid|table` |
| Members | `?q=` `?status=` `?community=` `?view=table|grid` |
| Tasks | `?q=` `?view=board|list` `?task=<id>` (opens the drawer) `?filter=overdue` |
| Content | `?q=` `?status=` `?community=` `?view=grid|table` `?new=1` (opens the composer) |
| Events | `?q=` `?view=month|week|agenda` `?new=1` |
| Collections | `?q=` |
| Notifications | `?tab=all|unread|urgent` `?q=` |
| Analytics | `?range=7d|30d|90d|all` |
| Community / member profile | `?tab=` |
| Settings | `/settings/<section>` |

**Copy link** on a community, event or notification puts the full URL on your clipboard,
including the `#/` routing.

---

## On a smaller screen

- **Desktop (≥1024px)** — the sidebar is always visible. The control at its foot
  collapses it to an icon rail (labels move to tooltips, the unread badge becomes a dot),
  and that choice is saved as a preference.
- **Tablet and mobile (<1024px)** — the sidebar becomes a drawer opened by the ☰ button
  in the top bar; tap a destination or the scrim to close it. Card grids drop to one or
  two columns and charts re-measure themselves.
- **Phone (≤640px)** — the breadcrumb is replaced by the page heading, and wide tables
  shed their secondary columns (title, joined and last active disappear before name and
  status do) instead of scrolling sideways. Below `lg`, Messages shows either the
  conversation rail or the open thread, never both.
- Charts and grids are measured with a `ResizeObserver`, so they reflow when you resize
  the window rather than only when the page loads.

Drag and drop is a pointer interaction; on touch, use the card's ⋯ menu to move it.

---

## Shaping it for your kind of community

The vocabulary is data, not code — change the lists in `src/data/seed.js` and every
filter, badge and form option follows.

| You run | Rename | Reach for |
| --- | --- | --- |
| A creator community | Categories → your niches; content types → video, newsletter, livestream | Content pipeline, Collections as paid tiers, member growth |
| A startup's user group | Roles → team/advisory/beta | Tasks board, Events, activity feed |
| A course or cohort | Content types → lesson, assignment, reading; statuses → open, in progress, archived | Collections per module, Events for sessions, member progress |
| A professional network | Categories → practice areas; event kinds → mixer, webinar | Member directory with roles, Events, messages |
| A membership body | Member statuses → pending, current, lapsed | Renewals as a task column, Events, CSV export |

---

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| A filter shows nothing | The combination is genuinely empty. Use **Clear filters** in the empty state. |
| Numbers look invented | They are computed from the seed; open Settings → Demo data to see the record counts, or reset. |
| Your changes vanished on reload | `localStorage` was blocked, or the seed was older than 14 days. Check Settings → Security. |
| A new community has no channels or history | Expected — seeded rooms only. |
| Two tabs disagree | The snapshot is written per tab and does not broadcast. Reload the second tab. |
| A route shows "Not found" | The hash is not in `src/routes.js`. The page links back to the dashboard. |
| Console noise in development | `npm run smoke` fails on any console error, so a clean checkout should be silent. |

---

## Vocabulary reference

| Dimension | Values |
| --- | --- |
| Member roles | owner · moderator · member |
| Member statuses | active · invited · inactive · suspended |
| Task columns | todo · doing · review · done |
| Task priorities | urgent · high · medium · low |
| Content states | draft · scheduled · published |
| Content types | post · guide · resource · report · lesson |
| Event types | Workshop · Live stream · AMA · Panel · Meetup · Cohort · Demo · Roundtable · Social · Playtest |
| Community categories | Design · Engineering · Product · Creator · Learning · Founder · Wellness · Gaming |
| Notification types | events · tasks · members · content · moderation · reports |

## Known gaps

- Communities can be created but not deleted; reset is the undo.
- Channel messages are backed by one seeded thread per community, stated in the UI.
- No authentication, no multi-user state, no realtime — see Settings → Security.
- JSON can be exported but not re-imported.
