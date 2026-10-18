import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { cn, formatNumber, initials } from '../../lib/utils.js'

const TONES = {
  neutral: 'bg-neutral-soft text-content-2',
  brand: 'bg-brand-soft text-brand-content',
  accent: 'bg-accent-soft text-accent-content',
  success: 'bg-success-soft text-success-content',
  warning: 'bg-warning-soft text-warning-content',
  danger: 'bg-danger-soft text-danger-content',
  info: 'bg-info-soft text-info-content',
}

export function Badge({ tone = 'neutral', children, className = '', icon: Icon }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {Icon && <Icon size={10} strokeWidth={2.2} />}
      {children}
    </span>
  )
}

/** Outlined variant for dense tables where filled pills compete for attention. */
export function OutlineBadge({ tone = 'neutral', children, className = '' }) {
  const ring = {
    neutral: 'border-line-2 text-content-2',
    brand: 'border-brand/40 text-brand-content',
    accent: 'border-accent/40 text-accent-content',
    success: 'border-success/40 text-success-content',
    warning: 'border-warning/40 text-warning-content',
    danger: 'border-danger/40 text-danger-content',
    info: 'border-info/40 text-info-content',
  }
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
        ring[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

const AVATAR_SIZES = {
  6: 'size-6 text-[10px]',
  8: 'size-8 text-[11px]',
  9: 'size-9 text-xs',
  10: 'size-10 text-[13px]',
  12: 'size-12 text-sm',
  16: 'size-16 text-lg',
}

/**
 * Initials avatar. The hue is mixed against the theme surface and content
 * tokens, so a person keeps the same identity colour in light and dark.
 */
export function Avatar({ name, hue = 212, size = 9, status, src, className = '' }) {
  const isImage = Boolean(src)
  return (
    <span className={cn('relative shrink-0', className)}>
      <span
        className={cn(
          'flex items-center justify-center overflow-hidden rounded-full font-semibold',
          AVATAR_SIZES[size] || AVATAR_SIZES[9],
        )}
        style={
          isImage
            ? undefined
            : {
                backgroundColor: `color-mix(in oklab, hsl(${hue} 62% 52%) 20%, var(--surface-2))`,
                color: `color-mix(in oklab, hsl(${hue} 62% 45%) 62%, var(--content))`,
              }
        }
        aria-hidden="true"
      >
        {isImage ? (
          <img src={src} alt="" className="size-full object-cover" loading="lazy" />
        ) : (
          initials(name || '?')
        )}
      </span>
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-2 ring-surface',
            size >= 10 ? 'size-2.5' : 'size-2',
            status === 'online' && 'bg-success',
            status === 'away' && 'bg-warning',
            status === 'offline' && 'bg-content-3',
            status === 'suspended' && 'bg-danger',
          )}
          title={status}
        />
      )}
    </span>
  )
}

/** Overlapping group with a "+N" remainder. */
export function AvatarStack({ people = [], max = 4, size = 8, className = '' }) {
  const shown = people.slice(0, max)
  const rest = people.length - shown.length
  return (
    <span className={cn('flex items-center -space-x-2', className)}>
      {shown.map((person) => (
        <span key={person.id} className="ring-1 ring-surface rounded-full">
          <Avatar name={person.name} hue={person.hue} size={size} src={person.avatar} />
        </span>
      ))}
      {rest > 0 && (
        <span
          className={cn(
            'flex items-center justify-center rounded-full bg-surface-3 font-semibold text-content-2 ring-1 ring-surface',
            AVATAR_SIZES[size] || AVATAR_SIZES[8],
          )}
          title={`${rest} more`}
        >
          +{rest}
        </span>
      )}
    </span>
  )
}

export function Progress({ value, max = 100, tone = 'brand', className = '', label }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100))
  const bar = {
    brand: 'bg-brand-fill',
    accent: 'bg-accent-fill',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
  }
  return (
    <div
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-3', className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-300', bar[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

const DELTA_TONE = { up: 'text-success', down: 'text-danger', flat: 'text-content-3' }

export function Delta({ value, suffix = '%', invert = false }) {
  const numeric = Number(value) || 0
  const positive = invert ? numeric < 0 : numeric > 0
  const flat = numeric === 0
  const Icon = flat ? null : numeric > 0 ? ArrowUp : ArrowDown
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[11px] font-semibold tnum',
        flat ? DELTA_TONE.flat : positive ? DELTA_TONE.up : DELTA_TONE.down,
      )}
    >
      {Icon && <Icon size={11} strokeWidth={2.4} />}
      {flat ? 'no change' : `${Math.abs(numeric).toFixed(1)}${suffix}`}
    </span>
  )
}

