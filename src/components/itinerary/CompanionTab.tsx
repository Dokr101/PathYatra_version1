import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, Phone, Plus, Receipt, Trash2, Users, Wallet } from 'lucide-react'
import type { Destination, TripPlan } from '../../types'
import { useApp } from '../../context/AppContext'
import { ADVISORIES, GUIDES } from '../../data/content'
import { cx, daysBetween, formatDateRange, npr, todayISO } from '../../lib/format'
import { Pill } from '../ui'

const EMERGENCY = [
  { label: 'Nepal Police', number: '100' },
  { label: 'Ambulance', number: '102' },
  { label: 'Tourist Police', number: '1144' },
  { label: 'Nepal Tourism Board', number: '01-4256909' },
]

export function CompanionTab({ plan, destination }: { plan: TripPlan; destination: Destination }) {
  const { checklist, toggleChecklist, expenses, addExpense, removeExpense, notify } = useApp()
  const completed = checklist[plan.id] ?? []
  const progress = plan.packing.length ? Math.round((completed.length / plan.packing.length) * 100) : 0
  const tripExpenses = expenses[plan.id] ?? []

  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(0)
  const [sharedBy, setSharedBy] = useState(plan.travelers)

  const departure = daysBetween(todayISO(), plan.startDate)
  const balances = Array.from({ length: plan.travelers }, () => 0)
  tripExpenses.forEach((expense) => {
    const share = expense.amount / Math.max(1, Math.min(expense.sharedBy, plan.travelers))
    balances[expense.paidBy] = (balances[expense.paidBy] ?? 0) + expense.amount
    for (let index = 0; index < Math.min(expense.sharedBy, plan.travelers); index += 1) {
      balances[index] -= share
    }
  })
  const totalSpent = tripExpenses.reduce((sum, expense) => sum + expense.amount, 0)

  const submitExpense = (event: React.FormEvent) => {
    event.preventDefault()
    const value = Number(amount)
    if (!title.trim() || !Number.isFinite(value) || value <= 0) {
      notify('Add a description and an amount above zero.')
      return
    }
    addExpense(plan.id, { title: title.trim(), amount: value, paidBy, sharedBy })
    setTitle('')
    setAmount('')
  }

  return (
    <div className="space-y-4">
      {/* Countdown */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-white/60 p-4">
          <p className="text-[10px] uppercase tracking-[0.14em] text-ink-mute">
            {departure > 0 ? 'Departs in' : departure === 0 ? 'Departs' : 'Trip started'}
          </p>
          <p className="mt-1 font-display text-2xl leading-none text-ink">
            {departure > 0 ? `${departure} days` : departure === 0 ? 'today' : `${Math.abs(departure)} days ago`}
          </p>
          <p className="mt-1 text-[10px] text-ink-mute">{formatDateRange(plan.startDate, plan.days)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-white/60 p-4">
          <p className="text-[10px] uppercase tracking-[0.14em] text-ink-mute">Checklist</p>
          <p className="mt-1 font-display text-2xl leading-none text-ink">{progress}%</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-2">
            <div className="h-full rounded-full bg-pine-3 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-white/60 p-4">
          <p className="text-[10px] uppercase tracking-[0.14em] text-ink-mute">Tracked spending</p>
          <p className="mt-1 font-display text-2xl leading-none text-ink">{npr(totalSpent)}</p>
          <p className="mt-1 text-[10px] text-ink-mute">{tripExpenses.length} logged expenses</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Packing checklist */}
        <section className="rounded-2xl border border-line bg-white/55 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg text-ink">Packing checklist</h3>
            <Pill tone="outline">
              {completed.length}/{plan.packing.length}
            </Pill>
          </div>
          <p className="mt-1 text-[11px] text-ink-soft">
            Generated for {destination.district}, {destination.altitude ?? 500} m and {plan.days} days on the road.
          </p>
          <div className="mt-3 space-y-1.5">
            {plan.packing.map((item) => {
              const done = completed.includes(item)
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleChecklist(plan.id, item)}
                  className={cx(
                    'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] transition',
                    done ? 'text-ink-mute line-through' : 'text-ink-soft hover:bg-paper',
                  )}
                >
                  <span
                    className={cx(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                      done ? 'border-pine bg-pine text-paper' : 'border-line bg-paper',
                    )}
                  >
                    {done ? <CheckCircle2 size={10} /> : null}
                  </span>
                  {item}
                </button>
              )
            })}
          </div>
        </section>

        {/* Expense splitter */}
        <section className="rounded-2xl border border-line bg-white/55 p-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 font-display text-lg text-ink">
              <Receipt size={15} className="text-clay" /> Group expenses
            </h3>
            <Pill tone="outline">
              <Users size={10} /> {plan.travelers}
            </Pill>
          </div>
          <form onSubmit={submitExpense} className="mt-3 space-y-2">
            <input
              className="field py-2 text-xs"
              placeholder="What was it? (jeep fare, dinner…)"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className="field py-2 text-xs"
                placeholder="Amount Rs."
                type="number"
                min={1}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
              <select
                className="field py-2 text-xs"
                value={paidBy}
                onChange={(event) => setPaidBy(Number(event.target.value))}
                aria-label="Paid by"
              >
                {Array.from({ length: plan.travelers }, (_, index) => (
                  <option key={index} value={index}>
                    Paid by traveller {index + 1}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="field flex-1 py-2 text-xs"
                value={sharedBy}
                onChange={(event) => setSharedBy(Number(event.target.value))}
                aria-label="Split between"
              >
                {Array.from({ length: plan.travelers }, (_, index) => (
                  <option key={index} value={index + 1}>
                    Split between {index + 1}
                  </option>
                ))}
              </select>
              <button type="submit" className="inline-flex items-center gap-1 rounded-full bg-pine px-3 py-2 text-[11px] font-medium text-paper">
                <Plus size={12} /> Add
              </button>
            </div>
          </form>

          {tripExpenses.length > 0 ? (
            <div className="mt-3 space-y-1.5">
              {tripExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between gap-2 rounded-lg border border-line/70 px-2.5 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium text-ink">{expense.title}</p>
                    <p className="text-[9px] text-ink-mute">
                      Traveller {expense.paidBy + 1} paid · split {expense.sharedBy}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-[11px] text-ink-soft">{npr(expense.amount)}</span>
                    <button
                      type="button"
                      onClick={() => removeExpense(plan.id, expense.id)}
                      className="text-ink-mute hover:text-clay"
                      aria-label={`Remove ${expense.title}`}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-[10px] leading-relaxed text-ink-mute">
              No expenses yet. Log what you actually spend and PathYatra will work out who owes whom.
            </p>
          )}

          {tripExpenses.length > 0 ? (
            <div className="mt-3 rounded-xl bg-paper-2/60 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-mute">Balances</p>
              <div className="mt-1.5 space-y-1">
                {balances.map((balance, index) => (
                  <div key={index} className="flex items-center justify-between text-[10px]">
                    <span className="text-ink-mute">Traveller {index + 1}</span>
                    <span className={balance >= 0 ? 'text-pine' : 'text-clay'}>
                      {balance >= 0 ? `is owed ${npr(balance)}` : `owes ${npr(Math.abs(balance))}`}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-1.5 flex items-center gap-1 text-[9px] text-ink-mute">
                <Wallet size={9} /> Assumes equal splitting among the first selected travellers.
              </p>
            </div>
          ) : null}
        </section>
      </div>

      {/* Alerts */}
      <section className="rounded-2xl border border-line bg-white/55 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 font-display text-lg text-ink">
            <AlertTriangle size={15} className="text-marigold" /> Travel alerts
          </h3>
          <Pill tone="outline">
            <Clock size={10} /> Sample feed · verify locally
          </Pill>
        </div>
        <div className="mt-3 space-y-2">
          {ADVISORIES.slice(0, 3).map((advisory) => (
            <div key={advisory.id} className="rounded-xl border border-line/80 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <p className="text-[11px] font-medium text-ink">{advisory.title}</p>
                <span
                  className={cx(
                    'rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide',
                    advisory.confidence === 'confirmed'
                      ? 'bg-pine/10 text-pine'
                      : advisory.confidence === 'reported'
                        ? 'bg-marigold/20 text-[#7a5410]'
                        : 'bg-paper-2 text-ink-mute',
                  )}
                >
                  {advisory.confidence}
                </span>
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-ink-soft">{advisory.body}</p>
              <p className="mt-1 text-[9px] text-ink-mute">
                {advisory.area} · updated {advisory.updated}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[9px] leading-relaxed text-ink-mute">
          The advisory feed in this build is illustrative. Check the Department of Roads, Nepal Tourism Board and local
          operators before travelling.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Guides */}
        <section className="rounded-2xl border border-line bg-white/55 p-4">
          <h3 className="font-display text-lg text-ink">Local guides</h3>
          <p className="mt-1 text-[11px] text-ink-soft">A sample of the kind of specialist worth hiring for this route.</p>
          <div className="mt-3 space-y-2">
            {GUIDES.slice(0, 3).map((guide) => (
              <div key={guide.id} className="rounded-xl border border-line/80 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium text-ink">{guide.name}</p>
                  <span className="text-[10px] text-ink-soft">{npr(guide.dayRate)} / day</span>
                </div>
                <p className="text-[9px] text-ink-mute">
                  {guide.base} · {guide.languages.join(', ')} · {guide.rating.toFixed(1)}★ ({guide.trips} trips)
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {guide.specialities.slice(0, 2).map((speciality) => (
                    <span key={speciality} className="rounded-full bg-paper-2 px-2 py-0.5 text-[9px] text-ink-soft">
                      {speciality}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[9px] leading-relaxed text-ink-mute">
            Illustrative directory. Verify licensing and insurance with the Nepal Tourism Board before booking.
          </p>
        </section>

        {/* Emergency + notes */}
        <section className="rounded-2xl border border-line bg-white/55 p-4">
          <h3 className="flex items-center gap-1.5 font-display text-lg text-ink">
            <Phone size={15} className="text-clay" /> Emergency & notes
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {EMERGENCY.map((contact) => (
              <div key={contact.label} className="rounded-xl border border-line/80 px-2.5 py-2">
                <p className="text-[9px] uppercase tracking-[0.08em] text-ink-mute">{contact.label}</p>
                <p className="mt-0.5 text-[13px] font-medium text-ink">{contact.number}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1.5">
            {plan.notes.slice(0, 4).map((note) => (
              <p key={note.slice(0, 20)} className="flex items-start gap-1.5 text-[10px] leading-relaxed text-ink-soft">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-marigold" />
                {note}
              </p>
            ))}
          </div>
          <Link to="/help" className="mt-3 inline-flex items-center gap-1 text-[10px] font-medium text-pine">
            Help & support <ArrowRight size={11} />
          </Link>
        </section>
      </div>
    </div>
  )
}
