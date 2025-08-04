import { Router } from "express"
import { authenticateToken } from "../middleware/auth"
import { validateRequest, schemas } from "../middleware/validation"
import { asyncHandler } from "../middleware/errorHandler"
import { EmbeddingController } from "../controllers/EmbeddingController"

const router = Router()
const controller = new EmbeddingController()

// Apply authentication to all routes
router.use(authenticateToken)

// Create embeddings
router.post(
  "/create",
  validateRequest({ body: schemas.embeddings.create }),
  asyncHandler(controller.create.bind(controller)),
)

// Batch create embeddings
router.post("/batch", asyncHandler(controller.batchCreate.bind(controller)))

// Search similar embeddings
router.post("/search", asyncHandler(controller.search.bind(controller)))

export default router
