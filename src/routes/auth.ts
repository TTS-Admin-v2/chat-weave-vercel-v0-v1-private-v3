import { Router } from "express"
import { asyncHandler } from "../middleware/errorHandler"
import { AuthController } from "../controllers/AuthController"

const router = Router()
const controller = new AuthController()

// Register new user
router.post("/register", asyncHandler(controller.register.bind(controller)))

// Login user
router.post("/login", asyncHandler(controller.login.bind(controller)))

// Refresh token
router.post("/refresh", asyncHandler(controller.refresh.bind(controller)))

// Logout user
router.post("/logout", asyncHandler(controller.logout.bind(controller)))

// Get current user profile
router.get("/profile", asyncHandler(controller.getProfile.bind(controller)))

export default router
