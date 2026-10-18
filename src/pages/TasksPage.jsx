/**
 * Tasks — the job desk.
 *
 * A kanban board with real HTML5 drag-and-drop plus a keyboard path for every
 * move, and a sortable list over the same filtered records. One drawer edits a
 * task from either view. Deep links are honoured: `/tasks?task=t-05` opens that
 * task and `?filter=overdue` pre-applies the overdue filter.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronRight,
  ClipboardList,
  GripVertical,
  KanbanSquare,
  LayoutList,
  Pencil,
  Plus,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import { Link, navigate } from '../lib/router.jsx'
import {
  DAY_MS,
  addDays,
  cn,
  dueLabel,
  formatDay,
  matchesQuery,
  oneOf,
  pad2,
  relativeTime,
  uid,
} from '../lib/utils.js'
import { TASK_PRIORITIES, TASK_STATUSES } from '../data/seed.js'
import { useApp } from '../store/AppStore.jsx'
import { lookupCommunity, lookupMember, overdueTasks, tasksByStatus } from '../store/selectors.js'
import { Button, IconButton } from '../components/ui/Button.jsx'
import {
  Avatar,
  AvatarStack,
  Badge,
  OutlineBadge,
  Pagination,
  SearchInput,
  TableShell,
  Td,
  Th,
  Tr,
  paginate,
} from '../components/ui/Data.jsx'
import { Card, CardBody, CardHeader, MetaRow, PageHeader } from '../components/ui/Surface.jsx'
import { ChipFilter, FilterSelect, Segmented, Toolbar } from '../components/ui/Navigation.jsx'
import { Checkbox, Field, Input, Select, Textarea, required, validate } from '../components/ui/Form.jsx'
import { ConfirmDialog, Dialog, Drawer, Menu } from '../components/ui/Overlay.jsx'
import { EmptyState, StatusMessage } from '../components/ui/Feedback.jsx'

const PAGE_SIZE = 12
const STATUS_DOT = {
  todo: 'bg-content-3',
  doing: 'bg-brand',
  review: 'bg-warning',
  done: 'bg-success',
}

const statusOf = (key) => TASK_STATUSES.find((item) => item.key === key) || TASK_STATUSES[0]
const priorityOf = (key) => TASK_PRIORITIES.find((item) => item.key === key) || TASK_PRIORITIES[3]

/** `YYYY-MM-DD` in the browser's own calendar, for `<input type="date">`. */
function dateInputValue(value) {
  const date = new Date(value)
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

const isOverdue = (task) =>
  task.status !== 'done' && new Date(task.dueDate).getTime() < startOfToday()

function startOfToday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today.getTime()
}

/** A finished task reports when it landed, not how late the deadline once was. */
function dueBadge(task) {
  if (task.status !== 'done') return dueLabel(task.dueDate)
  return {
    text: task.completedAt ? `Completed ${relativeTime(task.completedAt)}` : 'Completed',
    tone: 'success',
  }
}

function draftFromTask(task) {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assigneeId: task.assigneeId,
    communityId: task.communityId,
    due: dateInputValue(task.dueDate),
    labels: [...task.labels],
  }
}

const SORTS = [
  { key: 'title', label: 'Task' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'due', label: 'Due' },
  { key: 'community', label: 'Community' },
]

function rowValue(task, key, state) {
  switch (key) {
    case 'title':
      return task.title.toLowerCase()
    case 'assignee':
      return task.assigneeName.toLowerCase()
    case 'status':
      return TASK_STATUSES.findIndex((item) => item.key === task.status)
    case 'priority':
      return TASK_PRIORITIES.findIndex((item) => item.key === task.priority)
    case 'due':
      return new Date(task.dueDate).getTime()
    default:
      return (lookupCommunity(state, task.communityId)?.name || '').toLowerCase()
  }
}

