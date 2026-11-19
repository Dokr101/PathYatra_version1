import { Check, WandSparkles, X } from 'lucide-react'
import { PASSWORD_REQUIREMENTS } from '../lib/password'

export function PasswordRequirements({
  password,
  onSuggest,
}: {
  password: string
  onSuggest: () => void
}) {
  const requirements = PASSWORD_REQUIREMENTS.map((requirement) => ({
    label: requirement.label,
    valid: requirement.valid(password),
  }))
  const strength = requirements.filter((requirement) => requirement.valid).length
  const strengthLabel =
    password.length === 0
      ? 'Password checklist'
      : strength === requirements.length
        ? 'Strong password'
        : strength >= 2
          ? 'Almost there'
          : 'Keep going'

  return (
    <div className="mt-3 rounded-xl border border-line bg-paper-2/45 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium text-ink">{strengthLabel}</p>
        <button
          type="button"
          onClick={onSuggest}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-pine hover:underline"
        >
          <WandSparkles size={12} /> Suggest a strong password
        </button>
      </div>
      <div
        className="mt-2 flex gap-1"
        role="progressbar"
        aria-label="Password strength"
        aria-valuemin={0}
        aria-valuemax={requirements.length}
        aria-valuenow={strength}
        aria-valuetext={strengthLabel}
      >
        {requirements.map((requirement) => (
          <span
            key={requirement.label}
            className={`h-1.5 flex-1 rounded-full ${requirement.valid ? 'bg-pine-3' : 'bg-paper-3'}`}
          />
        ))}
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
        {requirements.map((requirement) => (
          <li
            key={requirement.label}
            className={`flex items-center gap-1.5 text-[11px] ${requirement.valid ? 'text-pine' : 'text-ink-mute'}`}
          >
            {requirement.valid ? <Check size={11} /> : <X size={11} />}
            {requirement.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
