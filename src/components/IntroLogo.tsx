import { useEffect, useState } from 'react'

/**
 * Splash animation in the spirit of YouTube's app-opening logo.
 *
 * Timeline (all CSS keyframes, no animation library):
 *   0ms     an opaque white sheet covers the app — from the very first frame,
 *           so the page underneath (header, nav links) never shows through
 *   120ms   golden glow blooms behind the logo and fades out by ~1.4s
 *   260ms   logo rises into place with a small overshoot
 *   980ms   the five prayer-flag segments sweep out from the centre
 *   1600ms  the flag rule fades away
 *   2100ms  the sheet fades to transparent
 *   2620ms  unmounts, revealing the page that loaded underneath
 *
 * When it plays: once per page load. A refresh replays it (that is the usual
 * "app opening" behaviour); moving between routes never does, because the
 * component only mounts with the app. Pass `oncePerSession` to survive refreshes
 * within the same tab using sessionStorage.
 */

const DEFAULT_STORAGE_KEY = 'pathyatra_intro_played'

/** Prayer-flag colours, in the same order as the flags on the logo. */
const FLAG_COLORS = ['#4A90D2', '#C8D1D6', '#E2231A', '#1B8A3E', '#F7A823'] as const

/** Total time until the overlay is removed from the DOM (ms). */
const TOTAL_MS = 2620
/** When the sheet starts fading out (ms). */
const EXIT_MS = 2100

/**
 * Module scope, so it resets on every full page load (refresh included) and
 * survives React StrictMode's double mount within that load.
 */
let playedThisLoad = false

export interface IntroLogoProps {
  /** The logo image to animate (imported asset URL). */
  logoSrc: string
  /** Keep it to one play per tab session — survives refresh — instead of one per load. */
  oncePerSession?: boolean
  /** sessionStorage key used only when `oncePerSession` is set. */
  storageKey?: string
}

function readStorageFlag(key: string): boolean {
  try {
    return window.sessionStorage.getItem(key) === 'true'
  } catch {
    // Blocked storage (private mode): playing again is harmless.
    return false
  }
}

function writeStorageFlag(key: string): void {
  try {
    window.sessionStorage.setItem(key, 'true')
  } catch {
    /* ignore */
  }
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function IntroLogo({
  logoSrc,
  oncePerSession = false,
  storageKey = DEFAULT_STORAGE_KEY,
}: IntroLogoProps) {
  // Decided before the first paint, so nothing flashes even for a frame.
  const [active, setActive] = useState(() => {
    if (typeof window === 'undefined') return false
    if (playedThisLoad) return false
    if (oncePerSession && readStorageFlag(storageKey)) return false
    return !prefersReducedMotion()
  })
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (!active) return undefined
    if (oncePerSession) writeStorageFlag(storageKey)

    const exit = window.setTimeout(() => setLeaving(true), EXIT_MS)
    const done = window.setTimeout(() => {
      playedThisLoad = true
      setActive(false)
    }, TOTAL_MS)

    return () => {
      window.clearTimeout(exit)
      window.clearTimeout(done)
    }
  }, [active, oncePerSession, storageKey])

  if (!active) return null

  return (
    <div
      aria-hidden="true"
      className={`intro-screen fixed inset-0 z-[120] flex items-center justify-center bg-white${
        leaving ? ' intro-screen--out' : ''
      }`}
    >
      {/* Sunrise glow: a soft golden bloom that barely moves. */}
      <div className="intro-glow" />

      {/* Logo lockup: the mark, then a rule that echoes the prayer flags. */}
      <div className="relative flex flex-col items-center px-6">
        <img
          src={logoSrc}
          alt=""
          draggable={false}
          className="intro-logo w-[min(66vw,260px)] select-none sm:w-[300px] lg:w-[340px]"
        />

        <div className="intro-rule mt-5 flex h-[3px] w-[min(66vw,260px)] items-stretch gap-[2px] sm:w-[300px] lg:w-[340px]">
          {FLAG_COLORS.map((color, index) => (
            <span
              key={color}
              className="intro-segment flex-1 rounded-full"
              style={{
                background: color,
                // Centre segment leads, outer ones follow: a sweep, not a wipe.
                animationDelay: `${980 + Math.abs(index - 2) * 55}ms`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Scoped keyframes: keeps the splash self-contained and dependency-free. */}
      <style>{`
        /* No entrance animation on purpose: the sheet must be fully opaque on
           the first painted frame, otherwise the page behind it flashes. */
        .intro-screen {
          background-color: #fff;
        }
        .intro-screen--out {
          animation: intro-screen-out 520ms cubic-bezier(0.4, 0, 0.6, 1) both;
        }

        .intro-glow {
          position: absolute;
          width: min(120vw, 900px);
          aspect-ratio: 1;
          border-radius: 999px;
          background: radial-gradient(
            circle,
            rgba(247, 168, 35, 0.55) 0%,
            rgba(247, 168, 35, 0.22) 38%,
            rgba(247, 168, 35, 0) 68%
          );
          animation: intro-glow 1250ms cubic-bezier(0.2, 0.75, 0.25, 1) 120ms both;
          will-change: opacity, transform;
        }

        .intro-logo {
          animation: intro-logo 900ms cubic-bezier(0.22, 1.24, 0.36, 1) 260ms both;
          will-change: opacity, transform;
        }

        .intro-rule {
          animation: intro-rule-out 420ms ease-in 1600ms both;
        }

        .intro-segment {
          animation: intro-segment 460ms cubic-bezier(0.2, 0.75, 0.25, 1) both;
          transform-origin: center;
        }

        @keyframes intro-screen-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes intro-glow {
          0% { opacity: 0; transform: scale(0.55); }
          45% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.25); }
        }
        @keyframes intro-logo {
          0% { opacity: 0; transform: translateY(18px) scale(0.82); }
          60% { opacity: 1; transform: translateY(0) scale(1.035); }
          80% { transform: translateY(0) scale(0.992); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes intro-segment {
          from { opacity: 0; transform: scaleX(0); }
          to { opacity: 1; transform: scaleX(1); }
        }
        @keyframes intro-rule-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        /* The global reduced-motion switch is a safety net; the component also
           skips itself entirely for those users before the first paint. */
        @media (prefers-reduced-motion: reduce) {
          .intro-screen--out, .intro-glow, .intro-logo, .intro-rule, .intro-segment {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}
