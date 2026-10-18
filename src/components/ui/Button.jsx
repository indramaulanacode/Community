import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils.js'

const VARIANTS = {
  primary:
    'bg-brand-fill text-white hover:bg-brand-fill-2 active:translate-y-px disabled:opacity-60',
  accent: 'bg-accent-fill text-white hover:bg-accent-fill-2 active:translate-y-px disabled:opacity-60',
  secondary:
    'bg-surface-2 text-content hover:bg-surface-3 border border-line active:translate-y-px',
  outline:
    'bg-transparent text-content border border-line-2 hover:bg-surface-2 active:translate-y-px',
  ghost: 'bg-transparent text-content-2 hover:bg-surface-2 hover:text-content',
  danger: 'bg-danger-fill text-white hover:bg-danger-fill-2 active:translate-y-px disabled:opacity-60',
  'danger-ghost':
    'bg-transparent text-danger border border-line hover:bg-danger-soft active:translate-y-px',
}

const SIZES = {
  xs: 'h-7 px-2.5 text-[11px] gap-1.5',
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-[13px] gap-2',
  lg: 'h-10 px-5 text-sm gap-2',
}

/**
 * Every clickable in the product. `variant` picks the visual weight, `size`
 * the height; both are deliberately closed sets so buttons cannot drift.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  className = '',
  children,
  disabled,
  ...rest
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-control font-medium whitespace-nowrap transition-[background-color,color,border-color,transform] duration-150 disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 size={size === 'lg' ? 15 : 13} className="animate-spin" />
      ) : (
        Icon && <Icon size={size === 'xs' ? 12 : 14} strokeWidth={1.9} />
      )}
      {children}
      {IconRight && !loading && <IconRight size={14} strokeWidth={1.9} />}
    </button>
  )
}

const ICON_VARIANTS = {
  ...VARIANTS,
  plain: 'bg-transparent text-content-2 hover:bg-surface-2 hover:text-content',
}

const ICON_SIZES = {
  sm: 'size-7 rounded-control',
  md: 'size-8 rounded-control',
  lg: 'size-9 rounded-[10px]',
}

export function IconButton({
  icon: Icon,
  label,
  variant = 'plain',
  size = 'md',
  active = false,
  className = '',
  children,
  ...rest
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        ICON_VARIANTS[variant],
        ICON_SIZES[size],
        active && 'bg-surface-3 text-content',
        className,
      )}
      {...rest}
    >
      <Icon size={size === 'sm' ? 13 : 15} strokeWidth={1.9} />
      {children}
    </button>
  )
}
