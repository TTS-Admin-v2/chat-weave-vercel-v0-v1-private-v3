import type { Request, Response } from "express"
import { supabase } from "../config/database"
import { AppError } from "../middleware/errorHandler"
import { logger } from "../utils/logger"

export class AuthController {
  async register(req: Request, res: Response) {
    const { email, password, fullName } = req.body

    if (!email || !password) {
      throw new AppError("Email and password are required", 400)
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) {
        throw new AppError(error.message, 400)
      }

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
          user: data.user,
          session: data.session,
        },
      })
    } catch (error: any) {
      logger.error("Registration error:", error)
      throw new AppError(error.message || "Registration failed", 500)
    }
  }

  async login(req: Request, res: Response) {
    const { email, password } = req.body

    if (!email || !password) {
      throw new AppError("Email and password are required", 400)
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw new AppError(error.message, 401)
      }

      res.json({
        success: true,
        message: "Login successful",
        data: {
          user: data.user,
          session: data.session,
        },
      })
    } catch (error: any) {
      logger.error("Login error:", error)
      throw new AppError(error.message || "Login failed", 500)
    }
  }

  async refresh(req: Request, res: Response) {
    const { refreshToken } = req.body

    if (!refreshToken) {
      throw new AppError("Refresh token is required", 400)
    }

    try {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      })

      if (error) {
        throw new AppError(error.message, 401)
      }

      res.json({
        success: true,
        message: "Token refreshed successfully",
        data: {
          session: data.session,
        },
      })
    } catch (error: any) {
      logger.error("Token refresh error:", error)
      throw new AppError(error.message || "Token refresh failed", 500)
    }
  }

  async logout(req: Request, res: Response) {
    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        throw new AppError(error.message, 400)
      }

      res.json({
        success: true,
        message: "Logout successful",
      })
    } catch (error: any) {
      logger.error("Logout error:", error)
      throw new AppError(error.message || "Logout failed", 500)
    }
  }

  async getProfile(req: Request, res: Response) {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(" ")[1]

    if (!token) {
      throw new AppError("Access token required", 401)
    }

    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token)

      if (error || !user) {
        throw new AppError("Invalid or expired token", 401)
      }

      // Get user profile
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      res.json({
        success: true,
        data: {
          user,
          profile,
        },
      })
    } catch (error: any) {
      logger.error("Get profile error:", error)
      throw new AppError(error.message || "Failed to get profile", 500)
    }
  }
}
