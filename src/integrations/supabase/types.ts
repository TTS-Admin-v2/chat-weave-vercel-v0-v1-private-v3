export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_user: boolean
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_user?: boolean
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_user?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      documentation_content: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          embedding: string | null
          id: string
          source_id: string
        }
        Insert: {
          chunk_index?: number
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          source_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentation_content_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "documentation_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      documentation_sources: {
        Row: {
          created_at: string
          id: string
          status: string
          title: string | null
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          title?: string | null
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          title?: string | null
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      file_extraction_queue: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          extraction_type: string | null
          file_processing_id: string
          file_type: string | null
          id: string
          progress: number | null
          started_at: string | null
          status: string | null
          storage_path: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          extraction_type?: string | null
          file_processing_id: string
          file_type?: string | null
          id?: string
          progress?: number | null
          started_at?: string | null
          status?: string | null
          storage_path: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          extraction_type?: string | null
          file_processing_id?: string
          file_type?: string | null
          id?: string
          progress?: number | null
          started_at?: string | null
          status?: string | null
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_extraction_queue_file_processing_id_fkey"
            columns: ["file_processing_id"]
            isOneToOne: false
            referencedRelation: "file_processing"
            referencedColumns: ["id"]
          },
        ]
      }
      file_processing: {
        Row: {
          content_text: string | null
          content_title: string | null
          content_url: string | null
          created_at: string | null
          embedding_data: Json | null
          error_message: string | null
          extracted_content: Json | null
          extraction_status: string | null
          file_name: string
          file_path: string | null
          file_size: number | null
          google_drive_file_id: string
          guru_card_id: string | null
          id: string
          mime_type: string | null
          original_file_name: string | null
          processing_completed_at: string | null
          processing_started_at: string | null
          retry_count: number | null
          status: Database["public"]["Enums"]["processing_status"] | null
          weaviate_object_id: string | null
          workflow_config_id: string | null
        }
        Insert: {
          content_text?: string | null
          content_title?: string | null
          content_url?: string | null
          created_at?: string | null
          embedding_data?: Json | null
          error_message?: string | null
          extracted_content?: Json | null
          extraction_status?: string | null
          file_name: string
          file_path?: string | null
          file_size?: number | null
          google_drive_file_id: string
          guru_card_id?: string | null
          id?: string
          mime_type?: string | null
          original_file_name?: string | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          retry_count?: number | null
          status?: Database["public"]["Enums"]["processing_status"] | null
          weaviate_object_id?: string | null
          workflow_config_id?: string | null
        }
        Update: {
          content_text?: string | null
          content_title?: string | null
          content_url?: string | null
          created_at?: string | null
          embedding_data?: Json | null
          error_message?: string | null
          extracted_content?: Json | null
          extraction_status?: string | null
          file_name?: string
          file_path?: string | null
          file_size?: number | null
          google_drive_file_id?: string
          guru_card_id?: string | null
          id?: string
          mime_type?: string | null
          original_file_name?: string | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          retry_count?: number | null
          status?: Database["public"]["Enums"]["processing_status"] | null
          weaviate_object_id?: string | null
          workflow_config_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_processing_workflow_config_id_fkey"
            columns: ["workflow_config_id"]
            isOneToOne: false
            referencedRelation: "workflow_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          google_access_token: string | null
          google_refresh_token: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          google_access_token?: string | null
          google_refresh_token?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          google_access_token?: string | null
          google_refresh_token?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      smart_tags: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          extracted_entities: Json | null
          file_processing_id: string | null
          id: string
          tag_category: string | null
          tag_description: string | null
          tag_name: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          extracted_entities?: Json | null
          file_processing_id?: string | null
          id?: string
          tag_category?: string | null
          tag_description?: string | null
          tag_name: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          extracted_entities?: Json | null
          file_processing_id?: string | null
          id?: string
          tag_category?: string | null
          tag_description?: string | null
          tag_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_tags_file_processing_id_fkey"
            columns: ["file_processing_id"]
            isOneToOne: false
            referencedRelation: "file_processing"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_connections: {
        Row: {
          connection_config: Json | null
          connection_name: string
          created_at: string
          from_tool: string
          id: string
          is_active: boolean | null
          to_tool: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_config?: Json | null
          connection_name: string
          created_at?: string
          from_tool: string
          id?: string
          is_active?: boolean | null
          to_tool: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_config?: Json | null
          connection_name?: string
          created_at?: string
          from_tool?: string
          id?: string
          is_active?: boolean | null
          to_tool?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workflow_configs: {
        Row: {
          auto_tagging_enabled: boolean | null
          created_at: string | null
          google_drive_folder_id: string
          guru_collection_id: string
          id: string
          is_active: boolean | null
          name: string
          scraping_config: Json | null
          source_url: string | null
          updated_at: string | null
          user_id: string | null
          webhook_url: string | null
          workflow_type: string | null
        }
        Insert: {
          auto_tagging_enabled?: boolean | null
          created_at?: string | null
          google_drive_folder_id: string
          guru_collection_id: string
          id?: string
          is_active?: boolean | null
          name: string
          scraping_config?: Json | null
          source_url?: string | null
          updated_at?: string | null
          user_id?: string | null
          webhook_url?: string | null
          workflow_type?: string | null
        }
        Update: {
          auto_tagging_enabled?: boolean | null
          created_at?: string | null
          google_drive_folder_id?: string
          guru_collection_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          scraping_config?: Json | null
          source_url?: string | null
          updated_at?: string | null
          user_id?: string | null
          webhook_url?: string | null
          workflow_type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      processing_status: "pending" | "processing" | "completed" | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      processing_status: ["pending", "processing", "completed", "failed"],
    },
  },
} as const
