# UI kit reference

Every screen is built from these primitives. Do not hand-roll a new button, card,
input or badge — extend the kit instead so the product stays one design language.

All colours come from the tokens in `src/index.css` (`bg-surface`, `text-content-2`,
`border-line`, `bg-brand-fill`, `text-danger-content`, …). Never write a raw hex in a
component unless it is a chart colour variable.

---

## Button.jsx

```jsx
<Button variant size icon iconRight loading disabled onClick>Label</Button>
```

- `variant`: `primary` `accent` `secondary` `outline` `ghost` `danger` `danger-ghost` (default `secondary`)
- `size`: `xs` `sm` `md` `lg` (default `md`)
- `icon` / `iconRight`: a lucide component, not an element: `icon={Plus}`
- Every control renders `type="button"`, so nothing submits a form by accident. Pass
  `type="submit"` explicitly on the one button inside a form that should submit.

```jsx
<IconButton icon={X} label="Close dialog" variant="plain" size="md" active onClick />
```

`label` is required — it becomes `aria-label` and the tooltip.

## Form.jsx

```jsx
<Field label="Community name" hint="Shown in the directory" error={errors.name} required>
  <Input value={form.name} onChange={...} />
</Field>
```

`Field` clones `id`, `aria-describedby` and `aria-invalid` onto its single child, so
wrap exactly one control.

- `<Input>` `<Textarea rows>` `<Select>` — all accept `invalid`
- `<Select>` children are `<option>` elements
- `<Checkbox label description checked onChange />`
- `<Switch label description checked onChange />`
- `validate(values, rules)` returns `{ field: message }`; helpers `required(value, label)`
  and `isEmail(value)`.

Rules signature: `(value, allValues) => string | ''`.

## Surface.jsx

```jsx
<Card padded interactive>          // rounded panel, border, shadow token
  <CardHeader title description icon action />
  <CardBody>…</CardBody>            // adds the top gap
</Card>

<PageHeader title description breadcrumb actions meta />   // the route's <h1>
<SectionTitle action>Collections</SectionTitle>            // small uppercase heading
<Divider label="Or continue with" />
<MetaRow label="Members">42</MetaRow>                      // definition-list row
```

## Data.jsx

```jsx
<Badge tone="neutral|brand|accent|success|warning|danger|info" icon>{children}</Badge>
<OutlineBadge tone>{children}</OutlineBadge>               // quieter, for dense tables

<Avatar name hue size status src />   // size: 6 8 9 10 12 16; status: online|away|offline|suspended
<AvatarStack people={[{id,name,hue}]} max={4} size={8} />

<Progress value max tone label />
<Metric label value delta deltaSuffix hint invertDelta icon tone />
<Delta value />                       // +8.2% green, -3.1% red, 0 "no change"

<SearchInput value onChange placeholder label resultCount />
<Pagination page pageCount total pageSize onChange />
const { page, pageCount, slice } = paginate(rows, page, pageSize)

<TableShell><thead>…</thead><tbody>…</tbody></TableShell>
<Th align="left|right|center">Members</Th>
<Tr onClick selected><Td>…</Td></Tr>
```

`paginate` clamps the page when a filter shrinks the list — always use it instead of
slicing by hand.

## Navigation.jsx

```jsx
<FilterSelect label="Sort" value onChange options={[{value,label}]} />
```

`FilterSelect` options accept a bare string, `{ value, label }` or `{ key }` — the
seed's constant lists (`TASK_STATUSES`, `MEMBER_ROLES`) pass straight through without
remapping. Everything else in this block takes the shape shown.

```jsx
<Tabs items={[{key,label,count}]} value onChange />           // underline tabs
<Segmented options={[{key,label,icon}]} value onChange size /> // pill switch
<ChipFilter options={[…]} selected={[…]} onToggle={(key)=>…} />
<Toolbar>{search + filters + view switch + actions}</Toolbar>
<Breadcrumbs items={[{label,href},{label}]} />
```

## Overlay.jsx

```jsx
<Dialog open onClose title description size bodyClassName footer dismissible>{children}</Dialog>
<ConfirmDialog open onCancel onConfirm title body confirmLabel tone />
<Drawer open onClose title footer width>{children}</Drawer>
<Popover trigger label align width>{(close) => …}</Popover>
<Disclosure summary defaultOpen>
```

```jsx
<Menu label icon leading text items align size triggerClassName />
```

`label` is always the accessible name (`aria-label` on the trigger and on the panel),
so a row menu can say `Actions for {member.name}` without printing it. The trigger is
icon-only unless you pass `text`, which shows `label` as the caption — that is how the
theme control reads "Light". Pass `leading={<Dots/>}` to replace the icon entirely.

Menu items: `{ label, icon, onSelect, danger, disabled, hint }` or `{ divider: true }`.
`Popover` `trigger` is a single element (the click handler and aria state are cloned
onto it); children may be a function receiving `close`.

