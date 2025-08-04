import { Router } from "express"
import { authenticateToken } from "../middleware/auth"
import { validateRequest, schemas } from "../middleware/validation"
import { asyncHandler } from "../middleware/errorHandler"
import { heavyOperationsRateLimit } from "../middleware/rateLimiter"
import { WeaviateController } from "../controllers/WeaviateController"

const router = Router()
const controller = new WeaviateController()

// Apply authentication to all routes
router.use(authenticateToken)

// Upload data to Weaviate
router.post(
  "/upload",
  heavyOperationsRateLimit,
  validateRequest({ body: schemas.weaviate.upload }),
  asyncHandler(controller.upload.bind(controller)),
)

// Query Weaviate
router.post(
  "/query",
  validateRequest({ body: schemas.weaviate.query }),
  asyncHandler(controller.query.bind(controller)),
)

// Get Weaviate statistics
router.get("/stats", asyncHandler(controller.getStats.bind(controller)))

// Delete objects from Weaviate
router.delete("/objects/:className", heavyOperationsRateLimit, asyncHandler(controller.deleteObjects.bind(controller)))

// Get schema information
router.get("/schema", asyncHandler(controller.getSchema.bind(controller)))

// Create or update schema
router.post("/schema", heavyOperationsRateLimit, asyncHandler(controller.updateSchema.bind(controller)))

export default router
