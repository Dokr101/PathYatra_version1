import { Suspense, lazy, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { CheckCircle2, Menu, WifiOff } from 'lucide-react'
import { useApp } from './context/AppContext'
import { TravellerSidebar } from './components/Nav'
import { Footer } from './components/Footer'
import { AuthModal } from './components/AuthModal'
import { CompareTray } from './components/CompareTray'
import { LandingHeader } from './components/LandingHeader'
import { PageSkeleton } from './components/PageSkeleton'
import { ErrorBoundary } from './components/ErrorBoundary'
import { IntroLogo } from './components/IntroLogo'
import logo from './assets/logo.png'
import { Home } from './pages/Home'
import { loadJSON, saveJSON } from './lib/storage'

/**
 * Only the landing page ships in the entry bundle; every other route is its own
 * chunk. Anything heavy (Leaflet, the admin panel) stays out of a first visit.
 */
const Explore = lazy(() => import('./pages/Explore').then((module) => ({ default: module.Explore })))
const DestinationPage = lazy(() =>
  import('./pages/DestinationPage').then((module) => ({ default: module.DestinationPage })),
)
const Planner = lazy(() => import('./pages/Planner').then((module) => ({ default: module.Planner })))
const ItineraryPage = lazy(() =>
  import('./pages/ItineraryPage').then((module) => ({ default: module.ItineraryPage })),
)
const BudgetPlanner = lazy(() =>
  import('./pages/BudgetPlanner').then((module) => ({ default: module.BudgetPlanner })),
)
const MeroYatra = lazy(() => import('./pages/MeroYatra').then((module) => ({ default: module.MeroYatra })))
const Reviews = lazy(() => import('./pages/Reviews').then((module) => ({ default: module.Reviews })))
const Profile = lazy(() => import('./pages/Profile').then((module) => ({ default: module.Profile })))
const MapPage = lazy(() => import('./pages/MapPage').then((module) => ({ default: module.MapPage })))
const SharedItinerary = lazy(() =>
  import('./pages/SharedItinerary').then((module) => ({ default: module.SharedItinerary })),
)
const Help = lazy(() => import('./pages/Help').then((module) => ({ default: module.Help })))
const NotFound = lazy(() => import('./pages/NotFound').then((module) => ({ default: module.NotFound })))

// One shared module for the whole admin panel, so its 15 pages are one chunk.
const loadAdmin = () => import('./pages/admin/barrel')
const AdminLayout = lazy(() => loadAdmin().then((module) => ({ default: module.AdminLayout })))
const AdminProtectedRoute = lazy(() =>
  loadAdmin().then((module) => ({ default: module.AdminProtectedRoute })),
)
const AdminLogin = lazy(() => loadAdmin().then((module) => ({ default: module.AdminLogin })))
const AdminDashboard = lazy(() => loadAdmin().then((module) => ({ default: module.AdminDashboard })))
const AdminDestinations = lazy(() =>
  loadAdmin().then((module) => ({ default: module.AdminDestinations })),
)
const AdminDestinationForm = lazy(() =>
  loadAdmin().then((module) => ({ default: module.AdminDestinationForm })),
)
const AdminMedia = lazy(() => loadAdmin().then((module) => ({ default: module.AdminMedia })))
const AdminCategories = lazy(() => loadAdmin().then((module) => ({ default: module.AdminCategories })))
const AdminActivities = lazy(() => loadAdmin().then((module) => ({ default: module.AdminActivities })))
const AdminPlaces = lazy(() => loadAdmin().then((module) => ({ default: module.AdminPlaces })))
const AdminItineraryTemplates = lazy(() =>
  loadAdmin().then((module) => ({ default: module.AdminItineraryTemplates })),
)
const AdminTravelInfo = lazy(() => loadAdmin().then((module) => ({ default: module.AdminTravelInfo })))
const AdminReviews = lazy(() => loadAdmin().then((module) => ({ default: module.AdminReviews })))
const AdminUsers = lazy(() => loadAdmin().then((module) => ({ default: module.AdminUsers })))
const AdminAnalytics = lazy(() => loadAdmin().then((module) => ({ default: module.AdminAnalytics })))
const AdminSettings = lazy(() => loadAdmin().then((module) => ({ default: module.AdminSettings })))
const AdminAuditLogs = lazy(() => loadAdmin().then((module) => ({ default: module.AdminAuditLogs })))

/** Fades and lifts the new page in on every pathname change (see .route-enter). */
function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return (
    <div key={pathname} className="route-enter">
      {children}
    </div>
  )
}

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
          <PageTransition>
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </PageTransition>
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
            aria-expanded={sidebarOpen}
            className="motion-press inline-flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-white/60 text-ink-soft hover:bg-paper-2"
          >
            <Menu size={18} />
          </button>
        </header>

        <main className="flex-1">
          <PageTransition>
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </PageTransition>
        </main>
        <Footer />
      </div>

      <AuthModal />
      <CompareTray />
    </div>
  )
}

export default function App() {
  const location = useLocation()

  return (
    <div className="min-h-screen">
      {/* Once per browser session, above every route and overlay. */}
      <IntroLogo logoSrc={logo} />
      <NetworkStatus />
      <ScrollToTop />
      {/* A failed chunk or render throw must not blank the app: the boundary
          shows a reload/home escape hatch, and a route change clears it. */}
      <ErrorBoundary resetKey={location.pathname} scope="app">
        <Suspense fallback={<PageSkeleton label="Loading admin" />}>
          <Routes>
          {/* Landing page — standalone layout with its own lightweight header */}
          <Route
            path="/"
            element={
              <div className="min-h-screen bg-paper">
                <PageTransition>
                  <Home />
                </PageTransition>
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
        </Suspense>
      </ErrorBoundary>
      <Toast />
    </div>
  )
}
