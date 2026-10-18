import { cloneElement, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, MoreHorizontal } from 'lucide-react'
import { cn } from '../../lib/utils.js'
import { Button } from './Button.jsx'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-5xl',
}

function useDismiss(open, onClose) {
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const previouslyFocused = document.activeElement
    const node = ref.current

    const timer = setTimeout(() => {
      const target = node?.querySelector('[data-autofocus]') || node?.querySelector(FOCUSABLE)
      target?.focus()
    }, 0)

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !node) return
      const items = [...node.querySelectorAll(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null,
      )
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      clearTimeout(timer)
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus?.()
    }
  }, [open, onClose])

  return ref
}

/** Accessible modal: focus trap, Escape, backdrop click, scroll lock. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className = '',
  bodyClassName = '',
  dismissible = true,
}) {
  const ref = useDismiss(open, onClose)
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-[#0a0b0d]/60 backdrop-blur-[2px]"
        onClick={dismissible ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-panel border border-line bg-surface shadow-modal sm:rounded-panel',
          SIZES[size],
          className,
        )}
      >
        {title && (
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-content">{title}</h2>
              {description && (
                <p className="mt-0.5 text-xs leading-relaxed text-content-2">{description}</p>
              )}
            </div>
            {dismissible && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="-m-1 shrink-0 rounded-control p-1 text-content-3 transition-colors hover:bg-surface-2 hover:text-content"
              >
                <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
                  <path
                    d="M3 3l10 10M13 3L3 13"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className={cn('min-h-0 flex-1 overflow-y-auto px-5 py-4', bodyClassName)}>
          {children}
        </div>
        {footer && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-2 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

/** The single way a destructive action is confirmed anywhere in the product. */
export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
}) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      size="sm"
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} data-autofocus onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-[13px] leading-relaxed text-content-2">{body}</p>
    </Dialog>
  )
}

/** Slide-over panel, used for record detail without leaving the list. */
export function Drawer({ open, onClose, title, children, footer, width = 'max-w-xl' }) {
  const ref = useDismiss(open, onClose)
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-[#0a0b0d]/60" onClick={onClose} aria-hidden="true" />
      <aside
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'absolute inset-y-0 right-0 flex w-full flex-col border-l border-line bg-surface shadow-modal',
          width,
        )}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="min-w-0 truncate text-[15px] font-semibold text-content">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="-m-1 shrink-0 rounded-control p-1 text-content-3 transition-colors hover:bg-surface-2 hover:text-content"
          >
            <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-line bg-surface-2 px-5 py-3">
            {footer}
          </div>
        )}
      </aside>
    </div>,
    document.body,
  )
}

function useOutsideClick(ref, onOutside, active) {
  useEffect(() => {
    if (!active) return undefined
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onOutside()
    }
    const onKey = (event) => {
      if (event.key === 'Escape') onOutside()
    }
    document.addEventListener('pointerdown', handler)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', handler)
      document.removeEventListener('keydown', onKey)
    }
  }, [ref, onOutside, active])
}

/** Dropdown menu with roving focus. `items` is a list or a divider marker.
 *  `label` is always the accessible name; pass `text` to also show it as the
 *  trigger caption, otherwise the trigger stays icon-only. */
export function Menu({
  label = 'Actions',
  icon: Icon = MoreHorizontal,
  leading,
  text = false,
  items,
  align = 'right',
  size = 'sm',
  triggerClassName = '',
}) {
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(-1)
  const ref = useRef(null)
  useOutsideClick(ref, () => setOpen(false), open)

  const selectable = items.filter((item) => item && !item.divider)

  const choose = (item) => {
    setOpen(false)
    setCursor(-1)
    item.onSelect?.()
  }

  const onKeyDown = (event) => {
    if (!open && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      setOpen(true)
      setCursor(0)
      event.preventDefault()
      return
    }
    if (!open) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setCursor((c) => (c + 1) % selectable.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setCursor((c) => (c - 1 + selectable.length) % selectable.length)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (selectable[cursor]) choose(selectable[cursor])
    }
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 rounded-control border border-line bg-surface text-content-2 transition-colors hover:bg-surface-2 hover:text-content',
          size === 'xs' ? 'h-7 px-2 text-[11px]' : 'h-8 px-2.5 text-xs',
          open && 'bg-surface-3 text-content',
          triggerClassName,
        )}
      >
        {leading ?? (Icon && <Icon size={14} strokeWidth={1.9} />)}
        {!leading && text && label}
      </button>

      {open && (
        <div
          role="menu"
          aria-label={label}
          className={cn(
            'absolute z-50 mt-1.5 w-52 overflow-hidden rounded-card border border-line bg-elevated py-1 shadow-pop',
            align === 'right' ? 'right-0' : 'left-0',
          )}
          onKeyDown={onKeyDown}
        >
          {items.map((item, index) =>
            item.divider ? (
              <div key={`div-${index}`} className="my-1 h-px bg-line" role="separator" />
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => choose(item)}
                onMouseEnter={() => setCursor(selectable.indexOf(item))}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                  item.danger ? 'text-danger' : 'text-content',
                  selectable[cursor] === item && !item.disabled && 'bg-surface-2',
                )}
              >
                {item.icon && <item.icon size={13} strokeWidth={1.9} className="shrink-0" />}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.hint && (
                  <span className="shrink-0 text-[10px] text-content-3">{item.hint}</span>
                )}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}

/** Anchored floating content — the notification tray and filter popovers.
 *  `trigger` is a single element; the open handler and aria state are cloned
 *  onto it, so callers can pass IconButton or Button without nesting. */
export function Popover({ trigger, label, children, align = 'right', width = 'w-80' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useOutsideClick(ref, () => setOpen(false), open)
  const close = () => setOpen(false)

  const toggle = cloneElement(trigger, {
    onClick: () => setOpen((v) => !v),
    'aria-haspopup': 'dialog',
    'aria-expanded': open,
    'aria-label': label,
  })

  return (
    <div ref={ref} className="relative shrink-0">
      {toggle}
      {open && (
        <div
          role="dialog"
          aria-label={label}
          className={cn(
            'absolute top-full z-50 mt-2 max-h-[min(30rem,80vh)] overflow-y-auto rounded-card border border-line bg-elevated shadow-pop',
            align === 'right' ? 'right-0' : 'left-0',
            width,
          )}
        >
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </div>
  )
}

/** Collapsible disclosure used for long option groups in settings. */
export function Disclosure({ summary, children, defaultOpen = false, className = '' }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <details
      open={open}
      className={cn('rounded-card border border-line bg-surface', className)}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[13px] font-medium text-content [&::-webkit-details-marker]:hidden">
        {summary}
        <ChevronDown
          size={14}
          className={cn('shrink-0 text-content-3 transition-transform duration-150', open && 'rotate-180')}
        />
      </summary>
      <div className="border-t border-line px-4 py-3">{children}</div>
    </details>
  )
}
