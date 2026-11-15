import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Search, X } from 'lucide-react'
import type { ContentStatus, ReviewStatus, UserRole } from '../../lib/api'
import { cx, formatDate, formatDateTime } from '../../lib/adminFormat'

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
      <div>
        <h1 className="font-display text-3xl text-ink">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm text-ink-soft">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function AdminCard({
  children,
  className,
  title,
  description,
  actions,
}: {
  children: ReactNode
  className?: string
  title?: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <section className={cx('rounded-2xl border border-line bg-[#fffdf8]', className)}>
      {title || actions ? (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-lg text-ink">{title}</h2>
            {description ? <p className="mt-0.5 text-xs text-ink-mute">{description}</p> : null}
          </div>
          {actions}
        </header>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  )
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'

export function AdminButton({
  children,
  onClick,
  type = 'button',
  variant = 'secondary',
  size = 'md',
  loading = false,
  disabled = false,
  className,
  title,
}: {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  variant?: ButtonVariant
  size?: 'sm' | 'md'
  loading?: boolean
  disabled?: boolean
  className?: string
  title?: string
}) {
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-pine text-paper hover:bg-pine-2 border-pine',
    secondary: 'border-line bg-[#fffdf8] text-ink hover:bg-paper-2',
    ghost: 'border-transparent bg-transparent text-ink-soft hover:bg-paper-2',
    danger: 'border-clay/30 bg-[#f7e2dc] text-clay hover:bg-[#f1d3ca]',
    subtle: 'border-transparent bg-paper-2 text-ink-soft hover:bg-paper-3',
  }
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled || loading}
      className={cx(
        'motion-press inline-flex items-center justify-center gap-1.5 rounded-full border font-medium disabled:cursor-not-allowed disabled:opacity-55',
        size === 'sm' ? 'px-2.5 py-1.5 text-[11px]' : 'px-3.5 py-2 text-xs',
        variants[variant],
        className,
      )}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : null}
      {children}
    </button>
  )
}

export function StatusBadge({ status }: { status: ContentStatus | ReviewStatus | string }) {
  const styles: Record<string, string> = {
    PUBLISHED: 'bg-[#e4efe4] text-[#2c5a35] border-[#c4ddc6]',
    APPROVED: 'bg-[#e4efe4] text-[#2c5a35] border-[#c4ddc6]',
    DRAFT: 'bg-[#f7eccf] text-[#7a5a12] border-[#ead8a8]',
    PENDING: 'bg-[#f7eccf] text-[#7a5a12] border-[#ead8a8]',
    ARCHIVED: 'bg-paper-2 text-ink-mute border-line',
    HIDDEN: 'bg-[#f3ded7] text-clay border-[#e6c5bb]',
    VERIFIED: 'bg-[#e4efe4] text-[#2c5a35] border-[#c4ddc6]',
    ESTIMATE: 'bg-[#f7eccf] text-[#7a5a12] border-[#ead8a8]',
    GENERAL_GUIDANCE: 'bg-paper-2 text-ink-soft border-line',
    USER: 'bg-paper-2 text-ink-soft border-line',
    ADMIN: 'bg-[#e6ecf3] text-[#31506b] border-[#c9d7e4]',
    SUPER_ADMIN: 'bg-[#efe4f1] text-[#5d3a63] border-[#ddc8e1]',
    ACTIVE: 'bg-[#e4efe4] text-[#2c5a35] border-[#c4ddc6]',
    DISABLED: 'bg-[#f3ded7] text-clay border-[#e6c5bb]',
    ACTIVITY: 'bg-[#e6ecf3] text-[#31506b] border-[#c9d7e4]',
    ATTRACTION: 'bg-[#efe8dd] text-[#6b5433] border-[#dfd2bd]',
    HOTEL: 'bg-[#e6ecf3] text-[#31506b] border-[#c9d7e4]',
    RESTAURANT: 'bg-[#f7e9df] text-[#8a4b25] border-[#e8cfbd]',
  }
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]',
        styles[status] ?? 'bg-paper-2 text-ink-soft border-line',
      )}
    >
      {status.replaceAll('_', ' ')}
    </span>
  )
}

export function RoleBadge({ role }: { role: UserRole }) {
  return <StatusBadge status={role} />
}

export function Field({
  label,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string
  error?: string
  hint?: string
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-mute">
        {label}
        {required ? <span className="ml-1 text-saffron">*</span> : null}
      </span>
      {children}
      {error ? <span className="mt-1 block text-[11px] text-clay">{error}</span> : null}
      {!error && hint ? <span className="mt-1 block text-[11px] text-ink-mute">{hint}</span> : null}
    </label>
  )
}

