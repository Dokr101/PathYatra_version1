import { Router } from 'express'
import { requireAuth, requireAdmin } from '../../middleware/auth.js'
import { adminDestinationsRouter } from './destinations.js'
import { adminMediaRouter } from './media.js'
import { adminCategoriesRouter } from './categories.js'
import { adminActivitiesRouter } from './activities.js'
import { adminPlacesRouter } from './places.js'
import { adminItinerariesRouter } from './itineraries.js'
import { adminTravelInfoRouter } from './travel-info.js'
import { adminReviewsRouter } from './reviews.js'
import { adminUsersRouter } from './users.js'
import { adminDashboardRouter } from './dashboard.js'
import { adminAuditLogsRouter } from './audit-logs.js'
import { adminAnalyticsRouter } from './analytics.js'
import { adminSettingsRouter } from './settings.js'

export const adminRouter = Router()

// Every /api/admin/* request must present a valid Bearer token for an active
// account whose role is ADMIN or SUPER_ADMIN.
adminRouter.use(requireAuth, requireAdmin)

adminRouter.use('/dashboard', adminDashboardRouter)
adminRouter.use('/destinations', adminDestinationsRouter)
adminRouter.use('/media', adminMediaRouter)
adminRouter.use('/categories', adminCategoriesRouter)
adminRouter.use('/activities', adminActivitiesRouter)
adminRouter.use('/places', adminPlacesRouter)
adminRouter.use('/itineraries', adminItinerariesRouter)
adminRouter.use('/travel-info', adminTravelInfoRouter)
adminRouter.use('/reviews', adminReviewsRouter)
adminRouter.use('/users', adminUsersRouter)
adminRouter.use('/audit-logs', adminAuditLogsRouter)
adminRouter.use('/analytics', adminAnalyticsRouter)
adminRouter.use('/settings', adminSettingsRouter)
