import { Link } from 'react-router-dom'
import { ArrowLeft, Compass } from 'lucide-react'
import { ScenicArt } from '../components/ScenicArt'

export function NotFound() {
  return (
    <div className="container-page py-16">
      <div className="relative overflow-hidden rounded-3xl border border-line">
        <ScenicArt scene={{ kind: 'hills', sky: 'dusk', seed: 6 }} className="h-[320px] w-full sm:h-[400px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/50 to-ink/20" />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-paper">
          <p className="text-[11px] uppercase tracking-[0.24em] text-paper/60">404 · off the trail</p>
          <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.6rem)] leading-[1]">This path does not exist.</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-paper/75">
            The page may have moved, or the link may be incomplete. The rest of Nepal is still where you left it.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link to="/" className="btn-saffron">
              <ArrowLeft size={15} /> Back home
            </Link>
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 rounded-full border border-paper/35 px-5 py-3 text-sm text-paper transition hover:bg-paper/10"
            >
              <Compass size={15} /> Explore Nepal
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
