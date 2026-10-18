import { cloneElement, useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils.js'

const CONTROL =
  'w-full rounded-control border border-line bg-surface px-3 text-[13px] text-content placeholder:text-content-3 transition-colors hover:border-line-2 focus:border-brand-2 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-content-3'

/**
 * Label + control + hint/error. Wrap a single Input/Textarea/Select; the
 * generated id, `aria-describedby` and `aria-invalid` are cloned onto it.
 */
export function Field({ label, hint, error, required, id, children, className = '' }) {
  const generated = useId()
  const fieldId = id || generated
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={fieldId} className="text-xs font-medium text-content-2">
          {label}
          {required && (
            <span className="ml-0.5 text-accent" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {cloneElement(children, {
        id: fieldId,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
      })}
      {error ? (
        <p id={`${fieldId}-error`} role="alert" className="text-[11px] font-medium text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${fieldId}-hint`} className="text-[11px] leading-snug text-content-3">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

export function Input({ className = '', invalid = false, ...rest }) {
  return (
    <input
      className={cn(
        CONTROL,
        'h-9',
        invalid && 'border-danger focus:border-danger',
        className,
      )}
      {...rest}
    />
  )
}

export function Textarea({ className = '', rows = 4, invalid = false, ...rest }) {
  return (
    <textarea
      rows={rows}
      className={cn(
        CONTROL,
        'min-h-20 resize-y py-2 leading-relaxed',
        invalid && 'border-danger focus:border-danger',
        className,
      )}
      {...rest}
    />
  )
}

/** Native select, restyled. Options come through `children` so callers can use groups. */
export function Select({ className = '', invalid = false, children, ...rest }) {
  return (
    <span className={cn('relative block', className)}>
      <select
        className={cn(
          CONTROL,
          'h-9 cursor-pointer appearance-none pr-8',
          invalid && 'border-danger focus:border-danger',
        )}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-content-3"
      />
    </span>
  )
}

export function Checkbox({ label, description, className = '', id, ...rest }) {
  const generated = useId()
  const inputId = id || generated
  return (
    <label
      htmlFor={inputId}
      className={cn('flex cursor-pointer items-start gap-2.5 text-[13px] text-content', className)}
    >
      <input
        id={inputId}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-line-2 accent-[var(--brand-fill)]"
        {...rest}
      />
      <span className="min-w-0">
        <span className="block leading-snug">{label}</span>
        {description && (
          <span className="block text-[11px] leading-snug text-content-3">{description}</span>
        )}
      </span>
    </label>
  )
}

export function Switch({ checked, onChange, label, description, disabled = false, id }) {
  const generated = useId()
  const inputId = id || generated
  return (
    <div className="flex items-start justify-between gap-4">
      {(label || description) && (
        <label htmlFor={inputId} className="min-w-0 cursor-pointer">
          {label && <span className="block text-[13px] font-medium text-content">{label}</span>}
          {description && (
            <span className="mt-0.5 block text-[11px] leading-snug text-content-3">
              {description}
            </span>
          )}
        </label>
      )}
      <button
        type="button"
        id={inputId}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-150',
          checked
            ? 'border-transparent bg-brand-fill'
            : 'border-line-2 bg-surface-3 hover:bg-surface-3',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-3.5 rounded-full bg-white shadow-sm transition-[left] duration-150',
            checked ? 'left-[1.125rem]' : 'left-0.5',
          )}
        />
      </button>
    </div>
  )
}

/** Inline validation helper used by every form in the product. */
export function validate(values, rules) {
  const errors = {}
  for (const [key, rule] of Object.entries(rules)) {
    const message = rule(values[key], values)
    if (message) errors[key] = message
  }
  return errors
}

export const required = (value, label = 'This field') =>
  !String(value ?? '').trim() ? `${label} is required.` : ''

export const isEmail = (value) =>
  value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim())
    ? 'Enter a valid email address.'
    : ''
