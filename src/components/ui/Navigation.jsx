import { cn } from '../../lib/utils.js'

/** Underline tabs — record detail sections (About / Members / Files). */
export function Tabs({ items, value, onChange, className = '' }) {
  return (
    <div
      role="tablist"
      aria-label="Sections"
      className={cn('-mx-1 flex gap-1 overflow-x-auto border-b border-line px-1', className)}
    >
      {items.map((item) => {
        const active = item.key === value
        return (
          <button
            key={item.key}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(item.key)}
            className={cn(
              'relative shrink-0 px-3 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors',
              active ? 'text-brand-content' : 'text-content-2 hover:text-content',
            )}
          >
            <span className="flex items-center gap-1.5">
              {item.label}
              {item.count !== undefined && (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] tnum',
                    active ? 'bg-brand-soft text-brand-content' : 'bg-surface-2 text-content-3',
                  )}
                >
                  {item.count}
                </span>
              )}
            </span>
            {active && (
              <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-brand-fill" />
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Pill segmented control — view switches (board/list, month/week/agenda). */
export function Segmented({ options, value, onChange, className = '', size = 'md' }) {
  return (
    <div
      role="group"
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-control border border-line bg-surface-2 p-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.key === value
        const Icon = option.icon
        return (
          <button
            key={option.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.key)}
            title={option.label}
            className={cn(
              'flex items-center gap-1.5 rounded-[5px] font-medium whitespace-nowrap transition-colors',
              size === 'sm' ? 'h-6 px-2 text-[11px]' : 'h-7 px-2.5 text-xs',
              active
                ? 'bg-surface text-content shadow-card'
                : 'text-content-2 hover:text-content',
            )}
          >
            {Icon && <Icon size={size === 'sm' ? 12 : 13} strokeWidth={1.9} />}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/** Compact labelled select used in filter toolbars.
 *  `options` accepts plain strings, `{ value, label }` or the `{ key, label }`
 *  shape the seed enums ship, so a filter never needs a local mapping pass. */
export function FilterSelect({ label, value, onChange, options, className = '' }) {
  return (
    <label className={cn('flex items-center gap-1.5 text-[11px] text-content-3', className)}>
      <span className="whitespace-nowrap">{label}</span>
      <span className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-7 cursor-pointer appearance-none rounded-control border border-line bg-surface pr-6 pl-2 text-[11px] font-medium text-content transition-colors hover:border-line-2 focus:border-brand-2"
        >
          {options.map((option) => {
            const key = typeof option === 'string' ? option : (option.value ?? option.key)
            const text = typeof option === 'string' ? option : (option.label ?? option.key)
            return (
              <option key={key} value={key}>
                {text}
              </option>
            )
          })}
        </select>
        <svg
          viewBox="0 0 16 16"
          width="10"
          height="10"
          aria-hidden="true"
          className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-content-3"
        >
          <path d="M4 6.5L8 10.5l4-4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </svg>
      </span>
    </label>
  )
}

/** Multi-toggle chip row, used for labels and categories. */
export function ChipFilter({ options, selected, onToggle, className = '' }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {options.map((option) => {
        const key = option.value ?? option
        const active = selected.includes(key)
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(key)}
            className={cn(
              'h-7 rounded-full border px-2.5 text-[11px] font-medium whitespace-nowrap transition-colors',
              active
                ? 'border-brand-fill bg-brand-fill text-white'
                : 'border-line bg-surface text-content-2 hover:border-line-2 hover:bg-surface-2',
            )}
          >
            {option.label ?? option}
          </button>
        )
      })}
    </div>
  )
}

/** Row of controls above a list: search, filters, view switch, actions. */
export function Toolbar({ children, className = '' }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-panel border border-line bg-surface p-2.5 shadow-card sm:gap-3 sm:p-3',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function Breadcrumbs({ items = [], className = '' }) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1.5 text-[11px]', className)}>
      {items.map((item, index) => (
        <span key={item.label} className="flex items-center gap-1.5">
          {index > 0 && <span aria-hidden="true" className="text-content-3">/</span>}
          {item.href ? (
            <a
              href={item.href}
              className="text-content-2 transition-colors hover:text-brand-content hover:underline"
            >
              {item.label}
            </a>
          ) : (
            <span aria-current="page" className="font-medium text-content">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}
