# Communities — Community Management Dashboard

A production-shaped React dashboard for the people who run online communities: the rooms they host, the members inside them, the events, the moderation and publishing work in flight, and the numbers that show whether any of it is working.

18 screens over 20 routes, one persistent local data model, and no backend. Every figure on every screen is computed from the same records, so creating a community, moving a task, registering for an event or posting a message immediately changes the dashboard, the analytics page and the badges — which is the part a static template normally fakes.

**Demo mode, stated plainly:** there is no server, no database and no authentication. The `/signup` screen is a form with real validation that hands you back to the demo; it does not create an account. State persists to `localStorage`, and a reset control lives in Settings → Demo data.

**Running the app?** [`docs/usage-guide.md`](docs/usage-guide.md) is the manual — every screen, the everyday workflows, keyboard shortcuts, URL filters, and where the data lives.

---

## Requirements

- Node.js `^20.19.0 || >=22.12.0` (Vite 7 requirement)
- npm (a lockfile is committed; install with `npm ci` for reproducible output)
- Google Chrome or Chromium, only for `npm run smoke`

No API keys, no environment variables, no external services. The app runs entirely from the repository.

## Quick start

```bash
npm ci
npm run dev           # http://localhost:5173 — opens on the landing page at #/
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR. |
| `npm run build` | Production build into `dist/`, route-level code splitting. |
| `npm run preview` | Serves the built `dist/` locally. |
| `npm run verify` | 621 logic assertions over the data model, utilities and selectors. Pure Node, no browser. |
| `npm run smoke` | Renders **every route in real headless Chrome**, then drives **20 workflow interactions**, failing on any console error, uncaught exception, native dialog, broken asset, horizontal overflow or ignored query parameter. |
| `npm run package` | Assembles `ui8-upload/` and `ui8-upload.zip` from the allowlist in `scripts/package.mjs`, then verifies nothing development-only leaked in. |

`npm run smoke` expects the dev server to be running (`npm run dev &`). Useful flags:

```bash
node scripts/smoke.mjs --shots .shots --theme light    # capture 38 routes × desktop/tablet/mobile
node scripts/smoke.mjs --theme dark --shots .shots-dark
node scripts/smoke.mjs --routes /analytics --routes-only
node scripts/smoke.mjs --only /tasks             # one route and its deep links
node scripts/smoke.mjs --skip /settings          # exclude routes
DEBUG_CONSOLE=1 node scripts/smoke.mjs           # also report warnings and info logs
CHROME=/path/to/chromium node scripts/smoke.mjs  # non-default browser location
```

A clean run of the whole suite looks like this:

```
621 checks passed — data model, utils and selectors are consistent.
38 routes · 0 errors · 0 warnings
20 interaction checks passed
```

## Screens

| Area | Routes | Notes |
| --- | --- | --- |
| Home | `/` | Public landing page — no sidebar, no top bar. Hero, live totals, a real chart, the 11-screen tour, five use cases and an explicit split between what works and what is simulated. Its primary button opens the screen chosen in Settings → Appearance → Start screen, and the sidebar logo comes back to it. |
| Dashboard | `/dashboard` | Metrics, 12-month growth/engagement toggle, attention queue, upcoming events with working registration, task queue, activity feed. |
| Analytics | `/analytics` | 12 computed metrics, growth, joins vs departures, engagement trend, community breakdown, content performance, channel activity. Range switcher (7/30/90 days/all) and CSV export. |
| Communities | `/communities`, `/communities/:id` | Grid or table, favourites, per-community roster, channels, moderation queue, member management. |
| Members | `/members`, `/members/:id` | Directory with role/status/community filters, bulk selection, invite flow, per-member profile with activity, roles and tasks. |
| Events | `/events`, `/events/:id` | Month calendar, week strip, agenda, registration with capacity, attendee list, detail page. |
| Tasks | `/tasks` | Kanban with real HTML5 drag-and-drop plus a keyboard path for every move, list view with sortable columns, drawer editor, labels, priorities, overdue filter. |
| Content | `/content`, `/content/:id` | Draft/scheduled/published pipeline, composer with scheduling, per-item metrics, detail page. |
| Collections | `/collections`, `/collections/:id` | Curated libraries with add/remove items. |
| Messages | `/messages`, `/messages/:id` | Channel list grouped by community, unread counts, thread view, composer that writes into the store and moves the engagement numbers. |
| Notifications | `/notifications` | Tabs (all/unread/urgent), mark-read, deep links into the referenced record. |
| Settings | `/settings`, `/settings/:section` | Profile, Workspace, Appearance, Notifications, Security, Demo data — all writing to the local store. |
| Signup | `/signup` | Join form: four required fields validated inline, live product preview, theme control. Writes the workspace name into the store and hands over to the dashboard — it creates no account. |

Deep links are honoured everywhere a filter exists: `/members?status=invited`, `/tasks?filter=overdue`, `/tasks?task=t-05`, `/content?status=scheduled`, `/communities?view=grid`, `/notifications?tab=unread`, `/analytics?range=90d`, `/messages/:id`. Hand-edited values are validated against the control's option list, so an unknown parameter falls back to the default instead of rendering an empty screen.

## Previews

`previews/` holds 90 PNGs captured from the running app — no mockups, nothing staged in an
image editor. Every number, name and date in them is the seeded demo data as it renders today.

| Folder | Contents |
| --- | --- |
| `previews/desktop/` | The 20 screens at 1440×900 (2× density), light theme. |
| `previews/mobile/` | The same 20 screens at 390×844, light theme. |
| `previews/dark/` | The same 20 screens at 1440×900, dark theme. |
| `previews/dark-mobile/` | The same 20 screens at 390×844, dark theme. |
| `previews/views/` | 10 alternate states worth showing buyers: table/agenda/list views, the overdue and draft filters, the 90-day range, the unread tab, a search and the new-event dialog. |

Files are numbered in tour order (`00-home`, `01-dashboard`, … `19-signup`), so each folder reads
as a walk-through and the four page sets line up name for name. A tablet set (900×700) and the
remaining deep-link states are regenerable with the commands above.

## Upload package

`npm run package` writes `ui8-upload/` plus `ui8-upload.zip` — the customer-facing tree, assembled
from the explicit allowlist at the top of `scripts/package.mjs`: the app source, the preview
screenshots, `docs/usage-guide.md`, `docs/ui-kit.md`, the three scripts and the manifest files.
Development material (`node_modules/`, `dist/`, `.shots*/`, `.git`, local notes) is on a denylist
inside the same file, cannot be matched by any allowlist entry, and the run fails if anything
unexpected turns up in the output. It is safe to re-run: it only ever rebuilds a directory it
created itself, and refuses to overwrite one without its marker.

The package is source, not a build — the customer runs `npm install && npm run dev`. A `LICENSE`
at the repository root is picked up automatically once it exists; add one before submitting if the
marketplace requires it. `--no-previews` drops the 90 screenshots (57 files, 0.8 MB) for the case
where the listing images go up separately.

## How it is built

```
src/
  main.jsx              # root render
  App.jsx               # shell + lazy route table
  routes.js             # single source of truth: nav groups, patterns, titles
  index.css             # Tailwind v4 theme tokens (light + dark)
  data/
    seed.js             # the demo dataset and its generator
  store/
    AppStore.jsx        # reducer + context, one action per mutation
    selectors.js        # every derived number in the product
    storage.js          # localStorage persistence under communities.v1
  lib/
    router.jsx          # hash router, params + query string
    utils.js            # formatters, date maths, CSV, filter validation
  components/
    ui/                 # 58 exports across Button, Data, Form, Overlay,
                        # Navigation, Surface, Feedback, Charts
    layout/             # Sidebar, TopBar, global search, notifications, theme
  pages/                # one file per screen, code-split per route