export default function TasksPage({ query }) {
  const { state, actions, currentMember } = useApp()
  const currentUserId = currentMember?.id || state.currentUserId
  const params = query || new URLSearchParams()
  const taskParam = params.get('task') || ''
  const overdueParam = params.get('filter') === 'overdue'

  const [view, setView] = useState(() => oneOf(params.get('view'), ['board', 'list'], 'board'))
  const [search, setSearch] = useState(() => params.get('q') || '')
  const [communityId, setCommunityId] = useState('all')
  const [assigneeId, setAssigneeId] = useState('all')
  const [priority, setPriority] = useState('all')
  const [labels, setLabels] = useState([])
  const [overdueOnly, setOverdueOnly] = useState(overdueParam)
  const [drawerId, setDrawerId] = useState(taskParam || null)
  const [creating, setCreating] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [draggingId, setDraggingId] = useState(null)
  const [overStatus, setOverStatus] = useState(null)
  const [sort, setSort] = useState({ key: 'due', dir: 'asc' })
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (taskParam) setDrawerId(taskParam)
  }, [taskParam])

  useEffect(() => {
    if (overdueParam) setOverdueOnly(true)
  }, [overdueParam])

  useEffect(() => {
    setPage(1)
  }, [search, communityId, assigneeId, priority, labels, overdueOnly, sort])

  const closeDrawer = () => {
    setDrawerId(null)
    if (taskParam) navigate(`/tasks${overdueParam ? '?filter=overdue' : ''}`, { replace: true })
  }

  const filtersOn =
    Boolean(search) ||
    communityId !== 'all' ||
    assigneeId !== 'all' ||
    priority !== 'all' ||
    labels.length > 0 ||
    overdueOnly

  const clearFilters = () => {
    setSearch('')
    setCommunityId('all')
    setAssigneeId('all')
    setPriority('all')
    setLabels([])
    setOverdueOnly(false)
  }

  const overdueIds = useMemo(() => new Set(overdueTasks(state).map((task) => task.id)), [state.tasks])
  const labelOptions = useMemo(
    () => [...new Set(state.tasks.flatMap((task) => task.labels))].sort(),
    [state.tasks],
  )

  const passes = (task) =>
    matchesQuery(task, search, ['title', 'description', 'assigneeName']) &&
    (communityId === 'all' || task.communityId === communityId) &&
    (assigneeId === 'all' || task.assigneeId === assigneeId) &&
    (priority === 'all' || task.priority === priority) &&
    (labels.length === 0 || labels.every((label) => task.labels.includes(label))) &&
    (!overdueOnly || overdueIds.has(task.id))

  const filtered = useMemo(
    () => state.tasks.filter((task) => passes(task)),
    [state.tasks, search, communityId, assigneeId, priority, labels, overdueOnly],
  )

  const openCount = state.tasks.filter((task) => task.status !== 'done').length
  const doneThisWeek = state.tasks.filter(
    (task) => task.completedAt && Date.now() - new Date(task.completedAt).getTime() <= 7 * DAY_MS,
  ).length

  const move = (taskId, status) => {
    const task = state.tasks.find((item) => item.id === taskId)
    if (!task || task.status === status) return
    actions.update('tasks', taskId, {
      status,
      completedAt: status === 'done' ? task.completedAt || new Date().toISOString() : null,
    })
    actions.notify(`${task.title} → ${statusOf(status).label}`, status === 'done' ? 'success' : 'info')
  }

  const cardMenu = (task) => [
    { label: 'Open details', icon: Pencil, onSelect: () => setDrawerId(task.id) },
    { divider: true },
    ...TASK_STATUSES.map((status) => ({
      label: `Move to ${status.label}`,
      icon: status.key === 'done' ? Check : ChevronRight,
      disabled: task.status === status.key,
      onSelect: () => move(task.id, status.key),
    })),
    { divider: true },
    { label: 'Delete task', icon: Trash2, danger: true, onSelect: () => setPendingDelete(task) },
  ]

  const sortedRows = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const first = rowValue(a, sort.key, state)
        const second = rowValue(b, sort.key, state)
        if (first === second) return new Date(a.dueDate) - new Date(b.dueDate)
        return (first > second ? 1 : -1) * (sort.dir === 'asc' ? 1 : -1)
      }),
    [filtered, sort, state],
  )

  const toggleSort = (key) =>
    setSort((current) =>
      current.key === key ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' },
    )

  const paged = paginate(sortedRows, page, PAGE_SIZE)
  const activeTask = drawerId ? state.tasks.find((task) => task.id === drawerId) || null : null
  const groups = tasksByStatus(state)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Tasks"
        description={`${openCount} open · ${overdueIds.size} overdue · ${doneThisWeek} completed in the last seven days. ${filtered.length} of ${state.tasks.length} match the current filters.`}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
            New task
          </Button>
        }
      />

      <Toolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          label="Task title"
          placeholder="Search tasks"
          resultCount={filtered.length}
          className="min-w-40 sm:max-w-64"
        />
        <FilterSelect
          label="Community"
          value={communityId}
          onChange={setCommunityId}
          options={[
            { value: 'all', label: 'All communities' },
            ...state.communities.map((community) => ({ value: community.id, label: community.name })),
          ]}
        />
        <FilterSelect
          label="Assignee"
          value={assigneeId}
          onChange={setAssigneeId}
          options={[
            { value: 'all', label: 'Anyone' },
            ...[...state.members]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((member) => ({ value: member.id, label: member.name })),
          ]}
        />
        <FilterSelect
          label="Priority"
          value={priority}
          onChange={setPriority}
          options={[
            { value: 'all', label: 'Any' },
            ...TASK_PRIORITIES.map((item) => ({ value: item.key, label: item.label })),
          ]}
        />
        <Checkbox
          label="Overdue only"
          checked={overdueOnly}
          onChange={(event) => setOverdueOnly(event.target.checked)}
          className="h-7 items-center"
        />

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Segmented
            options={[
              { key: 'board', label: 'Board', icon: KanbanSquare },
              { key: 'list', label: 'List', icon: LayoutList },
            ]}
            value={view}
            onChange={setView}
          />
          {filtersOn && (
            <Button variant="ghost" size="xs" icon={X} onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>

        {labelOptions.length > 0 && (
          <div className="w-full border-t border-line pt-2">
            <ChipFilter
              selected={labels}
              onToggle={(key) =>
                setLabels((current) =>
                  current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
                )
              }
              options={labelOptions}
            />
          </div>
        )}
      </Toolbar>

      {view === 'board' ? (
        <>
          <p className="flex flex-wrap items-center gap-2 text-[11px] text-content-3">
            <GripVertical size={13} />
            Drag a card into another column to move it, or open the card menu for the same actions
            without a pointer.
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {TASK_STATUSES.map((status) => {
              const rows = (groups.get(status.key) || []).filter((task) => passes(task))
              const isDropTarget = overStatus === status.key && draggingId
              return (
                <section
                  key={status.key}
                  data-column={status.key}
                  aria-label={`${status.label} column`}
                  onDragOver={(event) => {
                    event.preventDefault()
                    event.dataTransfer.dropEffect = 'move'
                    if (overStatus !== status.key) setOverStatus(status.key)
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    const id = event.dataTransfer.getData('text/plain') || draggingId
                    if (id) move(id, status.key)
                    setDraggingId(null)
                    setOverStatus(null)
                  }}
                  className={cn(
                    'flex min-w-0 flex-col rounded-panel border bg-surface p-2.5 transition-colors',
                    isDropTarget ? 'border-brand bg-brand-soft' : 'border-line',
                  )}
                >
                  <header className="mb-2 flex items-center gap-2 px-1">
                    <span className={cn('size-2 shrink-0 rounded-full', STATUS_DOT[status.key])} />
                    <h2 className="min-w-0 flex-1 truncate text-[12px] font-semibold text-content">
                      {status.label}
                    </h2>
                    <span className="shrink-0 text-[11px] font-medium text-content-3 tnum">
                      {rows.length}
                    </span>
                  </header>

                  {rows.length === 0 ? (
                    <p className="rounded-control border border-dashed border-line-2 px-3 py-6 text-center text-[11px] text-content-3">
                      {isDropTarget ? 'Release to move it here' : 'Nothing in this column.'}
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {rows.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          state={state}
                          dragging={draggingId === task.id}
                          onOpen={() => setDrawerId(task.id)}
                          onDragStart={() => setDraggingId(task.id)}
                          onDragEnd={() => {
                            setDraggingId(null)
                            setOverStatus(null)
                          }}
                          menu={cardMenu(task)}
                        />
                      ))}
                    </ul>
                  )}
                </section>
              )
            })}
          </div>
        </>
      ) : (
        <Card>
          <CardHeader
            title="Task list"
            description="Click a column heading to sort, a row to open the task."
            icon={ClipboardList}
          />
          <CardBody>
            {sortedRows.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                tone="brand"
                title="No tasks match these filters"
                body={
                  overdueOnly
                    ? 'The overdue filter is on, so only late open tasks would show. Clear it to see the rest of the board.'
                    : 'Widen the filters, or add a task for the community you are looking at.'
                }
                action={
                  <Button variant="secondary" size="sm" icon={X} onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <>
                <TableShell>
                  <thead>
                    <tr>
                      {SORTS.map((column) => (
                        <Th key={column.key}>
                          <button
                            type="button"
                            onClick={() => toggleSort(column.key)}
                            aria-label={`Sort by ${column.label}`}
                            className={cn(
                              'inline-flex items-center gap-1 transition-colors hover:text-content',
                              sort.key === column.key ? 'text-content' : 'text-content-2',
                            )}
                          >
                            {column.label}
                            {sort.key === column.key ? (
                              sort.dir === 'asc' ? (
                                <ArrowUp size={11} strokeWidth={2.4} />
                              ) : (
                                <ArrowDown size={11} strokeWidth={2.4} />
                              )
                            ) : (
                              <ArrowUpDown size={11} className="opacity-40" />
                            )}
                          </button>
                        </Th>
                      ))}
                      <Th align="right" className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {paged.slice.map((task) => {
                      const assignee = lookupMember(state, task.assigneeId)
                      const community = lookupCommunity(state, task.communityId)
                      const due = dueBadge(task)
                      const late = task.status !== 'done' && isOverdue(task)
                      return (
                        <Tr key={task.id} onClick={() => setDrawerId(task.id)}>
                          <Td>
                            <span className="flex min-w-0 items-start gap-2">
                              <span
                                aria-hidden="true"
                                className={cn(
                                  'mt-1.5 size-2 shrink-0 rounded-full',
                                  STATUS_DOT[task.status],
                                )}
                              />
                              <span className="min-w-0">
                                {/* The row click is mouse-only, so the title is a real
                                    button to give the drawer a keyboard entry point. */}
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    setDrawerId(task.id)
                                  }}
                                  title={`Open ${task.title}`}
                                  className={cn(
                                    'block max-w-full truncate text-left text-[13px] font-medium transition-colors hover:text-brand',
                                    task.status === 'done'
                                      ? 'text-content-3 line-through'
                                      : 'text-content',
                                  )}
                                >
                                  {task.title}
                                </button>
                                {task.labels.length > 0 && (
                                  <span className="mt-1 flex flex-wrap gap-1">
                                    {task.labels.map((label) => (
                                      <span
                                        key={label}
                                        className="rounded-full bg-neutral-soft px-1.5 py-0.5 text-[10px] text-content-2"
                                      >
                                        {label}
                                      </span>
                                    ))}
                                  </span>
                                )}
                              </span>
                            </span>
                          </Td>
                          <Td>
                            <span className="flex items-center gap-2">
                              <Avatar name={assignee?.name} hue={assignee?.hue} size={6} />
                              <span className="min-w-0 truncate text-[12px] text-content">
                                {task.assigneeName}
                              </span>
                            </span>
                          </Td>
                          <Td>
                            <Badge tone={statusOf(task.status).tone}>{statusOf(task.status).label}</Badge>
                          </Td>
                          <Td>
                            <OutlineBadge tone={priorityOf(task.priority).tone}>
                              {priorityOf(task.priority).label}
                            </OutlineBadge>
                          </Td>
                          <Td className={cn('whitespace-nowrap text-[12px]', late ? 'font-medium text-danger' : 'text-content-2')}>
                            {due.text}
                          </Td>
                          <Td className="text-[12px] text-content-2">
                            {community?.name || 'Removed community'}
                          </Td>
                          <Td align="right">
                            <ChevronRight size={14} className="text-content-3" />
                          </Td>
                        </Tr>
                      )
                    })}
                  </tbody>
                </TableShell>
                <Pagination
                  page={paged.page}
                  pageCount={paged.pageCount}
                  total={sortedRows.length}
                  pageSize={PAGE_SIZE}
                  onChange={setPage}
                  className="mt-4"
                />
              </>
            )}
          </CardBody>
        </Card>
      )}

      {activeTask && (
        <TaskDrawer
          task={activeTask}
          state={state}
          actions={actions}
          onClose={closeDrawer}
          onDelete={() => setPendingDelete(activeTask)}
        />
      )}

      <NewTaskDialog
        open={creating}
        state={state}
        defaultAssigneeId={currentUserId}
        onClose={() => setCreating(false)}
        onCreate={(record) => {
          actions.add('tasks', record)
          actions.notify(`Task created — ${record.title}`, 'success')
          setCreating(false)
          setDrawerId(record.id)
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          actions.remove('tasks', pendingDelete.id)
          actions.notify(`Task deleted — ${pendingDelete.title}`, 'info')
          if (drawerId === pendingDelete.id) closeDrawer()
          setPendingDelete(null)
        }}
        title="Delete this task?"
        body={`“${pendingDelete?.title || 'This task'}” is ${
          pendingDelete ? statusOf(pendingDelete.status).label.toLowerCase() : 'open'
        } and assigned to ${pendingDelete?.assigneeName || 'the assignee'}. Deleting it removes it from the board, the list and every member's queue — there is no undo.`}
        confirmLabel="Delete task"
      />
    </div>
  )
}

