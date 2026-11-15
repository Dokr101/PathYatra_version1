import { useEffect, useState } from 'react'
import { Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { CheckCircle2, Menu, WifiOff } from 'lucide-react'
import { useApp } from './context/AppContext'
import { TravellerSidebar } from './components/Nav'
import { Footer } from './components/Footer'
import { AuthModal } from './components/AuthModal'
import { CompareTray } from './components/CompareTray'
import { LandingHeader } from './components/LandingHeader'
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
import { loadJSON, saveJSON } from './lib/storage'

import { AdminProtectedRoute } from './components/admin/AdminProtectedRoute'
import { AdminLayout } from './components/admin/AdminLayout'
import { AdminLogin } from './pages/admin/AdminLogin'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminDestinations } from './pages/admin/AdminDestinations'
import { AdminDestinationForm } from './pages/admin/AdminDestinationForm'
import { AdminMedia } from './pages/admin/AdminMedia'
import { AdminCategories } from './pages/admin/AdminCategories'
import { AdminActivities } from './pages/admin/AdminActivities'
import { AdminPlaces } from './pages/admin/AdminPlaces'
import { AdminItineraryTemplates } from './pages/admin/AdminItineraryTemplates'
import { AdminTravelInfo } from './pages/admin/AdminTravelInfo'
import { AdminReviews } from './pages/admin/AdminReviews'
import { AdminUsers } from './pages/admin/AdminUsers'
import { AdminAnalytics } from './pages/admin/AdminAnalytics'
import { AdminSettings } from './pages/admin/AdminSettings'
import { AdminAuditLogs } from './pages/admin/AdminAuditLogs'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])
  return null
}

function Toast() {
  const { toast } = useApp()
  const [displayToast, setDisplayToast] = useState(toast)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (toast) {
      setDisplayToast(toast)
      setExiting(false)
      return undefined
    }
    if (!displayToast) return undefined

    setExiting(true)
    const timer = window.setTimeout(() => {
      setDisplayToast(null)
      setExiting(false)
    }, 160)
    return () => window.clearTimeout(timer)
  }, [toast, displayToast])

  if (!displayToast) return null
  return (
    <div className="no-print pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className={`motion-toast flex items-center gap-2 rounded-full border border-pine/20 bg-pine px-4 py-2.5 text-xs text-paper shadow-lift${exiting ? ' motion-toast-exit' : ''}`}
      >
        <CheckCircle2 size={14} className="text-marigold" />
        {displayToast}
      </div>
    </div>
  )
}

function NetworkStatus() {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine)

  useEffect(() => {
    const updateStatus = () => setOnline(navigator.onLine)
    window.addEventListener('online', updateStatus)
    window.addEventListener('offline', updateStatus)
    return () => {
      window.removeEventListener('online', updateStatus)
      window.removeEventListener('offline', updateStatus)
    }
  }, [])

  if (online) return null
  return (
    <div role="status" className="sticky top-0 z-[70] flex items-start justify-center gap-2 border-b border-marigold/50 bg-[#fff4dc] px-4 py-2.5 text-center text-[11px] leading-relaxed text-ink-soft">
      <WifiOff size={14} className="mt-0.5 shrink-0 text-clay" />
      <p>
        <span className="font-semibold text-ink">You’re offline.</span> Your cached destination guide, trip plans and wishlist on this device still work. Live updates and sign-in need an internet connection.
      </p>
    </div>
  )
}

/** The traveller-facing site, with a collapsible left navigation and footer. */
function PublicLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => loadJSON('traveller-sidebar-collapsed', false))
  const [sidebarHovered, setSidebarHovered] = useState(false)
  const { user } = useApp()

  useEffect(() => saveJSON('traveller-sidebar-collapsed', collapsed), [collapsed])

  const isDesktop = () =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches

  const toggleSidebar = () => {
    if (isDesktop()) setCollapsed((value) => !value)
    else setSidebarOpen((value) => !value)
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-paper">
        <LandingHeader solid />
        <main className="guest-main flex-1 pt-[72px]">
          <Outlet />
        </main>
        <Footer />
        <AuthModal />
        <CompareTray />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper">
      <TravellerSidebar
        open={sidebarOpen}
        collapsed={collapsed}
        onClose={() => setSidebarOpen(false)}
        onToggle={toggleSidebar}
        onHoverChange={setSidebarHovered}
      />

      <div
        className={`flex min-h-screen flex-col transition-[padding] duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          collapsed ? (sidebarHovered ? 'lg:pl-72' : 'lg:pl-16') : 'lg:pl-72'
        }`}
      >
        <header className="no-print sticky top-0 z-30 flex h-14 items-center border-b border-line bg-paper/95 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Toggle navigation"
            className="motion-press rounded-lg border border-line bg-white/60 p-2 text-ink-soft hover:bg-paper-2"
          >
            <Menu size={18} />
          </button>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>

      <AuthModal />
      <CompareTray />
    </div>
  )
}

export default function App() {
  return (
    <div className="min-h-screen">
      <NetworkStatus />
      <ScrollToTop />
      <Routes>
        {/* Landing page — standalone layout with its own lightweight header */}
        <Route
          path="/"
          element={
            <div className="min-h-screen bg-paper">
              <Home />
              <Footer />
              <AuthModal />
              <CompareTray />
            </div>
          }
        />

        <Route element={<PublicLayout />}>
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
        </Route>

        <Route path="/admin/login" element={<AdminLogin />} />

        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="destinations" element={<AdminDestinations />} />
          <Route path="destinations/new" element={<AdminDestinationForm />} />
          <Route path="destinations/:id/edit" element={<AdminDestinationForm />} />
          <Route path="media" element={<AdminMedia />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="activities" element={<AdminActivities />} />
          <Route path="places" element={<AdminPlaces />} />
          <Route path="itineraries" element={<AdminItineraryTemplates />} />
          <Route path="itineraries/:id" element={<AdminItineraryTemplates />} />
          <Route path="travel-info" element={<AdminTravelInfo />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="audit-logs" element={<AdminAuditLogs />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toast />
    </div>
  )
}
