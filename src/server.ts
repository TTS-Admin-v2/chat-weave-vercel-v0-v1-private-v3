import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import compression from "compression"
import dotenv from "dotenv"
import { createServer } from "http"

import { errorHandler } from "./middleware/errorHandler"
import { rateLimiter } from "./middleware/rateLimiter"
import { logger } from "./utils/logger"

// Import routes
import authRoutes from "./routes/auth"
import fileProcessingRoutes from "./routes/fileProcessing"
import weaviateRoutes from "./routes/weaviate"
import embeddingRoutes from "./routes/embeddings"
import chatRoutes from "./routes/chat"
import analyticsRoutes from "./routes/analytics"
import toolConnectionRoutes from "./routes/toolConnections"
import workflowRoutes from "./routes/workflows"

dotenv.config()

const app = express()
const server = createServer(app)
const PORT = process.env.PORT || 3001

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }),
)

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
)

// General middleware
app.use(compression())
app.use(morgan("combined", { stream: { write: (message) => logger.info(message.trim()) } }))
app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true, limit: "50mb" }))

// Rate limiting
app.use(rateLimiter)

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  })
})

// API routes
app.use("/api/auth", authRoutes)
app.use("/api/file-processing", fileProcessingRoutes)
app.use("/api/weaviate", weaviateRoutes)
app.use("/api/embeddings", embeddingRoutes)
app.use("/api/chat", chatRoutes)
app.use("/api/analytics", analyticsRoutes)
app.use("/api/tool-connections", toolConnectionRoutes)
app.use("/api/workflows", workflowRoutes)

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  })
})

// Error handling middleware
app.use(errorHandler)

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully")
  server.close(() => {
    logger.info("Process terminated")
    process.exit(0)
  })
})

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully")
  server.close(() => {
    logger.info("Process terminated")
    process.exit(0)
  })
})

server.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`)
  logger.info(`📊 Environment: ${process.env.NODE_ENV || "development"}`)
  logger.info(`🔗 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:5173"}`)
})

export default app
