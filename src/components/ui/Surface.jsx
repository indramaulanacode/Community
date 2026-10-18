import { cn } from '../../lib/utils.js'

/** The one card shell. Everything else is built out of these parts. */
export function Card({ children, className = '', padded = true, interactive = false }) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-panel border border-line bg-surface shadow-card',
        padded && 'p-4 sm:p-5',
        interactive &&
          'transition-colors duration-150 hover:border-line-2 hover:bg-surface-2',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, description, action, icon: Icon, className = '' }) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-content">
          {Icon && <Icon size={15} strokeWidth={1.9} className="shrink-0 text-content-3" />}
          <span className="min-w-0 truncate">{title}</span>
        </h2>
        {description && (
          <p className="mt-1 text-xs leading-relaxed text-content-2">{description}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  )
}

export function CardBody({ children, className = '' }) {
  return <div className={cn('mt-4 min-w-0', className)}>{children}</div>
}

/** Page title row. Every route uses this so headings never drift. */
export function PageHeader({ title, description, breadcrumb, actions, meta, className = '' }) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="min-w-0">
        {breadcrumb}
        <h1 className="text-xl font-semibold tracking-tight text-content sm:text-2xl">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-content-2">
            {description}
          </p>
        )}
        {meta && <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function SectionTitle({ children, action, className = '' }) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <h2 className="text-[13px] font-semibold tracking-wide text-content uppercase">{children}</h2>
      {action}
    </div>
  )
}

export function Divider({ className = '', label }) {
  if (label) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <span className="h-px flex-1 bg-line" />
        <span className="text-[11px] font-medium tracking-wide text-content-3 uppercase">
          {label}
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>
    )
  }
  return <hr className={cn('border-0 bg-line h-px', className)} />
}

/** Vertical stack used for key/value rows inside cards. */
export function MetaRow({ label, children, className = '' }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 py-2', className)}>
      <dt className="shrink-0 text-xs text-content-3">{label}</dt>
      <dd className="min-w-0 text-right text-xs font-medium text-content">{children}</dd>
    </div>
  )
}
