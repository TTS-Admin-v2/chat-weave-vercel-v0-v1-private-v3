import { Router } from "express"
import { authenticateToken } from "../middleware/auth"
import { validateRequest, schemas } from "../middleware/validation"
import { asyncHandler } from "../middleware/errorHandler"
import { FileProcessingController } from "../controllers/FileProcessingController"

const router = Router()
const controller = new FileProcessingController()

// Apply authentication to all routes
router.use(authenticateToken)

// Get all file processing records
router.get("/", validateRequest({ query: schemas.pagination }), asyncHandler(controller.getAll.bind(controller)))

// Get file processing record by ID
router.get("/:id", asyncHandler(controller.getById.bind(controller)))

// Create new file processing record
router.post(
  "/",
  validateRequest({ body: schemas.fileProcessing.create }),
  asyncHandler(controller.create.bind(controller)),
)

// Update file processing record
router.put(
  "/:id",
  validateRequest({ body: schemas.fileProcessing.update }),
  asyncHandler(controller.update.bind(controller)),
)

// Delete file processing record
router.delete("/:id", asyncHandler(controller.delete.bind(controller)))

// Get processing statistics
router.get("/stats/overview", asyncHandler(controller.getStats.bind(controller)))

// Retry failed processing
router.post("/:id/retry", asyncHandler(controller.retry.bind(controller)))

// Bulk operations
router.post("/bulk/delete", asyncHandler(controller.bulkDelete.bind(controller)))

router.post("/bulk/retry", asyncHandler(controller.bulkRetry.bind(controller)))

export default router
