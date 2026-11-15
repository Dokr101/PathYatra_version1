import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { useApp } from './context/AppContext'
import { Nav } from './components/Nav'
import { Footer } from './components/Footer'
import { AuthModal } from './components/AuthModal'
import { CompareTray } from './components/CompareTray'
import { Home } from './pages/Home'
import { Explore } from './pages/Explore'
import { DestinationPage } from './pages/DestinationPage'
import { Planner } from './pages/Planner'
import { ItineraryPage } from './pages/ItineraryPage'
import { BudgetPlanner } from './pages/BudgetPlanner'
import { MeroYatra } from './pages/MeroYatra'
import { Reviews } from './pages/Reviews'
import { Profile } from './pages/Profile'
import { MapPage } from './pages/MapPage'
import { SharedItinerary } from './pages/SharedItinerary'
import { Help } from './pages/Help'
import { NotFound } from './pages/NotFound'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])
  return null
}

function Toast() {
  const { toast } = useApp()
  if (!toast) return null
  return (
    <div className="no-print pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex justify-center px-4">
      <div className="flex items-center gap-2 rounded-full border border-pine/20 bg-pine px-4 py-2.5 text-xs text-paper shadow-lift">
        <CheckCircle2 size={14} className="text-marigold" />
        {toast}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <ScrollToTop />
      <Nav />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/explore/:slug" element={<DestinationPage />} />
          <Route path="/plan" element={<Planner />} />
          <Route path="/itinerary/:id" element={<ItineraryPage />} />
          <Route path="/budget" element={<BudgetPlanner />} />
          <Route path="/mero-yatra" element={<MeroYatra />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/shared" element={<SharedItinerary />} />
          <Route path="/help" element={<Help />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <AuthModal />
      <CompareTray />
      <Toast />
    </div>
  )
}
