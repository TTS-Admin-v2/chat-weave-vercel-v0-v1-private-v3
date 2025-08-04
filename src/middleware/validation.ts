import Joi from "joi"
import type { Request, Response, NextFunction } from "express"

export const schemas = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().default("created_at"),
    sortOrder: Joi.string().valid("asc", "desc").default("desc"),
  }),

  fileProcessing: {
    create: Joi.object({
      fileName: Joi.string().required(),
      fileSize: Joi.number().integer().min(0).required(),
      mimeType: Joi.string().required(),
      googleDriveFileId: Joi.string().optional(),
      filePath: Joi.string().optional(),
    }),
    update: Joi.object({
      status: Joi.string().valid("pending", "processing", "completed", "failed").optional(),
      contentTitle: Joi.string().optional(),
      contentText: Joi.string().optional(),
      errorMessage: Joi.string().optional(),
    }),
  },

  weaviate: {
    upload: Joi.object({
      className: Joi.string().required(),
      objects: Joi.array().items(Joi.object()).required(),
    }),
    query: Joi.object({
      query: Joi.string().required(),
      limit: Joi.number().integer().min(1).max(100).default(10),
      distance: Joi.number().min(0).max(1).default(0.7),
    }),
  },

  chat: {
    message: Joi.object({
      message: Joi.string().required(),
      conversationId: Joi.string().uuid().optional(),
      history: Joi.array().items(Joi.object()).default([]),
    }),
  },

  embeddings: {
    create: Joi.object({
      text: Joi.string().required(),
      metadata: Joi.object().optional(),
    }),
  },
}

export const validateRequest = (schema: { body?: Joi.Schema; query?: Joi.Schema; params?: Joi.Schema }) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = []

    if (schema.body) {
      const { error, value } = schema.body.validate(req.body)
      if (error) {
        errors.push(`Body: ${error.details.map((d) => d.message).join(", ")}`)
      } else {
        req.body = value
      }
    }

    if (schema.query) {
      const { error, value } = schema.query.validate(req.query)
      if (error) {
        errors.push(`Query: ${error.details.map((d) => d.message).join(", ")}`)
      } else {
        req.query = value
      }
    }

    if (schema.params) {
      const { error, value } = schema.params.validate(req.params)
      if (error) {
        errors.push(`Params: ${error.details.map((d) => d.message).join(", ")}`)
      } else {
        req.params = value
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      })
    }

    next()
  }
}
