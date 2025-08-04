import type { Response } from "express"
import { supabase } from "../config/database"
import type { AuthenticatedRequest } from "../middleware/auth"
import { AppError } from "../middleware/errorHandler"
import { logger } from "../utils/logger"

export class EmbeddingController {
  async create(req: AuthenticatedRequest, res: Response) {
    const { text, metadata = {} } = req.body

    try {
      // Call Supabase function to create embeddings
      const { data, error } = await supabase.functions.invoke("create-embeddings", {
        body: { text, metadata },
      })

      if (error) {
        throw new AppError(`Failed to create embeddings: ${error.message}`, 500)
      }

      if (!data.success) {
        throw new AppError(`Embedding creation failed: ${data.error}`, 500)
      }

      res.json({
        success: true,
        data: {
          embedding: data.embedding,
          dimensions: data.embedding.length,
          text: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
        },
      })
    } catch (error: any) {
      logger.error("Embedding creation error:", error)
      throw new AppError(error.message || "Failed to create embeddings", 500)
    }
  }

  async batchCreate(req: AuthenticatedRequest, res: Response) {
    const { texts, metadata = [] } = req.body

    if (!Array.isArray(texts) || texts.length === 0) {
      throw new AppError("Texts array is required and cannot be empty", 400)
    }

    if (texts.length > 100) {
      throw new AppError("Maximum 100 texts allowed per batch", 400)
    }

    try {
      const results = []
      const batchSize = 10 // Process in smaller batches to avoid timeouts

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize)
        const batchMetadata = metadata.slice(i, i + batchSize)

        const batchPromises = batch.map(async (text: string, index: number) => {
          try {
            const { data, error } = await supabase.functions.invoke("create-embeddings", {
              body: {
                text,
                metadata: batchMetadata[index] || {},
              },
            })

            if (error || !data.success) {
              return {
                success: false,
                text: text.substring(0, 50) + "...",
                error: error?.message || data.error,
              }
            }

            return {
              success: true,
              text: text.substring(0, 50) + "...",
              embedding: data.embedding,
              dimensions: data.embedding.length,
            }
          } catch (error: any) {
            return {
              success: false,
              text: text.substring(0, 50) + "...",
              error: error.message,
            }
          }
        })

        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults)
      }

      const successful = results.filter((r) => r.success).length
      const failed = results.filter((r) => !r.success).length

      res.json({
        success: true,
        data: {
          total: texts.length,
          successful,
          failed,
          results,
        },
      })
    } catch (error: any) {
      logger.error("Batch embedding creation error:", error)
      throw new AppError(error.message || "Failed to create batch embeddings", 500)
    }
  }

  async search(req: AuthenticatedRequest, res: Response) {
    const { query, limit = 10, threshold = 0.7 } = req.body

    if (!query) {
      throw new AppError("Query is required", 400)
    }

    try {
      // First create embedding for the query
      const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke("create-embeddings", {
        body: { text: query },
      })

      if (embeddingError || !embeddingData.success) {
        throw new AppError("Failed to create query embedding", 500)
      }

      const queryVector = embeddingData.embedding

      // Search for similar embeddings in the database
      // This would typically use a vector similarity search
      // For now, we'll use a simple approach with stored embeddings
      const { data: searchResults, error: searchError } = await supabase.rpc("search_embeddings", {
        query_embedding: queryVector,
        match_threshold: threshold,
        match_count: limit,
      })

      if (searchError) {
        logger.error("Embedding search error:", searchError)
        // Fallback to basic text search if vector search fails
        const { data: fallbackResults } = await supabase
          .from("file_processing")
          .select("*")
          .textSearch("content_text", query)
          .limit(limit)

        return res.json({
          success: true,
          data: {
            query,
            results: fallbackResults || [],
            count: fallbackResults?.length || 0,
            searchType: "text",
          },
        })
      }

      res.json({
        success: true,
        data: {
          query,
          results: searchResults || [],
          count: searchResults?.length || 0,
          searchType: "vector",
        },
      })
    } catch (error: any) {
      logger.error("Embedding search error:", error)
      throw new AppError(error.message || "Failed to search embeddings", 500)
    }
  }
}
