export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      cheat_logs: {
        Row: {
          game_id: string
          id: string
          participant_id: string
          reason: string
          timestamp: string | null
        }
        Insert: {
          game_id: string
          id?: string
          participant_id: string
          reason: string
          timestamp?: string | null
        }
        Update: {
          game_id?: string
          id?: string
          participant_id?: string
          reason?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cheat_logs_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheat_logs_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          admin_id: string | null
          created_at: string | null
          current_question_id: string | null
          id: string
          join_code: string
          settings: Json | null
          status: Database["public"]["Enums"]["game_status"] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          admin_id?: string | null
          created_at?: string | null
          current_question_id?: string | null
          id?: string
          join_code: string
          settings?: Json | null
          status?: Database["public"]["Enums"]["game_status"] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          admin_id?: string | null
          created_at?: string | null
          current_question_id?: string | null
          id?: string
          join_code?: string
          settings?: Json | null
          status?: Database["public"]["Enums"]["game_status"] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      participants: {
        Row: {
          cheat_count: number | null
          fingerprint: string | null
          game_id: string
          id: string
          joined_at: string | null
          last_seen_at: string | null
          name: string
          score: number | null
          status: Database["public"]["Enums"]["user_status"] | null
          user_id: string
        }
        Insert: {
          cheat_count?: number | null
          fingerprint?: string | null
          game_id: string
          id?: string
          joined_at?: string | null
          last_seen_at?: string | null
          name: string
          score?: number | null
          status?: Database["public"]["Enums"]["user_status"] | null
          user_id: string
        }
        Update: {
          cheat_count?: number | null
          fingerprint?: string | null
          game_id?: string
          id?: string
          joined_at?: string | null
          last_seen_at?: string | null
          name?: string
          score?: number | null
          status?: Database["public"]["Enums"]["user_status"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participants_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          active: boolean | null
          correct_answers: string[] | null
          created_at: string | null
          game_id: string
          hint: string | null
          hint_penalty: number | null
          id: string
          keywords: Json | null
          options: string[] | null
          order_index: number
          points: number | null
          text: string
          time_limit: number | null
          type: Database["public"]["Enums"]["question_type"]
        }
        Insert: {
          active?: boolean | null
          correct_answers?: string[] | null
          created_at?: string | null
          game_id: string
          hint?: string | null
          hint_penalty?: number | null
          id?: string
          keywords?: Json | null
          options?: string[] | null
          order_index: number
          points?: number | null
          text: string
          time_limit?: number | null
          type: Database["public"]["Enums"]["question_type"]
        }
        Update: {
          active?: boolean | null
          correct_answers?: string[] | null
          created_at?: string | null
          game_id?: string
          hint?: string | null
          hint_penalty?: number | null
          id?: string
          keywords?: Json | null
          options?: string[] | null
          order_index?: number
          points?: number | null
          text?: string
          time_limit?: number | null
          type?: Database["public"]["Enums"]["question_type"]
        }
        Relationships: [
          {
            foreignKeyName: "questions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      responses: {
        Row: {
          answer: Json
          correct: boolean
          created_at: string | null
          game_id: string
          id: string
          idempotency_key: string
          participant_id: string
          points_awarded: number
          question_id: string
          time_taken: number
        }
        Insert: {
          answer: Json
          correct: boolean
          created_at?: string | null
          game_id: string
          id?: string
          idempotency_key: string
          participant_id: string
          points_awarded: number
          question_id: string
          time_taken: number
        }
        Update: {
          answer?: Json
          correct?: boolean
          created_at?: string | null
          game_id?: string
          id?: string
          idempotency_key?: string
          participant_id?: string
          points_awarded?: number
          question_id?: string
          time_taken?: number
        }
        Relationships: [
          {
            foreignKeyName: "responses_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_game_by_join_code: {
        Args: { p_join_code: string }
        Returns: {
          created_at: string
          id: string
          status: Database["public"]["Enums"]["game_status"]
          title: string
        }[]
      }
      generate_join_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      handle_cheat_detection: {
        Args: { p_game_id: string; p_participant_id: string; p_reason: string }
        Returns: Json
      }
      submit_response: {
        Args: {
          p_answer: Json
          p_correct: boolean
          p_game_id: string
          p_idempotency_key: string
          p_participant_id: string
          p_points_awarded: number
          p_question_id: string
          p_time_taken: number
        }
        Returns: Json
      }
    }
    Enums: {
      game_status: "waiting" | "started" | "paused" | "ended"
      question_type: "mcq" | "checkbox" | "short" | "jumble"
      user_status: "active" | "eliminated" | "disconnected"
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
      game_status: ["waiting", "started", "paused", "ended"],
      question_type: ["mcq", "checkbox", "short", "jumble"],
      user_status: ["active", "eliminated", "disconnected"],
    },
  },
} as const