/* ------------------------------------------------------------------ card -- */

function TaskCard({ task, state, dragging, onOpen, onDragStart, onDragEnd, menu }) {
  const assignee = lookupMember(state, task.assigneeId)
  const community = lookupCommunity(state, task.communityId)
  const due = dueBadge(task)

  return (
    <li data-task-id={task.id}>
      <article
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData('text/plain', task.id)
          event.dataTransfer.effectAllowed = 'move'
          onDragStart()
        }}
        onDragEnd={onDragEnd}
        onClick={onOpen}
        className={cn(
          'cursor-pointer rounded-card border border-line bg-surface p-3 shadow-card transition-[border-color,box-shadow,opacity] hover:border-line-2',
          dragging && 'opacity-50',
        )}
      >
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onOpen()
            }}
            className="min-w-0 flex-1 text-left"
          >
            <span
              className={cn(
                'block text-[13px] leading-snug font-medium',
                task.status === 'done' ? 'text-content-3 line-through' : 'text-content',
              )}
            >
              {task.title}
            </span>
          </button>
          {/* The card itself is a click target, so the menu (trigger and panel)
              has to stop the click from opening the drawer behind it. */}
          <span className="flex shrink-0" onClick={(event) => event.stopPropagation()}>
            <Menu items={menu} size="xs" />
          </span>
        </div>

        <p className="mt-2 flex flex-wrap items-center gap-1.5">
          <OutlineBadge tone={priorityOf(task.priority).tone}>
            {priorityOf(task.priority).label}
          </OutlineBadge>
          <Badge tone={due.tone}>{due.text}</Badge>
        </p>

        <div className="mt-2.5 flex items-center gap-2 border-t border-line pt-2.5">
          <Avatar name={assignee?.name} hue={assignee?.hue} size={6} />
          <span className="min-w-0 truncate text-[11px] text-content-2">{task.assigneeName}</span>
          {community && (
            <Link
              to={`/communities/${community.id}`}
              onClick={(event) => event.stopPropagation()}
              className="ml-auto min-w-0 truncate text-[11px] text-content-3 hover:text-brand-content hover:underline"
            >
              {community.name}
            </Link>
          )}
        </div>

        {task.labels.length > 0 && (
          <p className="mt-2 flex flex-wrap gap-1">
            {task.labels.map((label) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 rounded-full bg-neutral-soft px-1.5 py-0.5 text-[10px] text-content-2"
              >
                <Tag size={9} />
                {label}
              </span>
            ))}
          </p>
        )}
      </article>
    </li>
  )
}

