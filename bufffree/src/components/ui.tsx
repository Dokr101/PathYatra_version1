import { useEffect, type ReactNode } from 'react'
import { Star, X } from 'lucide-react'
import { cx } from '../lib/format'

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx('eyebrow', className)}>{children}</p>
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string
  title: ReactNode
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cx('flex flex-wrap items-end justify-between gap-6', className)}>
      <div className="max-w-2xl">
        {eyebrow ? <Eyebrow className="mb-3">{eyebrow}</Eyebrow> : null}
        <h2 className="text-[clamp(1.8rem,3.4vw,2.9rem)] leading-[1.04] text-ink">{title}</h2>
        {description ? <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function Pill({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: 'neutral' | 'pine' | 'saffron' | 'marigold' | 'clay' | 'outline'
  className?: string
}) {
  const tones = {
    neutral: 'bg-paper-2 text-ink-soft border-transparent',
    pine: 'bg-pine text-paper border-transparent',
    saffron: 'bg-saffron-soft text-clay border-transparent',
    marigold: 'bg-[#f7e7c6] text-[#7a5410] border-transparent',
    clay: 'bg-[#f3dcd4] text-clay border-transparent',
    outline: 'bg-transparent text-ink-soft border-line',
  }
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Rating({ value, size = 14, showValue = false }: { value: number; size?: number; showValue?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={star <= Math.round(value) ? 'fill-marigold text-marigold' : 'text-paper-3'}
          strokeWidth={1.5}
        />
      ))}
      {showValue ? <span className="ml-1 text-xs font-medium text-ink-soft">{value.toFixed(1)}</span> : null}
    </span>
  )
}

export function Stat({
  value,
  label,
  hint,
  className,
}: {
  value: ReactNode
  label: string
  hint?: string
  className?: string
}) {
  return (
    <div className={cx('rounded-2xl border border-line bg-white/55 px-4 py-3', className)}>
      <p className="font-display text-2xl leading-none text-ink">{value}</p>
      <p className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-mute">{label}</p>
      {hint ? <p className="mt-1 text-[11px] text-ink-mute">{hint}</p> : null}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-3xl border border-dashed border-paper-3 bg-white/40 px-6 py-14 text-center">
      {icon ? <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-paper-2 text-pine">{icon}</div> : null}
      <h3 className="font-display text-2xl text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">{description}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide = false,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  wide?: boolean
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-line bg-paper shadow-lift sm:rounded-3xl',
          wide ? 'sm:max-w-4xl' : 'sm:max-w-lg',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <h2 className="font-display text-2xl leading-tight text-ink">{title}</h2>
            {description ? <p className="mt-1 text-sm text-ink-soft">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line p-2 text-ink-soft transition hover:bg-paper-2"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer ? <div className="border-t border-line bg-paper-2/50 px-6 py-4">{footer}</div> : null}
      </div>
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-[11px] text-ink-mute">{hint}</span> : null}
    </label>
  )
}

export function ChoiceGrid<T extends string>({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: Array<{ value: T; label: string; hint?: string }>
  value: T
  onChange: (value: T) => void
  columns?: 2 | 3 | 4
}) {
  const cols = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' }[columns]
  return (
    <div className={cx('grid grid-cols-1 gap-2.5', cols)}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={cx(
              'rounded-2xl border px-4 py-3 text-left transition',
              active
                ? 'border-pine bg-pine text-paper shadow-[0_10px_30px_-22px_rgba(30,61,51,0.9)]'
                : 'border-line bg-white/60 text-ink hover:border-pine-3',
            )}
          >
            <span className="block text-sm font-medium">{option.label}</span>
            {option.hint ? (
              <span className={cx('mt-0.5 block text-[11px] leading-snug', active ? 'text-paper/70' : 'text-ink-mute')}>
                {option.hint}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warn' | 'success' }) {
  const tones = {
    info: 'border-mist/40 bg-mist/10 text-ink-soft',
    warn: 'border-marigold/50 bg-marigold/10 text-ink-soft',
    success: 'border-pine-3/40 bg-pine/5 text-ink-soft',
  }
  return <div className={cx('rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed', tones[tone])}>{children}</div>
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-xl bg-paper-2', className)} />
}
