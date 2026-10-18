import { AlertTriangle, RotateCcw } from 'lucide-react'
import { cn } from '../../lib/utils.js'
import { Button } from './Button.jsx'
import { useApp } from '../../store/AppStore.jsx'

const TONE_ICON = {
  neutral: 'text-content-3',
  brand: 'text-brand',
  accent: 'text-accent',
  warning: 'text-warning',
  danger: 'text-danger',
}

export function EmptyState({ icon: Icon, title, body, action, className = '', tone = 'neutral' }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-panel border border-dashed border-line-2 bg-surface px-6 py-10 text-center',
        className,
      )}
    >
      {Icon && (
        <span className="flex size-10 items-center justify-center rounded-full bg-surface-2">
          <Icon size={18} strokeWidth={1.7} className={TONE_ICON[tone]} />
        </span>
      )}
      <p className="text-[13px] font-semibold text-content">{title}</p>
      {body && <p className="max-w-sm text-xs leading-relaxed text-content-2">{body}</p>}
      {action && <div className="mt-2 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', body, onRetry, className = '' }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-panel border border-danger/30 bg-danger-soft px-6 py-10 text-center',
        className,
      )}
      role="alert"
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-surface">
        <AlertTriangle size={18} className="text-danger" />
      </span>
      <p className="text-[13px] font-semibold text-content">{title}</p>
      {body && <p className="max-w-sm text-xs leading-relaxed text-content-2">{body}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" icon={RotateCcw} className="mt-2" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function Skeleton({ className = '' }) {
  return (
    <div
      className={cn('animate-pulse rounded-control bg-surface-3', className)}
      aria-hidden="true"
    />
  )
}

/** Placeholder block that matches the shape of a loaded card. */
export function SkeletonCard({ lines = 3, className = '' }) {
  return (
    <div
      className={cn('rounded-panel border border-line bg-surface p-4', className)}
      role="status"
      aria-label="Loading"
    >
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="mt-3 h-6 w-1/2" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} className={cn('h-2.5', i === lines - 1 ? 'w-2/3' : 'w-full')} />
        ))}
      </div>
    </div>
  )
}

export function SkeletonRows({ rows = 5, className = '' }) {
  return (
    <div role="status" aria-label="Loading list" className={cn('space-y-2', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-control bg-surface p-3">
          <Skeleton className="size-9 rounded-full" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-2.5 w-1/3" />
            <Skeleton className="mt-2 h-2 w-1/2" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      ))}
    </div>
  )
}

/** Screen-reader-only live status for optimistic updates. */
export function StatusMessage({ children, tone = 'neutral', className = '' }) {
  const toneClass = {
    neutral: 'bg-surface-2 text-content-2',
    success: 'bg-success-soft text-success-content',
    warning: 'bg-warning-soft text-warning-content',
    danger: 'bg-danger-soft text-danger-content',
  }
  return (
    <p
      role="status"
      className={cn('rounded-control px-3 py-2 text-[11px] leading-snug', toneClass[tone], className)}
    >
      {children}
    </p>
  )
}

const TOAST_TONE = {
  success: 'bg-success',
  danger: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-info',
}

/** Bottom-right stack; `actions.notify()` feeds it from anywhere in the app. */
export function Toaster() {
  const { state, actions } = useApp()
  const toasts = state.toasts || []
  if (!toasts.length) return null

  return (
    <div
      className="pointer-events-none fixed right-3 bottom-3 z-[70] flex w-[min(22rem,calc(100vw-1.5rem))] flex-col gap-2"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="pointer-events-auto flex items-start gap-3 rounded-card border border-line bg-elevated p-3 shadow-pop"
        >
          <span
            className={cn(
              'mt-1 size-1.5 shrink-0 rounded-full',
              TOAST_TONE[toast.tone] || TOAST_TONE.success,
            )}
          />
          <p className="min-w-0 flex-1 text-[13px] leading-snug text-content">{toast.message}</p>
          <button
            type="button"
            onClick={() => actions.dismissToast(toast.id)}
            aria-label="Dismiss notification"
            className="-m-1 shrink-0 rounded-full p-1 text-content-3 transition-colors hover:bg-surface-2 hover:text-content"
          >
            <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
