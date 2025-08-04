import type { Request, Response, NextFunction } from "express"
import { supabase } from "../config/database"
import { logger } from "../utils/logger"

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    role?: string
  }
}

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(" ")[1]

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token required",
      })
    }

    // Verify with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      })
    }

    // Get user profile
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

    req.user = {
      id: user.id,
      email: user.email || "",
      role: profile?.role || "user",
    }

    next()
  } catch (error) {
    logger.error("Authentication error:", error)
    res.status(401).json({
      success: false,
      message: "Authentication failed",
    })
  }
}

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      })
    }

    if (!roles.includes(req.user.role || "user")) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      })
    }

    next()
  }
}
