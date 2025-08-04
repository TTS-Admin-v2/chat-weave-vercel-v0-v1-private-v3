import type { Response } from "express"
import { supabase } from "../config/database"
import type { AuthenticatedRequest } from "../middleware/auth"
import { AppError } from "../middleware/errorHandler"
import { logger } from "../utils/logger"
import { v4 as uuidv4 } from "uuid"

export class WorkflowController {
  async getAll(req: AuthenticatedRequest, res: Response) {
    try {
      // For now, return predefined workflows
      // In a full implementation, these would be stored in the database
      const workflows = [
        {
          id: "scrape-and-embed",
          name: "Scrape and Embed",
          description: "Scrape a website and create embeddings",
          steps: [
            { type: "firecrawl_scrape", name: "Scrape Website" },
            { type: "create_embeddings", name: "Create Embeddings" },
            { type: "upload_weaviate", name: "Upload to Weaviate" },
          ],
          createdAt: new Date().toISOString(),
        },
        {
          id: "file-process-embed",
          name: "File Processing Pipeline",
          description: "Process uploaded files and create embeddings",
          steps: [
            { type: "extract_file", name: "Extract File Content" },
            { type: "smart_tagging", name: "Generate Smart Tags" },
            { type: "create_embeddings", name: "Create Embeddings" },
            { type: "upload_weaviate", name: "Upload to Weaviate" },
          ],
          createdAt: new Date().toISOString(),
        },
      ]

      res.json({
        success: true,
        data: workflows,
      })
    } catch (error: any) {
      logger.error("Workflows fetch error:", error)
      throw new AppError(error.message || "Failed to fetch workflows", 500)
    }
  }

  async create(req: AuthenticatedRequest, res: Response) {
    const { name, description, steps } = req.body

    if (!name || !steps || !Array.isArray(steps)) {
      throw new AppError("Name and steps array are required", 400)
    }

    try {
      const workflow = {
        id: uuidv4(),
        name,
        description: description || "",
        steps,
        userId: req.user!.id,
        createdAt: new Date().toISOString(),
      }

      // In a full implementation, save to database
      // For now, just return the created workflow

      res.status(201).json({
        success: true,
        data: workflow,
      })
    } catch (error: any) {
      logger.error("Workflow creation error:", error)
      throw new AppError(error.message || "Failed to create workflow", 500)
    }
  }

  async execute(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params
    const { input = {} } = req.body

    try {
      const executionId = uuidv4()
      const startTime = new Date()

      // Mock workflow execution
      let result: any = { success: true, steps: [] }

      switch (id) {
        case "scrape-and-embed":
          result = await this.executeScrapeAndEmbed(input)
          break
        case "file-process-embed":
          result = await this.executeFileProcessEmbed(input)
          break
        default:
          throw new AppError("Workflow not found", 404)
      }

      const endTime = new Date()
      const duration = endTime.getTime() - startTime.getTime()

      res.json({
        success: true,
        data: {
          executionId,
          workflowId: id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration,
          result,
        },
      })
    } catch (error: any) {
      logger.error("Workflow execution error:", error)
      throw new AppError(error.message || "Failed to execute workflow", 500)
    }
  }

  async getExecutions(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params

    try {
      // In a full implementation, fetch from database
      // For now, return mock data
      const executions = [
        {
          id: uuidv4(),
          workflowId: id,
          status: "completed",
          startTime: new Date(Date.now() - 3600000).toISOString(),
          endTime: new Date(Date.now() - 3500000).toISOString(),
          duration: 100000,
        },
        {
          id: uuidv4(),
          workflowId: id,
          status: "failed",
          startTime: new Date(Date.now() - 7200000).toISOString(),
          endTime: new Date(Date.now() - 7100000).toISOString(),
          duration: 100000,
          error: "Network timeout",
        },
      ]

      res.json({
        success: true,
        data: executions,
      })
    } catch (error: any) {
      logger.error("Workflow executions error:", error)
      throw new AppError(error.message || "Failed to fetch workflow executions", 500)
    }
  }

