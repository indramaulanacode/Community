# UI8 submission pack — Communities

Everything in this file is a claim about code that exists in the repository, plus the
commands that prove it. Nothing here is a planned feature.

---

## Value proposition

**Most community dashboards on marketplaces are twelve screens of the same KPI card.
Communities is one working product: a single data model that a member, an event, a task
and a post all belong to, so every screen changes when you change something.**

Add a member on the directory and the dashboard total, the community detail roster, the
analytics growth series, the notification feed and the CSV export all move. That
consistency is what a buyer means by "it doesn't feel like a mockup", and it is the
difference between a template you demo and a template you ship.

It is also deliberately honest about being a frontend. There is no fake login, no
mocked `fetch`, no spinner pretending to wait for a server. State lives in one reducer
and persists to `localStorage`, and `README.md` documents the four steps to swap that
for a real API.

## Product description (marketplace copy)

Communities is a React 19 + Tailwind v4 dashboard for running many communities at once:
8 seeded communities, 51 members, 25 events, 31 tasks, 28 pieces of content, 6
collections, 6 conversations and 14 notifications, all cross-linked. 19 routes across 17
page modules — directory and detail views, a kanban board with drag and drop, a month
calendar with registration, a content workflow from draft to scheduled to published,
threaded messages, and a settings area that actually writes preferences. Charts are SVG
drawn from the live records. Light and dark themes are token-driven and persist across a
reload. Built with four runtime dependencies and no UI library.

## Feature highlights

Implemented and covered by the automated checks:

- **Derived, not stored.** `src/store/selectors.js` computes every number the UI shows —
  member growth, engagement totals, community stats, breakdowns. Nothing in state is a
  duplicate of something that can be calculated.
- **Real CRUD with real consequences.** Create a community and it appears in every
  filter, dropdown, chart and breadcrumb that references communities. Delete flows go
  through `ConfirmDialog` and cancel without data loss (asserted in the smoke run).
- **Board, list, table, grid, calendar.** Tasks offer a drag-and-drop kanban plus a
  list; communities, members, events and content offer view switches; events add a
  month/week/agenda calendar. Each choice is validated against the URL, so
  `#tasks?view=list` and `#events?view=agenda` deep link.
- **Forms that validate.** The signup flow reports 8 field errors on an empty submit;
  community creation blocks an empty name; the content and event forms check every
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
- **CSV export** of the member directory and analytics tables, with spreadsheet-safe cells
  (a record name starting with `=` cannot become a formula).
- **Accessibility work**: visible focus rings, roving focus in menus and tabs, `aria`
  state on toggles, labels on every icon button, `prefers-reduced-motion` respected.

## Supported use cases

One product, five readings — the seed data already spans them, so a buyer re-skins the
vocabulary instead of rebuilding the screens.

| Use case | Where it is already demonstrated |
| --- | --- |
| Creator communities | Content library with draft → scheduled → published, member growth, Collections as paid/resource libraries |
| Startup communities | Tasks board with assignees and priorities, workspace settings, activity feed |
| Educational communities | Events calendar with registration and capacity, member roles (owner/moderator/member), resources in collections |
| Professional networks | Member directory with roles, statuses and profiles, channels on the community detail page, messages |
| Membership organizations | Member statuses (active/invited/inactive/suspended), community ownership, notifications and digest preferences |

## Route and feature inventory

19 patterns → 17 page modules (Messages and Settings each serve two patterns). Every row
below is rendered in the smoke run at three breakpoints.

| Route | Page | What works |
| --- | --- | --- |
| `/dashboard` | DashboardPage | Metric row, growth and engagement charts, my tasks, upcoming events, activity feed |
| `/analytics` | AnalyticsPage | Range switch (`?range=7d/30d/90d`), KPI grid with deltas, line/bar/ranked/donut charts, community leaderboard |
| `/communities` | CommunitiesPage | Grid + table views, search, category and status filters, sort, create dialog with validation, archive/delete, copy shareable link |
| `/communities/:id` | CommunityDetailPage | 6 tabs (overview, members, channels, events, tasks, content), member roster with role changes, join/leave with confirmation, edit, favourite |
| `/members` | MembersPage | Table + grid, search, status and community filters, sort, bulk selection with bulk status change, invite dialog, CSV export |
| `/members/:id` | MemberDetailPage | Profile, 4 tabs (overview, activity, content, tasks), editable fields, role change that syncs the community's moderator list, suspend, remove from workspace (which clears every membership first) |
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
| `/settings` `/settings/:section` | SettingsPage | Profile, Workspace, Appearance (theme, collapsed sidebar, landing page, live component specimen), Notifications (per-topic switches), Security, Demo data (JSON export, reset with confirmation) |
| `/signup` | SignupPage | Multi-field join form, 8-field validation pass, checkbox and select states, success state |
| anything else | NotFound (inline) | Explains the bad hash and links back to the dashboard |

## Suggested screenshots

All 9 subjects map to files that already exist in this repository, captured by
`npm run smoke` against the running app — not mockups, not retouched.

`previews/` holds the curated set shipped with the product. The complete 37-shot set per
theme per breakpoint lives in `.shots/` and `.shots-dark/` (gitignored; regenerate with
the commands below).

