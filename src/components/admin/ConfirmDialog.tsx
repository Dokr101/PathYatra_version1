import { useState, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { AdminButton, Modal } from './AdminUI'

interface Props {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'primary'
  onCancel: () => void
  onConfirm: () => Promise<void> | void
}

/**
 * Reusable confirmation for every destructive action. It owns the busy state so
 * a double-click cannot submit twice, and stays open if the action fails.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onCancel,
  onConfirm,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const close = () => {
    if (busy) return
    setError(null)
    onCancel()
  }

  const confirm = async () => {
    setBusy(true)
    setError(null)
    try {
      await onConfirm()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The action could not be completed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      footer={
        <>
          <AdminButton variant="secondary" onClick={close} disabled={busy}>
            {cancelLabel}
          </AdminButton>
          <AdminButton
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={() => void confirm()}
            loading={busy}
          >
            {confirmLabel}
          </AdminButton>
        </>
      }
    >
      <div className="flex gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f7e2dc] text-clay">
          <AlertTriangle size={17} />
        </div>
        <div className="text-sm leading-relaxed text-ink-soft">{description}</div>
      </div>
      {error ? <p className="mt-4 rounded-lg bg-[#fbeeea] px-3 py-2 text-xs text-clay">{error}</p> : null}
    </Modal>
  )
}