  private async executeScrapeAndEmbed(input: any) {
    const { url } = input

    if (!url) {
      throw new AppError("URL is required for scrape and embed workflow", 400)
    }

    try {
      // Step 1: Scrape website
      const { data: scrapeData, error: scrapeError } = await supabase.functions.invoke("firecrawl-scraper", {
        body: { url },
      })

      if (scrapeError) {
        throw new AppError(`Scraping failed: ${scrapeError.message}`, 500)
      }

      // Step 2: Create embeddings
      const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke("create-embeddings", {
        body: { text: scrapeData.content },
      })

      if (embeddingError) {
        throw new AppError(`Embedding creation failed: ${embeddingError.message}`, 500)
      }

      // Step 3: Upload to Weaviate
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke("weaviate-upload", {
        body: {
          className: "ScrapedContent",
          objects: [
            {
              title: scrapeData.title,
              content: scrapeData.content,
              url: url,
              source: "firecrawl",
              vector: embeddingData.embedding,
            },
          ],
        },
      })

      if (uploadError) {
        throw new AppError(`Weaviate upload failed: ${uploadError.message}`, 500)
      }

      return {
        success: true,
        steps: [
          { name: "Scrape Website", status: "completed", data: scrapeData },
          { name: "Create Embeddings", status: "completed", data: { dimensions: embeddingData.embedding.length } },
          { name: "Upload to Weaviate", status: "completed", data: uploadData },
        ],
      }
    } catch (error: any) {
      logger.error("Scrape and embed workflow error:", error)
      throw error
    }
  }

  private async executeFileProcessEmbed(input: any) {
    const { fileProcessingId } = input

    if (!fileProcessingId) {
      throw new AppError("File processing ID is required", 400)
    }

    try {
      // Get file processing record
      const { data: fileRecord, error: fetchError } = await supabase
        .from("file_processing")
        .select("*")
        .eq("id", fileProcessingId)
        .single()

      if (fetchError || !fileRecord) {
        throw new AppError("File processing record not found", 404)
      }

      // Step 1: Extract file content (if not already done)
      if (!fileRecord.content_text) {
        const { data: extractData, error: extractError } = await supabase.functions.invoke("file-extractor", {
          body: {
            fileProcessingId,
            storagePath: fileRecord.file_path,
            fileType: fileRecord.mime_type,
            fileName: fileRecord.file_name,
          },
        })

        if (extractError) {
          throw new AppError(`File extraction failed: ${extractError.message}`, 500)
        }
      }

      // Step 2: Generate smart tags
      const { data: taggingData, error: taggingError } = await supabase.functions.invoke("smart-tagging", {
        body: {
          fileProcessingId,
          content: fileRecord.content_text,
        },
      })

      if (taggingError) {
        logger.warn("Smart tagging failed:", taggingError)
      }

      // Step 3: Create embeddings
      const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke("create-embeddings", {
        body: { text: fileRecord.content_text },
      })

      if (embeddingError) {
        throw new AppError(`Embedding creation failed: ${embeddingError.message}`, 500)
      }

      // Step 4: Upload to Weaviate
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke("weaviate-upload", {
        body: {
          className: "ProcessedFiles",
          objects: [
            {
              title: fileRecord.content_title || fileRecord.file_name,
              content: fileRecord.content_text,
              fileName: fileRecord.file_name,
              mimeType: fileRecord.mime_type,
              source: "file_upload",
              vector: embeddingData.embedding,
            },
          ],
        },
      })

      if (uploadError) {
        throw new AppError(`Weaviate upload failed: ${uploadError.message}`, 500)
      }

      return {
        success: true,
        steps: [
          {
            name: "Extract File Content",
            status: "completed",
            data: { contentLength: fileRecord.content_text?.length },
          },
          { name: "Generate Smart Tags", status: taggingError ? "failed" : "completed", data: taggingData },
          { name: "Create Embeddings", status: "completed", data: { dimensions: embeddingData.embedding.length } },
          { name: "Upload to Weaviate", status: "completed", data: uploadData },
        ],
      }
    } catch (error: any) {
      logger.error("File process embed workflow error:", error)
      throw error
    }
  }
}
