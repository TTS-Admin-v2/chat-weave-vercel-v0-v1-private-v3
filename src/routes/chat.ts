import { Router } from "express"
import { authenticateToken } from "../middleware/auth"
import { validateRequest, schemas } from "../middleware/validation"
import { asyncHandler } from "../middleware/errorHandler"
import { ChatController } from "../controllers/ChatController"

const router = Router()
const controller = new ChatController()

// Apply authentication to all routes
router.use(authenticateToken)

// Send chat message
router.post(
  "/message",
  validateRequest({ body: schemas.chat.message }),
  asyncHandler(controller.sendMessage.bind(controller)),
)

// Get chat conversations
router.get("/conversations", asyncHandler(controller.getConversations.bind(controller)))

// Get conversation messages
router.get("/conversations/:id/messages", asyncHandler(controller.getConversationMessages.bind(controller)))

// Create new conversation
router.post("/conversations", asyncHandler(controller.createConversation.bind(controller)))

// Delete conversation
router.delete("/conversations/:id", asyncHandler(controller.deleteConversation.bind(controller)))

export default router
