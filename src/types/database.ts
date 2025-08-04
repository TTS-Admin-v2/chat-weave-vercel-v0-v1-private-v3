export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      file_processing: {
        Row: {
          id: string
          user_id: string
          file_name: string
          file_size: number | null
          mime_type: string | null
          file_path: string | null
          google_drive_file_id: string | null
          status: string | null
          content_title: string | null
          content_text: string | null
          error_message: string | null
          retry_count: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          file_name: string
          file_size?: number | null
          mime_type?: string | null
          file_path?: string | null
          google_drive_file_id?: string | null
          status?: string | null
          content_title?: string | null
          content_text?: string | null
          error_message?: string | null
          retry_count?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          file_name?: string
          file_size?: number | null
          mime_type?: string | null
          file_path?: string | null
          google_drive_file_id?: string | null
          status?: string | null
          content_title?: string | null
          content_text?: string | null
          error_message?: string | null
          retry_count?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      smart_tags: {
        Row: {
          id: string
          file_processing_id: string
          tag_name: string
          tag_category: string | null
          confidence_score: number | null
          created_at: string
        }
        Insert: {
          id?: string
          file_processing_id: string
          tag_name: string
          tag_category?: string | null
          confidence_score?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          file_processing_id?: string
          tag_name?: string
          tag_category?: string | null
          confidence_score?: number | null
          created_at?: string
        }
      }
      chat_conversations: {
        Row: {
          id: string
          user_id: string
          title: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          created_at?: string
          updated_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          conversation_id: string
          content: string
          is_user: boolean
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          content: string
          is_user: boolean
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          content?: string
          is_user?: boolean
          created_at?: string
        }
      }
      file_extraction_queue: {
        Row: {
          id: string
          file_processing_id: string
          status: string
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          file_processing_id: string
          status: string
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          file_processing_id?: string
          status?: string
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_embeddings: {
        Args: {
          query_embedding: number[]
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          content: string
          similarity: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
