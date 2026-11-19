/**
 * Every admin page is reached through this one module, so the whole panel lands
 * in a single lazy chunk instead of the traveller bundle. Nothing here is
 * imported statically — see App.tsx.
 */
export { AdminLayout } from '../../components/admin/AdminLayout'
export { AdminProtectedRoute } from '../../components/admin/AdminProtectedRoute'
export { AdminLogin } from './AdminLogin'
export { AdminDashboard } from './AdminDashboard'
export { AdminDestinations } from './AdminDestinations'
export { AdminDestinationForm } from './AdminDestinationForm'
export { AdminMedia } from './AdminMedia'
export { AdminCategories } from './AdminCategories'
export { AdminActivities } from './AdminActivities'
export { AdminPlaces } from './AdminPlaces'
export { AdminItineraryTemplates } from './AdminItineraryTemplates'
export { AdminTravelInfo } from './AdminTravelInfo'
export { AdminReviews } from './AdminReviews'
export { AdminUsers } from './AdminUsers'
export { AdminAnalytics } from './AdminAnalytics'
export { AdminSettings } from './AdminSettings'
export { AdminAuditLogs } from './AdminAuditLogs'
