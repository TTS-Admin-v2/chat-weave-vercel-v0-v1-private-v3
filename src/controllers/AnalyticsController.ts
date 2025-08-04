import type { Response } from "express"
import { supabase } from "../config/database"
import type { AuthenticatedRequest } from "../middleware/auth"
import { AppError } from "../middleware/errorHandler"
import { logger } from "../utils/logger"

export class AnalyticsController {
  async getDashboard(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id

      // Get file processing stats
      const { data: fileStats } = await supabase.from("file_processing").select("status").eq("user_id", userId)

      // Get chat stats
      const { data: chatStats } = await supabase
        .from("chat_conversations")
        .select("id, created_at")
        .eq("user_id", userId)

      // Get recent activity
      const { data: recentActivity } = await supabase
        .from("file_processing")
        .select("file_name, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10)

      // Process file stats
      const fileStatusCounts =
        fileStats?.reduce((acc: any, file) => {
          acc[file.status || "unknown"] = (acc[file.status || "unknown"] || 0) + 1
          return acc
        }, {}) || {}

      // Calculate chat metrics
      const totalConversations = chatStats?.length || 0
      const thisWeek = new Date()
      thisWeek.setDate(thisWeek.getDate() - 7)

      const conversationsThisWeek = chatStats?.filter((chat) => new Date(chat.created_at) > thisWeek).length || 0

      res.json({
        success: true,
        data: {
          fileProcessing: {
            total: fileStats?.length || 0,
            statusCounts: fileStatusCounts,
          },
          chat: {
            totalConversations,
            conversationsThisWeek,
          },
          recentActivity: recentActivity || [],
        },
      })
    } catch (error: any) {
      logger.error("Dashboard analytics error:", error)
      throw new AppError(error.message || "Failed to fetch dashboard data", 500)
    }
  }

  async getProcessingStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id
      const { timeRange = "7d" } = req.query

      const dateFilter = new Date()
      switch (timeRange) {
        case "24h":
          dateFilter.setHours(dateFilter.getHours() - 24)
          break
        case "7d":
          dateFilter.setDate(dateFilter.getDate() - 7)
          break
        case "30d":
          dateFilter.setDate(dateFilter.getDate() - 30)
          break
        default:
          dateFilter.setDate(dateFilter.getDate() - 7)
      }

      const { data: processingData } = await supabase
        .from("file_processing")
        .select("status, created_at, file_size, mime_type")
        .eq("user_id", userId)
        .gte("created_at", dateFilter.toISOString())

      // Group by date
      const dailyStats =
        processingData?.reduce((acc: any, record) => {
          const date = new Date(record.created_at).toISOString().split("T")[0]
          if (!acc[date]) {
            acc[date] = {
              date,
              total: 0,
              completed: 0,
              failed: 0,
              pending: 0,
              processing: 0,
              totalSize: 0,
            }
          }
          acc[date].total++
          acc[date][record.status || "unknown"]++
          acc[date].totalSize += record.file_size || 0
          return acc
        }, {}) || {}

      // File type distribution
      const fileTypes =
        processingData?.reduce((acc: any, record) => {
          const type = record.mime_type || "unknown"
          acc[type] = (acc[type] || 0) + 1
          return acc
        }, {}) || {}

      res.json({
        success: true,
        data: {
          dailyStats: Object.values(dailyStats),
          fileTypes,
          totalFiles: processingData?.length || 0,
          totalSize: processingData?.reduce((sum, record) => sum + (record.file_size || 0), 0) || 0,
        },
      })
    } catch (error: any) {
      logger.error("Processing stats error:", error)
      throw new AppError(error.message || "Failed to fetch processing stats", 500)
    }
  }

  async getChatStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id

      // Get conversation stats
      const { data: conversations } = await supabase
        .from("chat_conversations")
        .select(`
          id,
          created_at,
          updated_at,
          chat_messages (
            id,
            created_at,
            is_user
          )
        `)
        .eq("user_id", userId)

      // Calculate metrics
      const totalConversations = conversations?.length || 0
      const totalMessages = conversations?.reduce((sum, conv) => sum + (conv.chat_messages?.length || 0), 0) || 0

      const userMessages =
        conversations?.reduce((sum, conv) => sum + (conv.chat_messages?.filter((msg) => msg.is_user).length || 0), 0) ||
        0

      const aiMessages = totalMessages - userMessages

      // Daily message counts
      const last30Days = new Date()
      last30Days.setDate(last30Days.getDate() - 30)

      const dailyMessages =
        conversations?.reduce((acc: any, conv) => {
          conv.chat_messages?.forEach((msg) => {
            const date = new Date(msg.created_at).toISOString().split("T")[0]
            if (new Date(msg.created_at) > last30Days) {
              if (!acc[date]) {
                acc[date] = { date, userMessages: 0, aiMessages: 0, total: 0 }
              }
              if (msg.is_user) {
                acc[date].userMessages++
              } else {
                acc[date].aiMessages++
              }
              acc[date].total++
            }
          })
          return acc
        }, {}) || {}

      res.json({
        success: true,
        data: {
          totalConversations,
          totalMessages,
          userMessages,
          aiMessages,
          averageMessagesPerConversation: totalConversations > 0 ? totalMessages / totalConversations : 0,
          dailyMessages: Object.values(dailyMessages),
        },
      })
    } catch (error: any) {
      logger.error("Chat stats error:", error)
      throw new AppError(error.message || "Failed to fetch chat stats", 500)
    }
  }

  async getTrends(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id
      const { metric = "files", period = "daily" } = req.query

      const last30Days = new Date()
      last30Days.setDate(last30Days.getDate() - 30)

      let data: any[] = []

      if (metric === "files") {
        const { data: fileData } = await supabase
          .from("file_processing")
          .select("created_at, status")
          .eq("user_id", userId)
          .gte("created_at", last30Days.toISOString())

        data = fileData || []
      } else if (metric === "chats") {
        const { data: chatData } = await supabase
          .from("chat_messages")
          .select(`
            created_at,
            is_user,
            conversation:chat_conversations!inner(user_id)
          `)
          .eq("conversation.user_id", userId)
          .gte("created_at", last30Days.toISOString())

        data = chatData || []
      }

      // Group by period
      const trends = data.reduce((acc: any, record) => {
        let key: string
        const date = new Date(record.created_at)

        if (period === "daily") {
          key = date.toISOString().split("T")[0]
        } else if (period === "weekly") {
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          key = weekStart.toISOString().split("T")[0]
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        }

        if (!acc[key]) {
          acc[key] = { period: key, count: 0, data: [] }
        }
        acc[key].count++
        acc[key].data.push(record)
        return acc
      }, {})

      res.json({
        success: true,
        data: {
          metric,
          period,
          trends: Object.values(trends).sort((a: any, b: any) => a.period.localeCompare(b.period)),
        },
      })
    } catch (error: any) {
      logger.error("Trends error:", error)
      throw new AppError(error.message || "Failed to fetch trends", 500)
    }
  }
}
