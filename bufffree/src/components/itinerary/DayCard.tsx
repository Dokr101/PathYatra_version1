import { useMemo, useState } from 'react'
import { Check, Coffee, MapPin, Pencil, Plus, RefreshCw, Sunrise, Sunset, Trash2, X } from 'lucide-react'
import type { Destination, TripDay, TripPlan } from '../../types'
import { useApp } from '../../context/AppContext'
import { activityCatalog, addStop, regenerateDay, removeBlock, updateBlock } from '../../lib/itinerary'
import { cx, formatDate, npr } from '../../lib/format'
import { Modal, Pill } from '../ui'

const TIME_ICON = {
  Morning: Sunrise,
  Afternoon: Coffee,
  Evening: Sunset,
}

const TYPE_LABEL: Record<TripDay['type'], string> = {
  travel: 'Travel day',
  explore: 'Explore',
  trek: 'On the trail',
  rest: 'Rest & acclimatise',
  return: 'Homeward',
}

export function DayCard({
  plan,
  destination,
  day,
  editMode,
  onRegenerate,
}: {
  plan: TripPlan
  destination: Destination
  day: TripDay
  editMode: boolean
  onRegenerate: () => void
}) {
  const { updateTrip, notify } = useApp()
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<number | null>(null)
  const [draft, setDraft] = useState('')

  const catalog = useMemo(() => activityCatalog(destination, plan.route), [destination, plan.route])
  const filtered = catalog.filter((item) =>
    query.trim() ? item.title.toLowerCase().includes(query.trim().toLowerCase()) : true,
  )

  const handleRemove = (blockIndex: number) => {
    const updated = removeBlock(plan, destination, day.index - 1, blockIndex)
    updateTrip(updated)
    notify('Stop removed and costs recalculated.')
  }

  const handleSaveTitle = (blockIndex: number) => {
    if (!draft.trim()) return
    updateTrip(updateBlock(plan, destination, day.index - 1, blockIndex, draft.trim()))
    setEditing(null)
    setDraft('')
    notify('Activity updated.')
  }

  return (
    <article className="print-avoid-break overflow-hidden rounded-2xl border border-line bg-white/60">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line bg-paper-2/40 px-4 py-3.5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-full border border-pine/25 bg-pine text-paper">
            <span className="text-[8px] uppercase leading-none tracking-[0.1em] text-paper/60">Day</span>
            <span className="font-display text-base leading-tight">{day.index}</span>
          </span>
          <div>
            <h3 className="font-display text-lg leading-tight text-ink">{day.title}</h3>
            <p className="mt-0.5 text-[11px] text-ink-mute">
              {formatDate(day.date, { short: true })} · {day.subtitle}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill tone={day.type === 'travel' || day.type === 'return' ? 'saffron' : day.type === 'rest' ? 'marigold' : 'outline'}>
            {TYPE_LABEL[day.type]}
          </Pill>
          {day.altitude ? <Pill tone="outline">{day.altitude.toLocaleString('en-IN')} m</Pill> : null}
          {editMode && day.type !== 'travel' && day.type !== 'return' ? (
            <button
              type="button"
              onClick={onRegenerate}
              className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[10px] text-ink-soft transition hover:border-pine-3 hover:text-pine"
            >
              <RefreshCw size={10} /> Regenerate day
            </button>
          ) : null}
        </div>
      </header>

      <div className="divide-y divide-line/60">
        {day.blocks.map((block, blockIndex) => {
          const Icon = TIME_ICON[block.time]
          const isEditing = editing === blockIndex
          return (
            <div key={`${block.title}-${blockIndex}`} className="group flex items-start gap-3 px-4 py-3">
              <span className="mt-0.5 flex w-[74px] shrink-0 items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-ink-mute">
                <Icon size={11} className="text-pine-3" /> {block.time}
              </span>
              <div className="min-w-0 flex-1">
                {isEditing ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      className="field py-1.5 text-xs"
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') handleSaveTitle(blockIndex)
                        if (event.key === 'Escape') setEditing(null)
                      }}
                      autoFocus
                      aria-label="Activity title"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveTitle(blockIndex)}
                      className="rounded-full bg-pine p-1.5 text-paper"
                      aria-label="Save activity"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="rounded-full border border-line p-1.5 text-ink-soft"
                      aria-label="Cancel editing"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <p className="text-xs font-medium leading-snug text-ink">{block.title}</p>
                )}
                {block.note ? <p className="mt-0.5 text-[11px] leading-relaxed text-ink-mute">{block.note}</p> : null}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {block.cost > 0 ? (
                  <span className="text-[10px] font-medium text-ink-soft">{npr(block.cost)}</span>
                ) : block.kind !== 'travel' ? (
                  <span className="text-[10px] text-ink-mute">included</span>
                ) : null}
                {editMode ? (
                  <span className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(blockIndex)
                        setDraft(block.title)
                      }}
                      className="rounded-full border border-line p-1 text-ink-mute transition hover:text-pine"
                      aria-label={`Edit ${block.title}`}
                    >
                      <Pencil size={10} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(blockIndex)}
                      className="rounded-full border border-line p-1 text-ink-mute transition hover:border-clay/40 hover:text-clay"
                      aria-label={`Remove ${block.title}`}
                    >
                      <Trash2 size={10} />
                    </button>
                  </span>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-paper-2/25 px-4 py-2.5">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-ink-mute">
          {day.stay ? (
            <span>
              <span className="font-medium text-ink-soft">Stay:</span> {day.stay}
            </span>
          ) : null}
          {day.meals ? (
            <span>
              <span className="font-medium text-ink-soft">Eat:</span> {day.meals}
            </span>
          ) : null}
        </div>
        {editMode ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-full border border-pine/30 px-2.5 py-1 text-[10px] font-medium text-pine transition hover:bg-pine/5"
          >
            <Plus size={10} /> Add a stop
          </button>
        ) : null}
      </footer>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title={`Add a stop to day ${day.index}`}
        description={`Costs update the itinerary budget immediately. Showing options in and around ${destination.district}.`}
      >
        <div className="flex items-center gap-2 rounded-xl border border-line bg-paper px-3">
          <MapPin size={14} className="text-ink-mute" />
          <input
            className="w-full bg-transparent py-2.5 text-xs outline-none placeholder:text-ink-mute"
            placeholder="Search activities, highlights or stops"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="mt-3 max-h-[46vh] space-y-1.5 overflow-y-auto">
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                updateTrip(addStop(plan, destination, day.index - 1, item))
                setAdding(false)
                setQuery('')
                notify(`Added “${item.title}”.`)
              }}
              className="flex w-full items-start justify-between gap-3 rounded-xl border border-line/80 px-3 py-2.5 text-left transition hover:border-pine-3 hover:bg-paper"
            >
              <span className="min-w-0">
                <span className="block text-xs font-medium text-ink">{item.title}</span>
                {item.note ? <span className="mt-0.5 block text-[10px] leading-snug text-ink-mute">{item.note}</span> : null}
              </span>
              <span className="shrink-0 text-[10px] text-ink-soft">{item.cost > 0 ? npr(item.cost) : 'free'}</span>
            </button>
          ))}
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-xs text-ink-mute">Nothing matched. Try a shorter search.</p>
          ) : null}
        </div>
      </Modal>
    </article>
  )
}

export function PlanDayDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className={cx('text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-mute')}>{label}</span>
      <span className="dashed-route flex-1" />
    </div>
  )
}