const fieldClass =
  'w-full rounded-xl border border-line bg-[#fffdf8] px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-mute/70 focus:border-pine-3 focus:ring-2 focus:ring-pine-3/15 disabled:bg-paper-2'

export function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  min,
  max,
  step,
  required,
  disabled,
  className,
}: {
  value: string | number
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  min?: number
  max?: number
  step?: number | string
  required?: boolean
  disabled?: boolean
  className?: string
}) {
  return (
    <input
      type={type}
      value={value}
      min={min}
      max={max}
      step={step}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      className={cx(fieldClass, className)}
    />
  )
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 4,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  className?: string
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={cx(fieldClass, 'resize-y leading-relaxed', className)}
    />
  )
}

export function Select({
  value,
  onChange,
  children,
  className,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  children: ReactNode
  className?: string
  disabled?: boolean
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className={cx(fieldClass, className)}
    >
      {children}
    </select>
  )
}

export function SearchBox({
  value,
  onChange,
  placeholder = 'Search…',
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <label className={cx('relative flex items-center', className)}>
      <Search size={14} className="pointer-events-none absolute left-3 text-ink-mute" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cx(fieldClass, 'pl-9')}
      />
    </label>
  )
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
}: {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPage: (page: number) => void
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(total, page * pageSize)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-1 pt-3 text-xs text-ink-soft">
      <p>
        Showing <span className="font-medium text-ink">{start}–{end}</span> of{' '}
        <span className="font-medium text-ink">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <AdminButton size="sm" variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </AdminButton>
        <span className="tabular-nums">
          Page {page} / {totalPages}
        </span>
        <AdminButton
          size="sm"
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </AdminButton>
      </div>
    </div>
  )
}

export function LoadingBlock({ rows = 5, label = 'Loading…' }: { rows?: number; label?: string }) {
  return (
    <div aria-busy="true" aria-label={label} className="space-y-2 py-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-11 animate-pulse rounded-lg bg-paper-2"
          style={{ opacity: 1 - index * 0.12 }}
        />
      ))}
    </div>
  )
}

export function EmptyBlock({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-dashed border-paper-3 bg-paper/50 px-6 py-12 text-center">
      <h3 className="font-display text-xl text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function InlineAlert({
  tone = 'error',
  children,
}: {
  tone?: 'error' | 'success' | 'info' | 'warning'
  children: ReactNode
}) {
  const tones = {
    error: 'border-[#e6c5bb] bg-[#fbeeea] text-[#7d3a2c]',
    success: 'border-[#c4ddc6] bg-[#eef5ec] text-[#2c5a35]',
    info: 'border-[#c9d7e4] bg-[#eef3f8] text-[#31506b]',
    warning: 'border-[#ead8a8] bg-[#fbf3e0] text-[#7a5a12]',
  }
  return (
    <div className={cx('motion-feedback flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-xs', tones[tone])}>
      {tone === 'success' ? (
        <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
      ) : (
        <AlertTriangle size={15} className="mt-0.5 shrink-0" />
      )}
      <div className="leading-relaxed">{children}</div>
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  const [rendered, setRendered] = useState(open)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (open) {
      setRendered(true)
      setClosing(false)
      return undefined
    }
    if (!rendered) return undefined

    setClosing(true)
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200
    const timer = window.setTimeout(() => {
      setRendered(false)
      setClosing(false)
    }, duration)
    return () => window.clearTimeout(timer)
  }, [open, rendered])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!rendered) return null
  return (
    <div
      aria-hidden={closing}
      inert={closing}
      className={cx(
        'motion-overlay fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-ink/45 p-4 py-10 backdrop-blur-sm',
        closing && 'pointer-events-none motion-overlay-exit',
      )}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'motion-dialog w-full rounded-2xl border border-line bg-paper shadow-lift',
          closing && 'motion-dialog-exit',
          wide ? 'max-w-4xl' : 'max-w-lg',
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-xl text-ink">{title}</h2>
            {description ? <p className="mt-1 text-xs text-ink-soft">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-full p-1.5 text-ink-mute hover:bg-paper-2 hover:text-ink"
          >
            <X size={16} />
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3.5">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  )
}

export function UpdatedCell({ date }: { date: string }) {
  return (
    <span title={formatDateTime(date)} className="whitespace-nowrap text-xs text-ink-soft">
      {formatDate(date)}
    </span>
  )
}
