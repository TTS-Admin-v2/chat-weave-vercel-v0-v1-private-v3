import { Router } from "express"
import { authenticateToken } from "../middleware/auth"
import { asyncHandler } from "../middleware/errorHandler"
import { AnalyticsController } from "../controllers/AnalyticsController"

const router = Router()
const controller = new AnalyticsController()

// Apply authentication to all routes
router.use(authenticateToken)

// Get dashboard overview
router.get("/dashboard", asyncHandler(controller.getDashboard.bind(controller)))

// Get processing statistics
router.get("/processing-stats", asyncHandler(controller.getProcessingStats.bind(controller)))

// Get chat statistics
router.get("/chat-stats", asyncHandler(controller.getChatStats.bind(controller)))

// Get usage trends
router.get("/trends", asyncHandler(controller.getTrends.bind(controller)))

export default router
