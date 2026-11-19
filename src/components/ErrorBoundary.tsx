import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, RotateCw } from 'lucide-react'
import * as Sentry from '@sentry/react'

interface Props {
  children: ReactNode
  /** Changing this value clears a captured error, e.g. the current pathname. */
  resetKey?: string
  /** Sentry tag so a crash can be attributed to the app shell or the admin panel. */
  scope?: 'app' | 'page' | 'admin'
}

interface State {
  error: Error | null
}

/**
 * Catches render and lazy-chunk failures so a broken route never blanks the
 * page. React still unmounts the failed subtree, but the user gets a way out:
 * a reload (which refetches chunk hashes from the current index.html) and a
 * link home. No stack trace is shown — the detail goes to Sentry instead.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[error-boundary]', error, info.componentStack)
    }
    Sentry.captureException(error, { tags: { boundary: this.props.scope ?? 'app' } })
  }

  componentDidUpdate(previous: Props) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  private reset = () => this.setState({ error: null })

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="container-page py-16" role="alert">
        <div className="mx-auto max-w-lg rounded-3xl border border-line bg-white/60 p-6 text-center sm:p-8">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-marigold/40 bg-marigold/15 text-[#7a5410]">
            <AlertTriangle size={18} />
          </span>
          <h1 className="mt-4 font-display text-2xl text-ink">Something went wrong</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            This part of PathYatra could not load. A reload usually fixes it — your saved plans and
            wishlist stay on this device.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => window.location.reload()} className="btn-primary">
              <RotateCw size={14} /> Reload
            </button>
            <Link to="/" onClick={this.reset} className="btn-ghost">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    )
  }
}
