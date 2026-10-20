# UI8 submission pack — Communities

Everything in this file is a claim about code that exists in the repository, plus the
commands that prove it. Nothing here is a planned feature.

---

## Value proposition

**Most community dashboards on marketplaces are twelve screens of the same KPI card.
Communities is one working product: a single data model that a member, an event, a task, a
post and a moderation report all belong to, so every screen changes when you change
something — and it ships the two views a community manager actually works, not a generic
admin panel with a community label on it.**

Add a member on the directory and the dashboard total, the community detail roster, the
analytics growth series, the notification feed and the CSV export all move. Resolve a report
in the moderation queue and the sidebar badge, the dashboard's attention card, that
community's overview and the reporter's own health score all move with it. That consistency —
and a member-health board and a report queue that are the point of the product rather than an
afterthought — is what a buyer means by "it doesn't feel like a mockup", and it is the
difference between a template you demo and a template you ship.

It is also deliberately honest about being a frontend. There is no fake login, no
mocked `fetch`, no spinner pretending to wait for a server. State lives in one reducer
and persists to `localStorage`, and `README.md` documents the four steps to swap that
for a real API.

## Product description (marketplace copy)

Communities is a React 19 + Tailwind v4 dashboard for running many communities at once:
8 seeded communities, 51 members, 25 events, 31 tasks, 28 pieces of content, 6
collections, 6 conversations, 14 notifications and a 12-item moderation report queue, all
cross-linked. 22 routes across 20 page modules — a public landing page that presents the
product, a **derived member-health board** and a **working moderation queue** built for the
person who runs the room (not another KPI card), directory and detail views, a kanban board
with drag and drop, a month calendar with registration, a content workflow from draft to
scheduled to published, threaded messages, and a settings area that actually writes
preferences. Charts are SVG drawn from the live records. Light and dark themes are
token-driven and persist across a reload. Built with four runtime dependencies and no UI
library.

## Feature highlights

Implemented and covered by the automated checks:

- **Built for running a community, not a generic admin panel.** Two screens exist for the
  person who works the room. **Member health** (`/health`) scores every member from their
  own activity, status and rooms — `100 − Σ deductions`, bucketed Thriving/Steady/Watch/At
  risk — and spells out each reason ("Quiet for 34d", "Invite never accepted", "Left every
  room"), so the board is a ranked outreach list, not a black box. **Moderation**
  (`/moderation`) is a real report queue: seeded reports filed against messages, threads,
  content and each other, worked oldest-first with an SLA age, resolve / dismiss / review /
  escalate actions that write an activity entry, a notification and a badge, plus a matching
  tab on every community. Both are exercised by the smoke run and the logic suite.
- **Derived, not stored.** `src/store/selectors.js` computes every number the UI shows —
  member growth, engagement totals, community stats, breakdowns, and the whole health board.
  Nothing in state is a duplicate of something that can be calculated. Escalate a report to a
  suspension and that member's health score drops on the next render, because both screens
  read the same record.
- **Real CRUD with real consequences.** Create a community and it appears in every
  filter, dropdown, chart and breadcrumb that references communities. Delete flows go
  through `ConfirmDialog` and cancel without data loss (asserted in the smoke run).
- **Board, list, table, grid, calendar.** Tasks offer a drag-and-drop kanban plus a
  list; communities, members, events and content offer view switches; events add a
  month/week/agenda calendar. Each choice is validated against the URL, so
  `#tasks?view=list` and `#events?view=agenda` deep link.
- **Forms that validate.** The signup form flags all four required fields on an empty
  submit (4 `aria-invalid` controls + 4 `role="alert"` messages);
  community creation flags its two required fields and refuses to close; the content and event forms check every
  required field inline (title, community, type, date, time) before they will save.
  Results come back as a toast, or a `StatusMessage` where the action stays on-screen
  (event form, bulk member changes).
- **Charts with correct axes.** Line, bar, ranked bars, donut and sparkline are hand-drawn
  SVG. Gridlines snap to whole numbers (`0/20/40/60`), x labels thin to fit measured
  width, and the twelve-month series merges the live month instead of duplicating it.
- **Theme system that persists.** Light, dark and system, applied by a pre-paint script
  so there is no flash, stored in the same snapshot as everything else, and verified to
  survive a reload.
- **Search across records.** ⌘K searches communities, members, events, tasks, content and
  collections and routes to the right detail page.
- **CSV export** of the member directory, the health board (with score, bucket and named
  reasons), the moderation queue and the analytics tables, with spreadsheet-safe cells
  (a record name starting with `=` cannot become a formula).
- **Accessibility work**: visible focus rings, roving focus in menus and tabs, `aria`
  state on toggles, labels on every icon button, `prefers-reduced-motion` respected.

## Supported use cases

One product, five readings — the seed data already spans them, so a buyer re-skins the
vocabulary instead of rebuilding the screens.

| Use case | Where it is already demonstrated |
| --- | --- |
| Creator communities | Content library with draft → scheduled → published, member health to catch subscribers going quiet, Collections as paid/resource libraries |
| Startup communities | Tasks board with assignees and priorities, moderation queue for community conduct, workspace settings, activity feed |
| Educational communities | Events calendar with registration and capacity, health board as a drop-off watchlist, member roles (owner/moderator/member), resources in collections |
| Professional networks | Member directory with roles, statuses and profiles, moderation queue for reported posts, channels on the community detail page, messages |
| Membership organizations | Member statuses (active/invited/inactive/suspended) feeding the health board, community ownership, notifications and digest preferences |

The landing page frames the same coverage by the job rather than the community type — run a
network, put on events, work a moderation queue, follow moderation decisions through to a
task, catch the members about to leave, ship a content calendar, report on any of it —
because that is the question a buyer actually asks. Every one of those jobs points at a real
screen, and the two moderation/health jobs now drive their own views rather than the general
task board.

## Route and feature inventory

22 patterns → 20 page modules (Messages and Settings each serve two patterns). Every row
below is rendered in the smoke run at three breakpoints.

| Route | Page | What works |
| --- | --- | --- |
| `/` | HomePage | Public landing page, no shell: hero with live counts, real growth chart, the thirteen screens grouped as cards, seven use cases, and an explicit split between what is implemented and what is simulated. Theme control, and its primary button opens the configured start screen. An empty hash resolves here. |
| `/dashboard` | DashboardPage | Metric row, growth and engagement charts, my tasks, upcoming events, activity feed |
| `/analytics` | AnalyticsPage | Range switch (`?range=7d/30d/90d`), KPI grid with deltas, line/bar/ranked/donut charts, community leaderboard |
| `/health` | HealthPage | Derived member-health board: at-risk/watch metrics, risk-distribution chart, filters by risk/community/role with search, table + grid views, a per-member drawer with the full reason list and a link to their profile, "how this is scored" rubric card, CSV export (`?risk=`, `?view=grid`, `?member=<id>`) |
| `/moderation` | ModerationPage | Report queue: status tabs with counts, urgent banner, filters by community/kind/reason with search, SLA age per row, drawer with resolve / dismiss / review / escalate / reopen that writes activity + notification + badge, CSV export (`?status=`, `?report=<id>` opens the drawer, `?kind=thread`) |
| `/communities` | CommunitiesPage | Grid + table views (the choice persists as a preference), search, category filter, four sorts (members, engagement, needs attention, recently created), create dialog with validation, favourite toggle, "New event here", copy shareable link |
| `/communities/:id` | CommunityDetailPage | 7 tabs (overview, members, channels, moderation, events, tasks, content), member roster with role changes, join/leave with confirmation, edit, favourite; the moderation tab shows this room's reports with the same actions, and the overview verdict now reads "N members at risk · M open reports" from real numbers |
| `/members` | MembersPage | Table + grid, search, status and community filters, sort, bulk selection with bulk status change, invite dialog, CSV export |
| `/members/:id` | MemberDetailPage | Profile, 4 tabs (overview, activity, content, tasks), a derived health card (score, bucket, named reasons) and a "reported by members" card linking into the queue on the overview, editable fields, role change that syncs the community's moderator list, suspend, remove from workspace (which clears every membership first) |
| `/events` | EventsPage | Month/week/agenda calendar, search, community filter, create event form, RSVP state |
| `/events/:id` | EventsPage detail | Attendee list with capacity, register/cancel, description, share link, edit |
| `/tasks` | TasksPage | Kanban with drag and drop, list view, status/priority/community/assignee filters (`?status=`, `?view=`), task drawer editing title, description, status, priority, assignee, due date, community and labels, create, complete, delete |
| `/content` | ContentPage | Grid + table, status/community/type/category filters (`?status=draft`), publish / schedule to a date / revert to draft, editor form |
| `/content/:id` | ContentDetailPage | Body render, engagement counts, status controls, edit and delete |
| `/collections` | CollectionsPage | Curated collections with item counts and visibility, search, create, rename, delete with confirmation |
| `/collections/:id` | CollectionDetailPage | Item list across content types, add and remove items, bulk assign from the library, rename |
| `/messages` | MessagesPage | Conversation rail, unread state, empty state when no conversation selected |
| `/messages/:id` | MessagesPage thread | Message list, send with validation, details pane, mark read |
| `/notifications` | NotificationsPage | All/unread tabs, mark read, mark all read, per-type icons, deep link to the referenced record |
| `/settings` `/settings/:section` | SettingsPage | Profile, Workspace, Appearance (theme, collapsed sidebar, start screen, live component specimen), Notifications (per-topic switches), Security, Demo data (JSON export, reset with confirmation) |
| `/signup` | SignupPage | Join form with four required fields validated inline, email opt-in checkbox, community-focus select, live product preview, theme control; a valid submit writes the workspace into the store and routes to the dashboard |
| anything else | NotFound (inline) | Explains the bad hash and links back to the dashboard |

## Suggested screenshots

All 9 subjects map to files that already exist in this repository, captured by
`npm run smoke` against the running app — not mockups, not retouched.

`previews/` is the curated set shipped with the product — 90 files, all captured from the
running app. Four page sets hold the same 20 screens numbered in tour order (`00-home` …
`19-signup`): `desktop/` and `mobile/` in light theme (1440×900 and 390×844), `dark/` and
`dark-mobile/` in dark theme at the same sizes. `views/` adds 10 alternate states
(table/agenda/list views, filters, the 90-day range, the unread tab, a search, the
new-event dialog). The complete 38-shot set per theme per breakpoint lives in `.shots/`
and `.shots-dark/` (regenerate with the commands below).

| # | Subject | Files |
| --- | --- | --- |
| 1 | Main dashboard and analytics | `desktop/01-dashboard.png`, `desktop/02-analytics.png`, `views/20-analytics-range-90d.png` |
| 2 | Community directory and detail | `desktop/03-communities.png`, `desktop/04-community-detail.png`, `views/21-communities-table-view.png` |
| 3 | Member management and profile | `desktop/05-members.png`, `desktop/06-member-detail.png`, `views/27-members-invited-grid-view.png` |
| 4 | Events and calendar | `desktop/07-events.png`, `desktop/08-event-detail.png`, `views/22-events-agenda-view.png`, `views/23-events-new-event-dialog.png` |
| 5 | Task board | `desktop/09-tasks.png`, `views/24-tasks-list-view.png`, `views/25-tasks-overdue-filter.png` |
| 6 | Content management | `desktop/10-content.png`, `desktop/11-content-detail.png`, `views/26-content-table-draft-view.png` |
| 7 | Light and dark themes | `desktop/18-settings-appearance.png`, `dark/01-dashboard.png`, `dark/18-settings-appearance.png`, `dark-mobile/01-dashboard.png` |
| 8 | Responsive mobile layouts | `mobile/01-dashboard.png`, `mobile/09-tasks.png`, `dark-mobile/04-community-detail.png` — every route has both a light and a dark mobile counterpart |
| 9 | Reusable components and customisation | `desktop/18-settings-appearance.png`, `desktop/17-settings-overview.png`, `desktop/12-collections.png`, `desktop/14-messages.png` |

Every subject is answerable from `previews/` alone; the `.shots*` folders exist so a reviewer
can regenerate the set rather than trust the PNGs.

For the listing cover, `desktop/00-home.png` is the strongest single frame — the landing page
is the product summarising itself, with live counts and a real chart rather than a staged
mock-up. `dark/00-home.png` is the same page in dark.

Capture commands (a local Chrome is the only extra requirement):

```bash
npm run smoke -- --shots .shots --theme light --routes-only
npm run smoke -- --shots .shots-dark --theme dark --routes-only
npm run build && npm run preview                         # then point CHROME at the preview
```

Pass `--theme` explicitly. Without it the app follows the system preference, and headless
Chrome reports dark, so a "light" capture silently comes out dark.

`--routes-only` is what produces the deliverable set: it renders each route from a fresh
profile, so the data is the pristine seed rather than whatever the interaction steps
mutated.

## Suggested demo walkthrough

Ninety seconds, one thread of cause and effect. Each beat is a real interaction — and the
Community pulse beats are the point: a moderation decision that visibly moves a health score.

1. **Landing page → Dashboard** (0:00) — the app opens on `#/`: live counts, a real chart,
   the thirteen screens named and linked. Click "Explore the live demo". On the dashboard,
   point at the "Needs your attention" card: the first two rows are **Moderation queue** and
   **Member health**, each a button onto the exact filtered view.
2. **Create** (0:08) — Communities → New community → submit empty to show the inline
   error → fill it in → create. The card appears, the directory count and every
   community filter in the product gain the new option.
3. **Deep link** (0:18) — copy the community's link, paste it in a new tab, land on the
   same page. Hash routing, no server config.
4. **Community pulse — the moderation queue** (0:26) — open `/moderation`: reports members
   filed against threads, messages, content and each other, oldest-first with an SLA age and
   two urgent at the top. Open a report and **escalate** it — confirm the dialog, and the
   reporter's target is suspended, an activity entry and a notification are written, and the
   sidebar badge moves in one click.
5. **Community pulse — the health board** (0:40) — jump to `/health?risk=at-risk`: the same
   suspended member now sits at the bottom of the board, their score dropped and the reason
   spelled out ("Account suspended"). The two screens read one record — nothing was
   double-booked. Point at the rubric card to show every weight is named, not invented.
6. **Detail tabs** (0:52) — a community's own Moderation tab shows its reports scoped to the
   room; Overview → Members → promote a member to moderator → the roster badge and the
   community's moderator list both change.
7. **Tasks** (1:04) — drag a card from To do to In progress, open the drawer, raise the
   priority and add a label, then delete another card to show the confirmation and the
   cancel path.
8. **Events** (1:16) — month grid → open an event → register → the attendee count moves
   and Analytics' attendance series re-derives from it.
9. **Analytics** (1:26) — switch 7d/30d/90d; every chart and delta re-derives.
10. **Theme + persistence** (1:34) — Appearance → Dark, reload the page, still dark.
11. **Mobile** (1:42) — resize to 390 px, use the drawer nav and the task board.

## Files the customer receives

`npm run package` writes them into `ui8-upload/` (and `ui8-upload.zip`) — 147 files, 25.3 MB,
assembled from the allowlist at the top of `scripts/package.mjs`. The directory is source, not a
build: the customer runs `npm install && npm run dev`.

```
index.html                  vite.config.js            package.json  package-lock.json
README.md                   .gitignore                LICENSE (picked up automatically once it exists)
docs/usage-guide.md       docs/ui-kit.md
previews/                 (90 product screenshots: desktop, mobile, dark, dark-mobile, views)
scripts/verify.mjs          scripts/smoke.mjs         scripts/package.mjs
src/
  App.jsx  main.jsx  routes.js  index.css
  components/ui/            8 primitive modules (Button, Form, Surface, Data,
                            Navigation, Overlay, Feedback, Charts)
  components/layout/        Sidebar.jsx  TopBar.jsx
  pages/                    20 page modules + content/ events/ messages/ helpers
  store/                    AppStore.jsx (reducer + persistence)  selectors.js
  data/seed.js              the whole demo dataset
  lib/                      router.jsx  storage.js  utils.js
```

This file (`docs/ui8-submission.md`), `promt.md`, `.qoder/`, `.shots*/`, `node_modules/`, `dist/`
and `.git/` are on the packager's denylist and stay with the author; the build fails if any of
them turns up in the output.

47 files in `src`, ~20.3k lines. Three runtime dependencies (`react`, `react-dom`,
`lucide-react`), four dev dependencies (`vite`, `@vitejs/plugin-react`, `tailwindcss`,
`@tailwindcss/vite`). No fonts, no stock imagery, no icons beyond lucide (ISC), no
backend, no environment variables, no secrets.

## Customisation options

- **Brand**: `--brand` / `--brand-fill` and `--accent` / `--accent-fill` in `src/index.css`
  (each with `-2`, `-soft` and `-content` partners, overridden again under `.dark`). The
  fill/text split is what keeps white-on-accent at WCAG AA, so change them together.
- **Radius**: `--radius-control`, `--radius-card` and `--radius-panel` in the
  `@theme inline` block drive every corner in the product.
- **Theme**: the `:root` and `.dark` token blocks; add a third block to add a theme.
  Settings → Appearance is a working theme control (light / dark / system, collapsed
  sidebar, landing page) with a live component specimen, not a colour picker.
- **Navigation and routes**: `src/routes.js` only.
- **Data**: `src/data/seed.js` is one file of tables; `src/store/selectors.js` is the
  only place numbers are computed.
- **Components**: `docs/ui-kit.md` lists every primitive and its props.

## Requirements and limitations buyers should understand

- Node `^20.19.0 || >=22.12.0` (Vite 7 requirement).
- **Frontend demo only.** No authentication, no server, no database. State is one
  `localStorage` key (`communities.v1`) with a 14-day seed TTL, reset from
  Settings → Demo data.
- Single tab: writes do not broadcast to other open tabs.
- No realtime layer — messages and notifications are local records, not sockets.
- Plain JSX, no TypeScript. Types would be additive, not a rewrite.
- No ESLint/Prettier config ships with the project; `npm run verify` and `npm run smoke`
  are the checks that do exist.
- `npm run smoke` needs a local Chrome (override with `CHROME=/path/to/chrome`).
- All names, avatars, posts and events are fictional. Avatars are generated from initials
  and hues — no photography is bundled.

## Pre-submission checklist (priority order)

Items 1–3 are blockers; 4–6 are quality signals; 7 is the author's own decision.

1. **Commit the working tree.** The landing page and its shell/routing changes are in
   (`3d5ee89`, `ff38ecb`). Uncommitted as this was written: `scripts/package.mjs` plus the
   `.gitignore`, `package.json`, `README.md` and this file's edits that document it.
2. **Untrack build and dependency output.** `git ls-files` reports 6,518 tracked files, of
   which 6,256 are under `node_modules/`, 111 under `.shots-dark/`, 1 under `dist/` and 1 is
   `.qoder/settings.local.json` — the product itself is 150. `.gitignore` lists all of them, but
   ignore rules do not apply to already-tracked paths, so they need the explicit
   `git rm -r --cached node_modules dist .shots-dark .qoder` and a commit. This only matters if
   UI8 is given the *repository*; `npm run package` never copies them.
3. **Choose and add `LICENSE`.** `README.md` currently defers the template licence to the UI8
   listing; the marketplace needs an explicit file before review. Put it at the repository root
   and `npm run package` ships it — the packager deliberately does not invent one.
4. **Keep `previews/` in step with the code.** The 90 files there were captured from this
   build; re-run both sets after any UI change, and re-shoot at whatever resolution UI8
   finally asks for:
   `npm run smoke -- --shots .shots --theme light --routes-only` then
   `npm run smoke -- --shots .shots-dark --theme dark --routes-only`.
5. **Run the validation trio on a clean install.** Done for this package: `ui8-upload/` was
   copied to a scratch directory, `npm install --prefer-offline` added 79 packages, then
   `npm run verify` → 760 checks passed, `npm run build` → clean (HomePage its own 14.95 kB
   chunk, entry 343.06 kB / gzip 108.48 kB, with HealthPage and ModerationPage code-split
   separately), and the full `node scripts/smoke.mjs` →
   **47 routes · 0 errors · 0 warnings** with all 21 interaction checks. Re-run after any
   change, in the packaged copy rather than the repository, so the upload stays free of
   `node_modules/` and `dist/`.
6. **Package, do not copy.** `npm run package` is the step that keeps development-only files
   out of the upload (`promt.md`, `.qoder/`, `.shots*/`, `node_modules/`, `dist/`). It writes
   the manifest of exactly what shipped to `ui8-upload/.communities-package` — check that file
   before zipping by hand, and re-run the packager rather than editing the output.
7. Record the demo walkthrough above (60–90 s) — it is the single strongest acceptance
   signal for a "functional template" claim.