/* ---------------------------------------------------------------- drawer -- */

function TaskDrawer({ task, state, actions, onClose, onDelete }) {
  const [draft, setDraft] = useState(() => draftFromTask(task))
  const [labelInput, setLabelInput] = useState('')
  const [titleError, setTitleError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    setDraft(draftFromTask(task))
    setLabelInput('')
    setTitleError('')
    setNotice('')
    /* Only re-seed when a different task is opened, so a save does not wipe the
       field the manager is still typing in. */
  }, [task.id])

  const creator = lookupMember(state, task.creatorId)
  const community = lookupCommunity(state, task.communityId)
  const watchers = task.watcherIds.map((id) => lookupMember(state, id)).filter(Boolean)
  const due = dueBadge(task)

  const set = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }))

  const addLabel = () => {
    const value = labelInput.trim().toLowerCase()
    if (!value) return
    if (!draft.labels.includes(value)) {
      setDraft((current) => ({ ...current, labels: [...current.labels, value] }))
    }
    setLabelInput('')
  }

  const save = () => {
    const error = validate({ title: draft.title }, { title: (value) => required(value, 'Title') })
    if (error.title) {
      setTitleError(error.title)
      setNotice('')
      return
    }
    setTitleError('')
    const assignee = lookupMember(state, draft.assigneeId)
    const parsedDue = draft.due ? new Date(`${draft.due}T17:00`) : new Date(task.dueDate)
    const patch = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      status: draft.status,
      priority: draft.priority,
      assigneeId: draft.assigneeId,
      assigneeName: assignee?.name || 'Unassigned',
      communityId: draft.communityId,
      dueDate: Number.isNaN(parsedDue.getTime()) ? task.dueDate : parsedDue.toISOString(),
      labels: draft.labels,
      completedAt:
        draft.status === 'done' ? task.completedAt || new Date().toISOString() : null,
    }
    actions.update('tasks', task.id, patch)
    actions.notify(`Task saved — ${patch.title}`, 'success')
    setNotice(
      `Saved. ${patch.assigneeName} owns it in “${community?.name || 'the community'}”, due ${formatDay(
        patch.dueDate,
      )}.`,
    )
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={task.title}
      width="max-w-lg"
      footer={
        <>
          <Button variant="danger-ghost" icon={Trash2} onClick={onDelete} className="mr-auto">
            Delete
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" icon={Check} onClick={save}>
            Save task
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={statusOf(draft.status).tone}>{statusOf(draft.status).label}</Badge>
          <OutlineBadge tone={priorityOf(draft.priority).tone}>
            {priorityOf(draft.priority).label}
          </OutlineBadge>
          <Badge tone={due.tone}>{due.text}</Badge>
        </div>

        <Field label="Title" required error={titleError}>
          <Input
            value={draft.title}
            onChange={(event) => {
              set('title')(event)
              if (titleError) setTitleError('')
            }}
            invalid={Boolean(titleError)}
          />
        </Field>

        <Field label="Description" hint="What “done” looks like, in one or two sentences.">
          <Textarea rows={4} value={draft.description} onChange={set('description')} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status">
            <Select value={draft.status} onChange={set('status')}>
              {TASK_STATUSES.map((status) => (
                <option key={status.key} value={status.key}>
                  {status.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={draft.priority} onChange={set('priority')}>
              {TASK_PRIORITIES.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Assignee" hint="The named owner receives the queue item.">
            <Select value={draft.assigneeId} onChange={set('assigneeId')}>
              {[...state.members]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} — {member.title}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Due date">
            <Input type="date" value={draft.due} onChange={set('due')} />
          </Field>
        </div>

        <Field label="Community">
          <Select value={draft.communityId} onChange={set('communityId')}>
            {state.communities.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex flex-col gap-2">
          <Field label="Labels" hint="Press Enter to add. Labels drive the board filters.">
            <Input
              value={labelInput}
              onChange={(event) => setLabelInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addLabel()
                }
              }}
              placeholder="moderation"
            />
          </Field>
          {draft.labels.length > 0 ? (
            <p className="flex flex-wrap gap-1.5">
              {draft.labels.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1 rounded-full bg-neutral-soft py-0.5 pr-1 pl-2 text-[11px] text-content-2"
                >
                  {label}
                  <IconButton
                    icon={X}
                    label={`Remove the ${label} label`}
                    size="sm"
                    className="size-5"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        labels: current.labels.filter((item) => item !== label),
                      }))
                    }
                  />
                </span>
              ))}
            </p>
          ) : (
            <p className="text-[11px] text-content-3">No labels yet.</p>
          )}
        </div>

        <div className="rounded-card border border-line bg-surface-2 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold tracking-wide text-content-2 uppercase">
              Watchers
            </p>
            <AvatarStack
              people={watchers.map((member) => ({ id: member.id, name: member.name, hue: member.hue }))}
              max={6}
              size={8}
            />
          </div>
          <p className="mt-2 text-[11px] leading-snug text-content-3">
            {watchers.length
              ? `${watchers.length} ${watchers.length === 1 ? 'member gets' : 'members get'} an update when this task moves.`
              : 'Nobody is watching this task yet.'}
          </p>
        </div>

        {notice && <StatusMessage tone="success">{notice}</StatusMessage>}

        <dl className="divide-y divide-line border-t border-line pt-1">
          <MetaRow label="Created by">{creator ? creator.name : 'Former member'}</MetaRow>
          <MetaRow label="Created">{relativeTime(task.createdAt)}</MetaRow>
          <MetaRow label="Community">{community?.name || 'Removed community'}</MetaRow>
          <MetaRow label="Completed at">
            {task.completedAt ? relativeTime(task.completedAt) : 'Not finished'}
          </MetaRow>
          <MetaRow label="Last known due">
            <span className="tnum">{formatDay(task.dueDate)}</span>
          </MetaRow>
        </dl>
      </div>
    </Drawer>
  )
}

