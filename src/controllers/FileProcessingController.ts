import type { Response } from "express"
import { supabase } from "../config/database"
import type { AuthenticatedRequest } from "../middleware/auth"
import { AppError } from "../middleware/errorHandler"
import { logger } from "../utils/logger"

export class FileProcessingController {
  async getAll(req: AuthenticatedRequest, res: Response) {
    const { page = 1, limit = 20, sortBy = "created_at", sortOrder = "desc" } = req.query
    const { status, search } = req.query

    let query = supabase
      .from("file_processing")
      .select(
        `
        *,
        smart_tags (
          id,
          tag_name,
          tag_category,
          confidence_score
        )
      `,
        { count: "exact" },
      )
      .eq("user_id", req.user!.id)

    // Apply filters
    if (status) {
      query = query.eq("status", status)
    }

    if (search) {
      query = query.or(`file_name.ilike.%${search}%,content_title.ilike.%${search}%`)
    }

    // Apply sorting
    query = query.order(sortBy as string, { ascending: sortOrder === "asc" })

    // Apply pagination
    const from = (Number(page) - 1) * Number(limit)
    const to = from + Number(limit) - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      throw new AppError("Failed to fetch file processing records", 500)
    }

    res.json({
      success: true,
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / Number(limit)),
      },
    })
  }

  async getById(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params

    const { data, error } = await supabase
      .from("file_processing")
      .select(`
        *,
        smart_tags (*),
        file_extraction_queue (*)
      `)
      .eq("id", id)
      .eq("user_id", req.user!.id)
      .single()

    if (error || !data) {
      throw new AppError("File processing record not found", 404)
    }

    res.json({
      success: true,
      data,
    })
  }

  async create(req: AuthenticatedRequest, res: Response) {
    const { fileName, fileSize, mimeType, googleDriveFileId } = req.body

    const { data, error } = await supabase
      .from("file_processing")
      .insert({
        file_name: fileName,
        file_size: fileSize,
        mime_type: mimeType,
        google_drive_file_id: googleDriveFileId,
        user_id: req.user!.id,
        status: "pending",
      })
      .select()
      .single()

    if (error) {
      logger.error("Failed to create file processing record:", error)
      throw new AppError("Failed to create file processing record", 500)
    }

    // Trigger file extraction
    try {
      await supabase.functions.invoke("file-extractor", {
        body: {
          fileProcessingId: data.id,
          storagePath: `user-files/${req.user!.id}/${googleDriveFileId}`,
          fileType: mimeType,
          fileName: fileName,
        },
      })
    } catch (extractionError) {
      logger.error("Failed to trigger file extraction:", extractionError)
      // Don't fail the request, just log the error
    }

    res.status(201).json({
      success: true,
      data,
    })
  }

  async update(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params
    const updateData = req.body

    const { data, error } = await supabase
      .from("file_processing")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", req.user!.id)
      .select()
      .single()

    if (error || !data) {
      throw new AppError("Failed to update file processing record", 500)
    }

    res.json({
      success: true,
      data,
    })
  }

  async delete(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params

    // First check if record exists and belongs to user
    const { data: existingRecord } = await supabase
      .from("file_processing")
      .select("id")
      .eq("id", id)
      .eq("user_id", req.user!.id)
      .single()

    if (!existingRecord) {
      throw new AppError("File processing record not found", 404)
    }

    const { error } = await supabase.from("file_processing").delete().eq("id", id).eq("user_id", req.user!.id)

    if (error) {
      throw new AppError("Failed to delete file processing record", 500)
    }

    res.json({
      success: true,
      message: "File processing record deleted successfully",
    })
  }

  async getStats(req: AuthenticatedRequest, res: Response) {
    const { data: stats } = await supabase.from("file_processing").select("status").eq("user_id", req.user!.id)

    if (!stats) {
      throw new AppError("Failed to fetch statistics", 500)
    }

    const statusCounts = stats.reduce((acc: any, record) => {
      acc[record.status || "unknown"] = (acc[record.status || "unknown"] || 0) + 1
      return acc
    }, {})

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: recentActivity } = await supabase
      .from("file_processing")
      .select("created_at, status")
      .eq("user_id", req.user!.id)
      .gte("created_at", sevenDaysAgo.toISOString())

    res.json({
      success: true,
      data: {
        total: stats.length,
        statusCounts,
        recentActivity: recentActivity || [],
      },
    })
  }

  async retry(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params

    // Check if record exists and is in failed state
    const { data: record, error: fetchError } = await supabase
      .from("file_processing")
      .select("*")
      .eq("id", id)
      .eq("user_id", req.user!.id)
      .single()

    if (fetchError || !record) {
      throw new AppError("File processing record not found", 404)
    }

    if (record.status !== "failed") {
      throw new AppError("Only failed records can be retried", 400)
    }

    // Reset status and retry
    const { data, error } = await supabase
      .from("file_processing")
      .update({
        status: "pending",
        error_message: null,
        retry_count: (record.retry_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      throw new AppError("Failed to retry file processing", 500)
    }

    // Trigger file extraction again
    try {
      await supabase.functions.invoke("file-extractor", {
        body: {
          fileProcessingId: id,
          storagePath: record.file_path,
          fileType: record.mime_type,
          fileName: record.file_name,
        },
      })
    } catch (extractionError) {
      logger.error("Failed to trigger file extraction retry:", extractionError)
    }

    res.json({
      success: true,
      data,
    })
  }

  async bulkDelete(req: AuthenticatedRequest, res: Response) {
    const { ids } = req.body

    if (!Array.isArray(ids) || ids.length === 0) {
      throw new AppError("Invalid or empty IDs array", 400)
    }

    const { error } = await supabase.from("file_processing").delete().in("id", ids).eq("user_id", req.user!.id)

    if (error) {
      throw new AppError("Failed to delete records", 500)
    }

    res.json({
      success: true,
      message: `Successfully deleted ${ids.length} records`,
    })
  }

  async bulkRetry(req: AuthenticatedRequest, res: Response) {
    const { ids } = req.body

    if (!Array.isArray(ids) || ids.length === 0) {
      throw new AppError("Invalid or empty IDs array", 400)
    }

    const { data, error } = await supabase
      .from("file_processing")
      .update({
        status: "pending",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .in("id", ids)
      .eq("user_id", req.user!.id)
      .eq("status", "failed")
      .select()

    if (error) {
      throw new AppError("Failed to retry records", 500)
    }

    res.json({
      success: true,
      message: `Successfully queued ${data?.length || 0} records for retry`,
      data,
    })
  }
}