/** Headline number + label + trend. Used on the dashboard and analytics. */
export function Metric({ label, value, delta, deltaSuffix, hint, invertDelta, icon: Icon, tone = 'brand' }) {
  const tint = {
    brand: 'bg-brand-soft text-brand-content',
    accent: 'bg-accent-soft text-accent-content',
    success: 'bg-success-soft text-success-content',
    warning: 'bg-warning-soft text-warning-content',
    info: 'bg-info-soft text-info-content',
  }
  return (
    <div className="min-w-0 rounded-panel border border-line bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold tracking-wide text-content-2 uppercase">
          {label}
        </p>
        {Icon && (
          <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-control', tint[tone])}>
            <Icon size={14} strokeWidth={1.9} />
          </span>
        )}
      </div>
      <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-content tnum">
        {typeof value === 'number' ? formatNumber(value) : value}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        {delta !== undefined && delta !== null && (
          <Delta value={delta} suffix={deltaSuffix} invert={invertDelta} />
        )}
        {hint && <span className="min-w-0 text-[11px] text-content-3">{hint}</span>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ search -- */

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search',
  label = 'Search',
  resultCount,
  className = '',
  inputClassName = '',
  ...rest
}) {
  return (
    <div className={cn('relative min-w-0 flex-1', className)}>
      <Search
        size={14}
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-3"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className={cn(
          'h-9 w-full rounded-control border border-line bg-surface pr-16 pl-8 text-[13px] text-content placeholder:text-content-3 transition-colors hover:border-line-2 focus:border-brand-2 [&::-webkit-search-cancel-button]:hidden',
          inputClassName,
        )}
        {...rest}
      />
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
        {resultCount !== undefined && (
          <span className="text-[11px] whitespace-nowrap text-content-3 tnum">
            {resultCount}
          </span>
        )}
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label={`Clear ${label.toLowerCase()}`}
            className="flex size-5 items-center justify-center rounded-full text-content-3 transition-colors hover:bg-surface-3 hover:text-content"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- pagination -- */

export function Pagination({ page, pageCount, total, pageSize, onChange, className = '' }) {
  if (pageCount <= 1) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4',
        className,
      )}
    >
      <p className="text-[11px] text-content-3 tnum">
        Showing {from}–{to} of {formatNumber(total)}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="flex size-7 items-center justify-center rounded-control border border-line text-content-2 transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="min-w-16 text-center text-[11px] font-medium text-content-2 tnum">
          {page} / {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
          className="flex size-7 items-center justify-center rounded-control border border-line text-content-2 transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

/** Page a list and clamp the page when the list shrinks under you. */
export function paginate(rows, page, pageSize) {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(page, pageCount)
  return {
    pageCount,
    page: current,
    slice: rows.slice((current - 1) * pageSize, current * pageSize),
  }

}

/* ------------------------------------------------------------------- table -- */

export function TableShell({ children, className = '' }) {
  return (
    <div className={cn('-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0', className)}>
      <table className="w-full min-w-160 border-collapse text-left">{children}</table>
    </div>
  )
}

export function Th({ children, align = 'left', className = '', ...rest }) {
  return (
    <th
      scope="col"
      className={cn(
        'border-b border-line bg-surface-2 px-3 py-2 text-[11px] font-semibold tracking-wide text-content-2 uppercase whitespace-nowrap first:rounded-t-control last:rounded-t-control',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
      {...rest}
    >
      {children}
    </th>
  )
}

export function Td({ children, align = 'left', className = '', ...rest }) {
  return (
    <td
      className={cn(
        'border-b border-line px-3 py-2.5 text-[13px] text-content align-middle',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
      {...rest}
    >
      {children}
    </td>
  )
}

export function Tr({ children, onClick, selected = false, className = '', ...rest }) {
  const interactive = Boolean(onClick)
  return (
    <tr
      onClick={onClick}
      className={cn(
        'transition-colors',
        interactive && 'cursor-pointer hover:bg-surface-2',
        selected && 'bg-brand-soft hover:bg-brand-soft',
        className,
      )}
      {...rest}
    >
      {children}
    </tr>
  )
}