scripts/
  verify.mjs            # logic assertions (Node)
  smoke.mjs             # real-browser route + interaction harness
  package.mjs           # assemble the upload directory (npm run package)
docs/
  usage-guide.md        # how to use the product, screen by screen
  ui-kit.md             # primitive API and conventions
previews/
  desktop/ mobile/      # every screen in light, at 1440 and 390
  dark/ dark-mobile/    # the same screens in dark
  views/                # state variants: ranges, filters, modals, empty results
```

Three rules keep the codebase honest:

1. **Nothing is stored that can be derived.** Totals, rates, breakdowns, streaks and per-community stats are computed in `selectors.js` from the records themselves. A mutation cannot desynchronise a chart.
2. **One route table.** `routes.js` drives the sidebar, the breadcrumbs, the active-nav highlight and the code-split page map, so a screen cannot appear in one place and not another.
3. **Charts take real records.** `LineChart`/`BarChart`/`DonutChart` receive the same objects the rest of the page uses, with a `key` per series — no parallel array of numbers to keep in step.

### Data model

`members (51) · communities (8) · events (25) · tasks (31) · content (28) · collections (6) · conversations (6, 35 messages) · notifications (14) · activity (20) · analytics {12 monthly, 59 daily}`

Relationships are by id: a community has `memberIds` and an `ownerId`; a member has `communityIds`; tasks, content and events point at a `communityId`; collections hold `itemIds`; conversations hold messages with `authorId`. Every reference is asserted to resolve by `npm run verify`, and the seeded history is generated relative to today so the demo never shows a stale date.

The store persists to `localStorage` under `communities.v1`. Seeds older than 14 days are rebuilt, which is what keeps "3 hours ago" and "next Tuesday" true months later. To start over: **Settings → Demo data → Reset demo data**, or clear the key.

### Theming

Colours, radii and shadows are CSS custom properties in `src/index.css`, exposed to Tailwind through `@theme inline`. Components only ever use the semantic names — `bg-surface`, `text-content-2`, `border-line`, `bg-brand-fill`, `shadow-card`, `rounded-control` — never a raw colour.

```css
:root {
  --brand: #3871ee;        /* links, focus rings, selected state */
  --brand-fill: #2f66dd;   /* button backgrounds that carry white text */
  --accent: #f4405e;       /* badges, unread dots, emphasis */
  --accent-fill: #d92845;  /* the same accent as a filled surface */
}