`Dialog` and `Drawer` take content as `children` (not a `body` prop); `bodyClassName`
exists because the scroll container is theirs, not yours.

Every destructive action goes through `ConfirmDialog`. Never `window.confirm` — the
smoke harness fails a route that opens a native dialog.

## Feedback.jsx

```jsx
<EmptyState icon title body action tone />
<ErrorState title body onRetry />
<Skeleton className />
<SkeletonCard lines />
<SkeletonRows rows />
<StatusMessage tone>3 members updated</StatusMessage>
<Toaster />                       // already mounted in App.jsx
```

Toasts come from the store: `actions.notify('Community archived', 'success')`.

## Charts.jsx

```jsx
<LineChart data series xKey height area formatValue formatX />
// data: [{ label, joined, departed }]  series: [{ key: 'joined', label: 'Joined', color? }]
<BarChart data valueKey xKey height color formatValue />
<RankedBars data valueKey labelKey color />
<DonutChart data={[{label,value}]} size centerLabel centerValue />
<Sparkline values={[…]} />
<ChartLegend series={[{key,label,color,value?}]} />
```

Charts measure their container, so they are responsive for free. Pass live records —
never a hardcoded array of shapes.

The y axis picks whole-number gridlines (`0 / 20 / 40 / 60`) instead of dividing the
data maximum into fifths, so a series of member counts never labels itself
`0 / 13 / 26 / 38 / 51`. x labels thin themselves to fit the measured width and always
keep the newest point. Nothing to configure — feeding a chart a real number array is
the whole contract.

## lib/utils.js

The shared helpers pages actually use; 41 exports, no dependencies.

```jsx
cn(active && 'bg-brand-fill', 'px-3')      // join class names, drop falsy
formatCount(12_400)                        // "12.4K"
relativeTime(iso)                          // "3 days ago"
dueLabel(iso)                              // { text: "Overdue by 2 days", tone: "danger" }
percentChange(current, previous)           // guard for a zero baseline
initials(name) · slugify(title) · uid('task')
groupBy(rows, (r) => r.communityId)        // Map
monthGrid(anchor)                          // 6x5 cells, Monday-first, for calendars
```

Search and export:

```jsx
const hits = rows.filter((row) => matchesQuery(row, search, ['name', 'email']))
downloadFile('members.csv', toCsv(rows), 'text/csv;charset=utf-8')
await copyText(appUrl(`/members/${id}`))   // shareable link for the current build
oneOf(query.get('view'), ['grid', 'table'], 'grid')
```

`matchesQuery` is per-item on purpose — a page owns its field list, so filtering stays
local to the record shape. `csvCell` neutralises a leading `= + - @` in a string so a
crafted record name cannot execute as a formula when the export is opened in a
spreadsheet. `appUrl` reads `window.location`, so deep links work on any host without a
base-path constant to keep in sync. `oneOf` is the guard for anything read out of the
URL: an unknown value falls back instead of rendering an empty view.

---

## Page conventions

- One `<PageHeader>` per route; it owns the `<h1>`.
- Toolbar directly under the header: search, filters, then the view switch.
- Lists go through `paginate()` + `<Pagination>`; empty results use `<EmptyState>` with a
  "Clear filters" action, not an empty box.
- Detail pages are separate routes (`/communities/:id`), not modal overlays.
- Mutations call `actions.add/update/remove` then `actions.notify(...)`.
- Delete flows: `Menu` item → `ConfirmDialog` → remove → notify.

### Query parameters

Filters that are worth a deep link (`/analytics?range=7d`,
`/content?status=draft&community=c-design-circle`) are read once into `useState` and
written back with `navigate`. Never trust the value:

```jsx
const [view, setView] = useState(() => oneOf(query.get('view'), ['grid', 'table'], 'grid'))
const tab = TABS.some((t) => t.key === query.get('tab')) ? query.get('tab') : 'overview'
```

A hand-typed or stale URL therefore lands on the page default rather than a blank
screen; `verify.mjs` asserts `oneOf` on invented, missing and unknown values.

### Routing

`src/routes.js` is the single source of truth: `NAV_GROUPS` for the sidebar and
`ROUTES`, an ordered list of `{ pattern, key, title, nav }`. `App.jsx` reads the same
table for the document title, the active nav item and the breadcrumb, and
`scripts/smoke.mjs` parses it to walk every route — so a new screen is registered in
exactly one place. Patterns use `:param` segments, resolved by `useRoute(routes)`; the
query string is stripped before matching and handed to the page as a `URLSearchParams`.

The ⌘K search is separate: `SEARCH_SOURCES` in `TopBar.jsx` maps a record collection to
its detail route, so results are real members, events and tasks rather than a list of
page names.
