import type { Response } from "express"
import { supabase } from "../config/database"
import type { AuthenticatedRequest } from "../middleware/auth"
import { AppError } from "../middleware/errorHandler"
import { logger } from "../utils/logger"

export class ToolConnectionController {
  async getAll(req: AuthenticatedRequest, res: Response) {
    try {
      // Check various tool connections
      const connections = {
        supabase: {
          name: "Supabase",
          status: "connected",
          lastChecked: new Date().toISOString(),
        },
        weaviate: {
          name: "Weaviate",
          status: process.env.WEAVIATE_URL ? "connected" : "disconnected",
          lastChecked: new Date().toISOString(),
        },
        firecrawl: {
          name: "Firecrawl",
          status: process.env.FIRECRAWL_API_KEY ? "connected" : "disconnected",
          lastChecked: new Date().toISOString(),
        },
        openai: {
          name: "OpenAI",
          status: process.env.OPENAI_API_KEY ? "connected" : "disconnected",
          lastChecked: new Date().toISOString(),
        },
      }

      res.json({
        success: true,
        data: connections,
      })
    } catch (error: any) {
      logger.error("Tool connections error:", error)
      throw new AppError(error.message || "Failed to fetch tool connections", 500)
    }
  }

  async testConnection(req: AuthenticatedRequest, res: Response) {
    const { tool } = req.body

    if (!tool) {
      throw new AppError("Tool name is required", 400)
    }

    try {
      let result = { connected: false, message: "", details: {} }

      switch (tool.toLowerCase()) {
        case "supabase":
          try {
            const { data, error } = await supabase.from("profiles").select("count").limit(1)
            result = {
              connected: !error,
              message: error ? error.message : "Connection successful",
              details: { data },
            }
          } catch (error: any) {
            result = {
              connected: false,
              message: error.message,
              details: {},
            }
          }
          break

        case "weaviate":
          if (!process.env.WEAVIATE_URL || !process.env.WEAVIATE_API_KEY) {
            result = {
              connected: false,
              message: "Weaviate configuration missing",
              details: {},
            }
          } else {
            try {
              const response = await fetch(`${process.env.WEAVIATE_URL}/v1/meta`, {
                headers: {
                  Authorization: `Bearer ${process.env.WEAVIATE_API_KEY}`,
                },
              })
              result = {
                connected: response.ok,
                message: response.ok ? "Connection successful" : "Connection failed",
                details: response.ok ? await response.json() : {},
              }
            } catch (error: any) {
              result = {
                connected: false,
                message: error.message,
                details: {},
              }
            }
          }
          break

        case "firecrawl":
          if (!process.env.FIRECRAWL_API_KEY) {
            result = {
              connected: false,
              message: "Firecrawl API key missing",
              details: {},
            }
          } else {
            try {
              const response = await fetch("https://api.firecrawl.dev/v0/crawl", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  url: "https://example.com",
                  crawlerOptions: { limit: 1 },
                }),
              })
              result = {
                connected: response.status !== 401,
                message: response.status !== 401 ? "API key valid" : "Invalid API key",
                details: { status: response.status },
              }
            } catch (error: any) {
              result = {
                connected: false,
                message: error.message,
                details: {},
              }
            }
          }
          break

        default:
          throw new AppError("Unknown tool", 400)
      }

      res.json({
        success: true,
        data: {
          tool,
          ...result,
          testedAt: new Date().toISOString(),
        },
      })
    } catch (error: any) {
      logger.error("Connection test error:", error)
      throw new AppError(error.message || "Failed to test connection", 500)
    }
  }

  async firecrawlScrape(req: AuthenticatedRequest, res: Response) {
    const { url, options = {} } = req.body

    if (!url) {
      throw new AppError("URL is required", 400)
    }

    try {
      const { data, error } = await supabase.functions.invoke("firecrawl-scraper", {
        body: { url, options },
      })

      if (error) {
        throw new AppError(`Firecrawl scraping failed: ${error.message}`, 500)
      }

      res.json({
        success: true,
        data,
      })
    } catch (error: any) {
      logger.error("Firecrawl scrape error:", error)
      throw new AppError(error.message || "Failed to scrape URL", 500)
    }
  }

  async firecrawlSearch(req: AuthenticatedRequest, res: Response) {
    const { query, options = {} } = req.body

    if (!query) {
      throw new AppError("Search query is required", 400)
    }

    try {
      const { data, error } = await supabase.functions.invoke("firecrawl-search", {
        body: { query, options },
      })

      if (error) {
        throw new AppError(`Firecrawl search failed: ${error.message}`, 500)
      }

      res.json({
        success: true,
        data,
      })
    } catch (error: any) {
      logger.error("Firecrawl search error:", error)
      throw new AppError(error.message || "Failed to search", 500)
    }
  }

  async firecrawlExtract(req: AuthenticatedRequest, res: Response) {
    const { url, schema, options = {} } = req.body

    if (!url) {
      throw new AppError("URL is required", 400)
    }

    try {
      const { data, error } = await supabase.functions.invoke("firecrawl-extract", {
        body: { url, schema, options },
      })

      if (error) {
        throw new AppError(`Firecrawl extraction failed: ${error.message}`, 500)
      }

      res.json({
        success: true,
        data,
      })
    } catch (error: any) {
      logger.error("Firecrawl extract error:", error)
      throw new AppError(error.message || "Failed to extract data", 500)
    }
  }

  async getGoogleDriveFiles(req: AuthenticatedRequest, res: Response) {
    try {
      // This would typically integrate with Google Drive API
      // For now, return mock data or integrate with your existing Google Drive functionality

      res.json({
        success: true,
        data: {
          files: [],
          message: "Google Drive integration not yet implemented in API",
        },
      })
    } catch (error: any) {
      logger.error("Google Drive files error:", error)
      throw new AppError(error.message || "Failed to fetch Google Drive files", 500)
    }
  }

  async uploadToGoogleDrive(req: AuthenticatedRequest, res: Response) {
    const { fileName, fileData, folderId } = req.body

    try {
      // This would typically integrate with Google Drive API
      // For now, return mock response

      res.json({
        success: true,
        data: {
          fileId: "mock-file-id",
          fileName,
          message: "Google Drive upload not yet implemented in API",
        },
      })
    } catch (error: any) {
      logger.error("Google Drive upload error:", error)
      throw new AppError(error.message || "Failed to upload to Google Drive", 500)
    }
  }
}
