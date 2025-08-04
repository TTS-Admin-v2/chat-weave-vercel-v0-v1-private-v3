import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { AppError } from "../middleware/errorHandler"
import { supabase } from "../config/database"
import { logger } from "../utils/logger"

export class WeaviateController {
  private getWeaviateConfig() {
    const url = process.env.WEAVIATE_URL
    const apiKey = process.env.WEAVIATE_API_KEY

    if (!url || !apiKey) {
      throw new AppError("Weaviate configuration not found", 500)
    }

    return { url, apiKey }
  }

  async upload(req: AuthenticatedRequest, res: Response) {
    const { className, objects } = req.body
    const { url, apiKey } = this.getWeaviateConfig()

    try {
      // Call Supabase function for Weaviate upload
      const { data, error } = await supabase.functions.invoke("weaviate-upload", {
        body: { className, objects },
      })

      if (error) {
        throw new AppError(`Weaviate upload failed: ${error.message}`, 500)
      }

      if (!data.success) {
        throw new AppError(`Weaviate upload failed: ${data.error}`, 500)
      }

      logger.info(`Successfully uploaded ${data.uploaded} objects to Weaviate class: ${className}`)

      res.json({
        success: true,
        data: {
          uploaded: data.uploaded,
          className: data.className,
        },
      })
    } catch (error: any) {
      logger.error("Weaviate upload error:", error)
      throw new AppError(error.message || "Failed to upload to Weaviate", 500)
    }
  }

  async query(req: AuthenticatedRequest, res: Response) {
    const { query, limit = 10, distance = 0.7 } = req.body
    const { url, apiKey } = this.getWeaviateConfig()

    try {
      // First create embedding for the query
      const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke("create-embeddings", {
        body: { text: query },
      })

      if (embeddingError || !embeddingData.success) {
        throw new AppError("Failed to create query embedding", 500)
      }

      const queryVector = embeddingData.embedding

      // Build GraphQL query
      const graphqlQuery = {
        query: `{
          Get {
            ScrapedContent(
              nearVector: {
                vector: [${queryVector.join(",")}]
                distance: ${distance}
              }
              limit: ${limit}
            ) {
              title
              content
              url
              source
              _additional {
                distance
                id
              }
            }
          }
        }`,
      }

      const response = await fetch(`${url}/v1/graphql`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(graphqlQuery),
      })

      if (!response.ok) {
        throw new AppError("Weaviate query failed", 500)
      }

      const result = await response.json()
      const results = result.data?.Get?.ScrapedContent || []

      res.json({
        success: true,
        data: {
          query,
          results,
          count: results.length,
        },
      })
    } catch (error: any) {
      logger.error("Weaviate query error:", error)
      throw new AppError(error.message || "Failed to query Weaviate", 500)
    }
  }

  async getStats(req: AuthenticatedRequest, res: Response) {
    const { url, apiKey } = this.getWeaviateConfig()

    try {
      // Get cluster stats
      const clusterResponse = await fetch(`${url}/v1/nodes`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })

      if (!clusterResponse.ok) {
        throw new AppError("Failed to fetch cluster stats", 500)
      }

      const clusterData = await clusterResponse.json()

      // Get schema information
      const schemaResponse = await fetch(`${url}/v1/schema`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })

      const schemaData = schemaResponse.ok ? await schemaResponse.json() : { classes: [] }

      // Get object counts for each class
      const classCounts = await Promise.all(
        schemaData.classes.map(async (cls: any) => {
          try {
            const countQuery = {
              query: `{
                Aggregate {
                  ${cls.class} {
                    meta {
                      count
                    }
                  }
                }
              }`,
            }

            const countResponse = await fetch(`${url}/v1/graphql`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(countQuery),
            })

            if (countResponse.ok) {
              const countData = await countResponse.json()
              const count = countData.data?.Aggregate?.[cls.class]?.[0]?.meta?.count || 0
              return { className: cls.class, count }
            }
          } catch (error) {
            logger.error(`Failed to get count for class ${cls.class}:`, error)
          }
          return { className: cls.class, count: 0 }
        }),
      )

      res.json({
        success: true,
        data: {
          cluster: clusterData,
          schema: schemaData,
          classCounts,
          totalObjects: classCounts.reduce((sum, cls) => sum + cls.count, 0),
        },
      })
    } catch (error: any) {
      logger.error("Weaviate stats error:", error)
      throw new AppError(error.message || "Failed to fetch Weaviate stats", 500)
    }
  }

  async deleteObjects(req: AuthenticatedRequest, res: Response) {
    const { className } = req.params
    const { url, apiKey } = this.getWeaviateConfig()

    try {
      // Delete all objects in the class
      const deleteQuery = {
        query: `{
          Get {
            ${className} {
              _additional {
                id
              }
            }
          }
        }`,
      }

      const getResponse = await fetch(`${url}/v1/graphql`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deleteQuery),
      })

      if (!getResponse.ok) {
        throw new AppError("Failed to fetch objects for deletion", 500)
      }

      const getData = await getResponse.json()
      const objects = getData.data?.Get?.[className] || []

      // Delete objects in batches
      let deletedCount = 0
      for (const obj of objects) {
        try {
          const deleteResponse = await fetch(`${url}/v1/objects/${obj._additional.id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          })

          if (deleteResponse.ok) {
            deletedCount++
          }
        } catch (error) {
          logger.error(`Failed to delete object ${obj._additional.id}:`, error)
        }
      }

      res.json({
        success: true,
        data: {
          className,
          deletedCount,
          totalObjects: objects.length,
        },
      })
    } catch (error: any) {
      logger.error("Weaviate delete error:", error)
      throw new AppError(error.message || "Failed to delete objects", 500)
    }
  }

  async getSchema(req: AuthenticatedRequest, res: Response) {
    const { url, apiKey } = this.getWeaviateConfig()

    try {
      const response = await fetch(`${url}/v1/schema`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })

      if (!response.ok) {
        throw new AppError("Failed to fetch schema", 500)
      }

      const schema = await response.json()

      res.json({
        success: true,
        data: schema,
      })
    } catch (error: any) {
      logger.error("Weaviate schema error:", error)
      throw new AppError(error.message || "Failed to fetch schema", 500)
    }
  }

  async updateSchema(req: AuthenticatedRequest, res: Response) {
    const { className, properties } = req.body
    const { url, apiKey } = this.getWeaviateConfig()

    try {
      const classSchema = {
        class: className,
        description: `Class for ${className} with embeddings`,
        vectorizer: "none",
        properties: properties || [
          {
            name: "title",
            dataType: ["text"],
            description: "Title of the content",
          },
          {
            name: "content",
            dataType: ["text"],
            description: "Main content text",
          },
          {
            name: "url",
            dataType: ["text"],
            description: "Source URL",
          },
          {
            name: "source",
            dataType: ["text"],
            description: "Source of the data",
          },
        ],
      }

      const response = await fetch(`${url}/v1/schema`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(classSchema),
      })

      if (!response.ok && response.status !== 422) {
        // 422 means class already exists
        throw new AppError("Failed to create/update schema", 500)
      }

      res.json({
        success: true,
        data: {
          className,
          message: response.status === 422 ? "Class already exists" : "Class created successfully",
        },
      })
    } catch (error: any) {
      logger.error("Weaviate schema update error:", error)
      throw new AppError(error.message || "Failed to update schema", 500)
    }
  }
}