/* ----------------------------------------------------------- new task -- */

function NewTaskDialog({ open, state, defaultAssigneeId, onClose, onCreate }) {
  const blank = () => ({
    title: '',
    communityId: state.communities[0]?.id || '',
    assigneeId: defaultAssigneeId,
    status: 'todo',
    priority: 'medium',
    due: dateInputValue(addDays(new Date(), 7)),
    labels: '',
    description: '',
  })
  const [form, setForm] = useState(blank)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    /* Every open starts from a clean form; the assignee default follows whoever
       is signed in, so a new task is owned from the first keystroke. */
    if (open) {
      setForm(blank())
      setErrors({})
    }
  }, [open, defaultAssigneeId])

  const set = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }))

  const submit = () => {
    const found = validate(
      { title: form.title, communityId: form.communityId, due: form.due },
      {
        title: (value) => required(value, 'Title'),
        communityId: (value) => required(value, 'Community'),
        due: (value) => required(value, 'Due date'),
      },
    )
    setErrors(found)
    if (Object.keys(found).length) return

    const assignee = lookupMember(state, form.assigneeId)
    const dueDate = new Date(`${form.due}T17:00`)
    const record = {
      id: uid('t'),
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      priority: form.priority,
      dueDate: Number.isNaN(dueDate.getTime()) ? new Date().toISOString() : dueDate.toISOString(),
      assigneeId: form.assigneeId,
      assigneeName: assignee?.name || 'Unassigned',
      communityId: form.communityId,
      creatorId: defaultAssigneeId,
      watcherIds: [],
      labels: [...new Set(form.labels.split(',').map((label) => label.trim().toLowerCase()).filter(Boolean))],
      createdAt: new Date().toISOString(),
      completedAt: form.status === 'done' ? new Date().toISOString() : null,
    }
    onCreate(record)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New task"
      description="Assignment, priority and a date are what make it show up in someone's queue."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" icon={Plus} onClick={submit}>
            Create task
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Title" required error={errors.title}>
          <Input
            value={form.title}
            onChange={set('title')}
            invalid={Boolean(errors.title)}
            placeholder="Publish the Q4 moderation changelog"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Community" required error={errors.communityId}>
            <Select value={form.communityId} onChange={set('communityId')} invalid={Boolean(errors.communityId)}>
              {state.communities.map((community) => (
                <option key={community.id} value={community.id}>
                  {community.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Assignee">
            <Select value={form.assigneeId} onChange={set('assigneeId')}>
              {[...state.members]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} — {member.title}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={set('status')}>
              {TASK_STATUSES.map((status) => (
                <option key={status.key} value={status.key}>
                  {status.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={form.priority} onChange={set('priority')}>
              {TASK_PRIORITIES.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Due date" required error={errors.due}>
            <Input type="date" value={form.due} onChange={set('due')} invalid={Boolean(errors.due)} />
          </Field>
          <Field label="Labels" hint="Comma separated, e.g. moderation, events">
            <Input value={form.labels} onChange={set('labels')} placeholder="moderation, events" />
          </Field>
        </div>

        <Field label="Description" hint="Optional, but the reason nobody asks twice.">
          <Textarea
            rows={3}
            value={form.description}
            onChange={set('description')}
            placeholder="What is expected, who reviews it, and where the result is published."
          />
        </Field>
      </div>
    </Dialog>
  )
}