@theme inline {
  --radius-control: 0.4375rem;   /* inputs, buttons, chips */
  --radius-card: 0.75rem;        /* cards, rows, panels */
  --radius-panel: 1rem;          /* dialogs, drawers, popovers */
}
```

Change the four brand values and the whole product rebrands, in both themes. `--brand` and `--brand-fill` are deliberately split — the first is the text/border accent, which lightens in dark mode for contrast, the second is a fill that stays dark enough to keep white label text above the 4.5:1 AA threshold in both themes. Each has `-2` (hover), `-soft` (tinted background) and `-content` (readable text on that tint) partners, and `.dark` overrides the same names. Dark mode is a `.dark` class toggled before first paint by an inline script in `index.html` (no theme flash), driven by Settings → Appearance (light / dark / system, plus the collapsed-sidebar and landing-page preferences).

Type is the system stack (`-apple-system, …`), so there are no font licences to carry and no network requests on load.

### Replacing the demo data with a real backend

The store is one reducer behind a context, so the integration surface is small:

1. Keep the record shapes in `src/data/seed.js` as your schema, or map your API responses into them.
2. Replace `loadSeed()` with a fetch, and the `actions.*` methods in `AppStore.jsx` with the corresponding API calls (each already receives the full record, so optimistic updates are a local change).
3. Keep `selectors.js` — derived numbers should come from your aggregation endpoints, but the shapes are already what the UI needs.
4. Delete the persistence call in `saveState` and the reset control in Settings → Demo data.

Nothing else in the tree knows where data comes from.

## Use cases

- **Community manager, one workspace, many rooms.** The dashboard's attention queue (overdue tasks, unread notifications, pending invites, drafts) is the daily starting point; each row deep-links into the work.
- **Programme lead running an event calendar.** Month/week/agenda views, capacity against registrations, and a registration button that changes both the event and the analytics attendance series.
- **Moderation team working a queue.** Tasks board with drag-and-drop and a keyboard path, per-community escalation notes, member status changes with confirm-before-destructive dialogs.
- **Content and newsletter pipeline.** Draft → scheduled → published with a composer, a scheduler, per-item performance, and collections that curate published work into libraries.
- **Reporting to a sponsor or stakeholder.** Analytics over 7/30/90-day or all-time ranges, with a one-click CSV export built from the same computed figures on screen.

## Accessibility and keyboard behaviour

Visible focus rings on every interactive element (not removed anywhere), `aria-label`s on icon-only controls, `role="menu"`/`role="dialog"`/`aria-expanded` on overlays, Escape to close, arrow-key roving focus in menus and the command palette, ⌘K/Ctrl-K global search, focus moved into dialogs on open, and drag-and-drop duplicated by a menu command so no action is pointer-only. Charts carry `role="img"` labels and tooltips expose the underlying values. Colour is never the only signal: statuses pair a tone with a label, and deltas carry an arrow.

## Limitations

Deliberate, not unfinished:

- No authentication, authorisation or multi-user state. The current user is fixed; `/signup` proves the form, not an account.
- No server. Uploads, email, calendar sync and export-to-sheets are simulated — CSV download and clipboard copy are genuinely implemented in the browser.
- Single-tab persistence: two tabs will not sync live.
- Real-time message activity is seeded history plus your own writes, not a socket.
- `npm run smoke` requires Chrome; `npm run verify` does not.

## Credits and licence

- [React](https://react.dev) (MIT), [ReactDOM](https://react.dev) (MIT)
- [Vite](https://vite.dev) (MIT) and [@vitejs/plugin-react](https://npmjs.com/package/@vitejs/plugin-react) (MIT)
- [Tailwind CSS v4](https://tailwindcss.com) (MIT) and [@tailwindcss/vite](https://npmjs.com/package/@tailwindcss/vite) (MIT)
- [lucide-react](https://lucide.dev) icons — ISC, licence text in `node_modules/lucide-react/LICENSE`; icons are used unmodified at their default geometry
- No stock photography, illustrations or fonts are bundled. Avatars are generated initials; the favicon is inline SVG.
- All names, communities, messages and metrics in the seed data are fictional.

The template code in this repository is supplied under the licence stated on its UI8 listing page. Third-party packages keep their own licences as listed above.
# Community