| # | Subject | Files |
| --- | --- | --- |
| 1 | Main dashboard and analytics | `previews/01-dashboard.png`, `previews/02-analytics.png` |
| 2 | Community directory and detail | `previews/03-communities.png`, `previews/04-community-detail.png` |
| 3 | Member management and profile | `previews/05-members.png`, `.shots/desktop/members-m-paul.png` |
| 4 | Events and calendar | `previews/06-events-calendar.png`, `.shots/desktop/events-view-agenda.png` |
| 5 | Task board | `previews/07-tasks-board.png`, `.shots/desktop/tasks-view-list.png` |
| 6 | Content management | `previews/08-content.png`, `.shots/desktop/content-view-table-status-draft.png` |
| 7 | Light and dark themes | `previews/09-appearance.png`, `previews/10-dashboard-dark.png`, `previews/11-community-detail-dark.png` |
| 8 | Responsive mobile layouts | `previews/12-mobile-dashboard.png`, `previews/13-mobile-tasks.png`, `.shots/mobile/*` |
| 9 | Reusable components and customisation | `.shots/desktop/settings-appearance.png`, `.shots/desktop/communities-view-table.png`, `.shots/desktop/members-status-invited-view-grid.png` |

Capture commands (a local Chrome is the only extra requirement):

```bash
npm run smoke -- --shots .shots                          # light, every route + interactions
npm run smoke -- --shots .shots-dark --theme dark --routes-only
npm run build && npm run preview                         # then point CHROME at the preview
```

`--routes-only` is what produces the deliverable set: it renders each route from a fresh
profile, so the data is the pristine seed rather than whatever the interaction steps
mutated.

## Suggested demo walkthrough

Ninety seconds, one thread of cause and effect. Each beat is a real interaction.

1. **Dashboard** (0:00) — open on the growth chart. Point at the last month: it is
   *this* month, counted live.
2. **Create** (0:10) — Communities → New community → submit empty to show the inline
   error → fill it in → create. The card appears, the directory count and every
   community filter in the product gain the new option.
3. **Deep link** (0:25) — copy the community's link, paste it in a new tab, land on the
   same page. Hash routing, no server config.
4. **Detail tabs** (0:35) — Overview → Members → promote a member to moderator → the
   roster badge and the community's moderator list both change.
5. **Tasks** (0:50) — drag a card from To do to In progress, open the drawer, raise the
   priority and add a label, then delete another card to show the confirmation and the
   cancel path.
6. **Events** (1:05) — month grid → open an event → register → the attendee count moves
   and Analytics' attendance series re-derives from it.
7. **Analytics** (1:20) — switch 7d/30d/90d; every chart and delta re-derives.
8. **Theme + persistence** (1:30) — Appearance → Dark, reload the page, still dark.
9. **Mobile** (1:40) — resize to 390 px, use the drawer nav and the task board.

## Files the customer receives

```
index.html                  vite.config.js            package.json  package-lock.json
README.md                   .gitignore                LICENSE (to be chosen by the author)
docs/ui-kit.md              docs/ui8-submission.md
previews/*.png              (13 curated product screenshots)
scripts/verify.mjs          scripts/smoke.mjs
src/
  App.jsx  main.jsx  routes.js  index.css
  components/ui/            8 primitive modules (Button, Form, Surface, Data,
                            Navigation, Overlay, Feedback, Charts)
  components/layout/        Sidebar.jsx  TopBar.jsx
  pages/                    17 page modules + content/ events/ messages/ helpers
  store/                    AppStore.jsx (reducer + persistence)  selectors.js
  data/seed.js              the whole demo dataset
  lib/                      router.jsx  storage.js  utils.js
```

45 files in `src`, ~17.6k lines. Three runtime dependencies (`react`, `react-dom`,
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

1. **Commit the current tree.** 42 files under `src/`, `docs/`, `scripts/`, `.gitignore`
   and the rewritten `README.md` are still untracked, and the old app's components show
   as deletions. A buyer who clones today gets the *previous* product.
2. **Untrack build and dependency output.** `git ls-files` reports 6,256 files under
   `node_modules/` and 3 under `dist/` committed to the repository. `.gitignore` already
   lists them, but ignore rules do not apply to already-tracked paths:
   `git rm -r --cached node_modules dist` then commit. Without this the download is
   hundreds of megabytes of dependencies.
3. **Choose and add `LICENSE`.** `README.md` currently defers the template licence to the
   UI8 listing; the marketplace needs an explicit file before review.
4. Re-shoot the hero images at the final resolution UI8 asks for
   (`npm run smoke -- --shots .shots --routes-only`), and confirm `previews/` matches.
5. Run the full validation trio one last time on a clean install:
   `rm -rf node_modules && npm ci && npm run verify && npm run build && npm run smoke`.
6. Remove development-only files from the package if UI8 wants a zip rather than a repo:
   `promt.md`, `.qoder/`, `.shots*/`.
7. Record the demo walkthrough above (60–90 s) — it is the single strongest acceptance
   signal for a "functional template" claim.
