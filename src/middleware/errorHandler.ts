import type { Request, Response, NextFunction } from "express"
import { logger } from "../utils/logger"

export class AppError extends Error {
  public statusCode: number
  public isOperational: boolean

  constructor(message: string, statusCode = 500) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true

    Error.captureStackTrace(this, this.constructor)
  }
}

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  let error = { ...err }
  error.message = err.message

  // Log error
  logger.error(err)

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = "Resource not found"
    error = new AppError(message, 404)
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = "Duplicate field value entered"
    error = new AppError(message, 400)
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map((val: any) => val.message)
    error = new AppError(message.join(", "), 400)
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  })
}
