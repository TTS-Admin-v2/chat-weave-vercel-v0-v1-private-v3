import rateLimit from "express-rate-limit"
import slowDown from "express-slow-down"

// General rate limiter
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Heavy operations rate limiter
export const heavyOperationsRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 requests per minute for heavy operations
  message: {
    success: false,
    message: "Too many heavy operations, please wait before trying again.",
  },
})

// Speed limiter for gradual slowdown
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per 15 minutes, then...
  delayMs: 500, // begin adding 500ms of delay per request above 50
  maxDelayMs: 20000, // maximum delay of 20 seconds
})
