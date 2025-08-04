import { Router } from "express"
import { authenticateToken } from "../middleware/auth"
import { asyncHandler } from "../middleware/errorHandler"
import { ToolConnectionController } from "../controllers/ToolConnectionController"

const router = Router()
const controller = new ToolConnectionController()

// Apply authentication to all routes
router.use(authenticateToken)

// Get all tool connections
router.get("/", asyncHandler(controller.getAll.bind(controller)))

// Test connection
router.post("/test", asyncHandler(controller.testConnection.bind(controller)))

// Firecrawl operations
router.post("/firecrawl/scrape", asyncHandler(controller.firecrawlScrape.bind(controller)))
router.post("/firecrawl/search", asyncHandler(controller.firecrawlSearch.bind(controller)))
router.post("/firecrawl/extract", asyncHandler(controller.firecrawlExtract.bind(controller)))

// Google Drive operations
router.get("/google-drive/files", asyncHandler(controller.getGoogleDriveFiles.bind(controller)))
router.post("/google-drive/upload", asyncHandler(controller.uploadToGoogleDrive.bind(controller)))

export default router
