import { Router } from "express"
import { authenticateToken } from "../middleware/auth"
import { asyncHandler } from "../middleware/errorHandler"
import { WorkflowController } from "../controllers/WorkflowController"

const router = Router()
const controller = new WorkflowController()

// Apply authentication to all routes
router.use(authenticateToken)

// Get all workflows
router.get("/", asyncHandler(controller.getAll.bind(controller)))

// Create workflow
router.post("/", asyncHandler(controller.create.bind(controller)))

// Execute workflow
router.post("/:id/execute", asyncHandler(controller.execute.bind(controller)))

// Get workflow execution history
router.get("/:id/executions", asyncHandler(controller.getExecutions.bind(controller)))

export default router
