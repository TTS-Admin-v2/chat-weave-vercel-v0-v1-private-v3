import type { Response } from "express"
import { supabase } from "../config/database"
import type { AuthenticatedRequest } from "../middleware/auth"
import { AppError } from "../middleware/errorHandler"
import { logger } from "../utils/logger"

export class ChatController {
  async sendMessage(req: AuthenticatedRequest, res: Response) {
    const { message, conversationId, history = [] } = req.body
    let currentConversationId = conversationId

    try {
      // Create conversation if it doesn't exist
      if (!currentConversationId) {
        const { data: newConversation, error: conversationError } = await supabase
          .from("chat_conversations")
          .insert({
            user_id: req.user!.id,
            title: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
          })
          .select()
          .single()

        if (conversationError) {
          throw new AppError("Failed to create conversation", 500)
        }

        currentConversationId = newConversation.id
      }

      // Save user message
      const { error: userMessageError } = await supabase.from("chat_messages").insert({
        conversation_id: currentConversationId,
        content: message,
        is_user: true,
      })

      if (userMessageError) {
        throw new AppError("Failed to save user message", 500)
      }

      // Get AI response from Weaviate chat function
      const { data: chatResponse, error: chatError } = await supabase.functions.invoke("weaviate-chat", {
        body: { message, history },
      })

      if (chatError || !chatResponse.success) {
        throw new AppError("Failed to get AI response", 500)
      }

      // Save AI response
      const { error: aiMessageError } = await supabase.from("chat_messages").insert({
        conversation_id: currentConversationId,
        content: chatResponse.response,
        is_user: false,
      })

      if (aiMessageError) {
        throw new AppError("Failed to save AI response", 500)
      }

      res.json({
        success: true,
        data: {
          conversationId: currentConversationId,
          response: chatResponse.response,
          relevantDocuments: chatResponse.relevantDocuments,
          sources: chatResponse.sources,
        },
      })
    } catch (error: any) {
      logger.error("Chat error:", error)
      throw new AppError(error.message || "Failed to process chat message", 500)
    }
  }

  async getConversations(req: AuthenticatedRequest, res: Response) {
    const { data, error } = await supabase
      .from("chat_conversations")
      .select(`
        *,
        chat_messages (
          content,
          created_at,
          is_user
        )
      `)
      .eq("user_id", req.user!.id)
      .order("updated_at", { ascending: false })

    if (error) {
      throw new AppError("Failed to fetch conversations", 500)
    }

    // Add last message to each conversation
    const conversationsWithLastMessage = data.map((conversation) => ({
      ...conversation,
      lastMessage: conversation.chat_messages[conversation.chat_messages.length - 1] || null,
      messageCount: conversation.chat_messages.length,
      chat_messages: undefined, // Remove full messages array
    }))

    res.json({
      success: true,
      data: conversationsWithLastMessage,
    })
  }

  async getConversationMessages(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params

    // Verify conversation belongs to user
    const { data: conversation } = await supabase
      .from("chat_conversations")
      .select("id")
      .eq("id", id)
      .eq("user_id", req.user!.id)
      .single()

    if (!conversation) {
      throw new AppError("Conversation not found", 404)
    }

    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })

    if (error) {
      throw new AppError("Failed to fetch messages", 500)
    }

    res.json({
      success: true,
      data,
    })
  }

  async createConversation(req: AuthenticatedRequest, res: Response) {
    const { title } = req.body

    const { data, error } = await supabase
      .from("chat_conversations")
      .insert({
        user_id: req.user!.id,
        title: title || "New Conversation",
      })
      .select()
      .single()

    if (error) {
      throw new AppError("Failed to create conversation", 500)
    }

    res.status(201).json({
      success: true,
      data,
    })
  }

  async deleteConversation(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params

    // Verify conversation belongs to user
    const { data: conversation } = await supabase
      .from("chat_conversations")
      .select("id")
      .eq("id", id)
      .eq("user_id", req.user!.id)
      .single()

    if (!conversation) {
      throw new AppError("Conversation not found", 404)
    }

    const { error } = await supabase.from("chat_conversations").delete().eq("id", id)

    if (error) {
      throw new AppError("Failed to delete conversation", 500)
    }

    res.json({
      success: true,
      message: "Conversation deleted successfully",
    })
  }
}
