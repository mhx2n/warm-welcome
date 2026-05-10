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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      batches: {
        Row: {
          created_at: string
          id: string
          name: string
          next_number: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          next_number?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          next_number?: number
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      event_banners: {
        Row: {
          active: boolean
          caption: string
          created_at: string
          id: string
          image: string
          target_date: string
        }
        Insert: {
          active?: boolean
          caption?: string
          created_at?: string
          id?: string
          image: string
          target_date: string
        }
        Update: {
          active?: boolean
          caption?: string
          created_at?: string
          id?: string
          image?: string
          target_date?: string
        }
        Relationships: []
      }
      exam_premium_batches: {
        Row: {
          exam_id: string
          premium_batch_id: string
        }
        Insert: {
          exam_id: string
          premium_batch_id: string
        }
        Update: {
          exam_id?: string
          premium_batch_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_premium_batches_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_premium_batches_premium_batch_id_fkey"
            columns: ["premium_batch_id"]
            isOneToOne: false
            referencedRelation: "premium_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          category: string
          chapter: string
          created_at: string
          difficulty: string
          duration: number
          featured: boolean
          id: string
          mandatory_subjects: Json
          negative_marking: number
          published: boolean
          question_count: number
          section_id: string | null
          subject: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          chapter?: string
          created_at?: string
          difficulty?: string
          duration?: number
          featured?: boolean
          id?: string
          mandatory_subjects?: Json
          negative_marking?: number
          published?: boolean
          question_count?: number
          section_id?: string | null
          subject: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          chapter?: string
          created_at?: string
          difficulty?: string
          duration?: number
          featured?: boolean
          id?: string
          mandatory_subjects?: Json
          negative_marking?: number
          published?: boolean
          question_count?: number
          section_id?: string | null
          subject?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      live_exam_access_codes: {
        Row: {
          assigned_to_user_id: string | null
          code: string
          created_at: string
          id: string
          live_exam_id: string
          used_at: string | null
          used_by_user_id: string | null
        }
        Insert: {
          assigned_to_user_id?: string | null
          code: string
          created_at?: string
          id?: string
          live_exam_id: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Update: {
          assigned_to_user_id?: string | null
          code?: string
          created_at?: string
          id?: string
          live_exam_id?: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_exam_access_codes_live_exam_id_fkey"
            columns: ["live_exam_id"]
            isOneToOne: false
            referencedRelation: "live_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_exam_answers: {
        Row: {
          answered_at: string
          id: string
          is_correct: boolean
          live_exam_id: string
          participant_id: string
          question_id: string
          selected_answer: string
          user_id: string
        }
        Insert: {
          answered_at?: string
          id?: string
          is_correct?: boolean
          live_exam_id: string
          participant_id: string
          question_id: string
          selected_answer?: string
          user_id: string
        }
        Update: {
          answered_at?: string
          id?: string
          is_correct?: boolean
          live_exam_id?: string
          participant_id?: string
          question_id?: string
          selected_answer?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_exam_answers_live_exam_id_fkey"
            columns: ["live_exam_id"]
            isOneToOne: false
            referencedRelation: "live_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_exam_answers_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "live_exam_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      live_exam_participants: {
        Row: {
          correct: number
          id: string
          joined_at: string
          live_exam_id: string
          max_score: number
          negative_marks: number
          percentage: number
          score: number
          skipped: number
          started_at: string | null
          status: string
          submitted_at: string | null
          time_taken_seconds: number
          user_id: string
          wrong: number
        }
        Insert: {
          correct?: number
          id?: string
          joined_at?: string
          live_exam_id: string
          max_score?: number
          negative_marks?: number
          percentage?: number
          score?: number
          skipped?: number
          started_at?: string | null
          status?: string
          submitted_at?: string | null
          time_taken_seconds?: number
          user_id: string
          wrong?: number
        }
        Update: {
          correct?: number
          id?: string
          joined_at?: string
          live_exam_id?: string
          max_score?: number
          negative_marks?: number
          percentage?: number
          score?: number
          skipped?: number
          started_at?: string | null
          status?: string
          submitted_at?: string | null
          time_taken_seconds?: number
          user_id?: string
          wrong?: number
        }
        Relationships: [
          {
            foreignKeyName: "live_exam_participants_live_exam_id_fkey"
            columns: ["live_exam_id"]
            isOneToOne: false
            referencedRelation: "live_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_exams: {
        Row: {
          access_mode: string
          created_at: string
          created_by: string | null
          description: string
          duration: number
          end_time: string
          exam_id: string
          id: string
          show_leaderboard: boolean
          start_time: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          access_mode?: string
          created_at?: string
          created_by?: string | null
          description?: string
          duration?: number
          end_time: string
          exam_id: string
          id?: string
          show_leaderboard?: boolean
          start_time: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          access_mode?: string
          created_at?: string
          created_by?: string | null
          description?: string
          duration?: number
          end_time?: string
          exam_id?: string
          id?: string
          show_leaderboard?: boolean
          start_time?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_exams_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          content: string
          created_at: string
          id: string
          image: string | null
          pinned: boolean
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          image?: string | null
          pinned?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image?: string | null
          pinned?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      page_visits: {
        Row: {
          created_at: string
          id: string
          page_path: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_path?: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          page_path?: string
          session_id?: string
        }
        Relationships: []
      }
      premium_batch_members: {
        Row: {
          added_at: string
          id: string
          premium_batch_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          premium_batch_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          id?: string
          premium_batch_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "premium_batch_members_premium_batch_id_fkey"
            columns: ["premium_batch_id"]
            isOneToOne: false
            referencedRelation: "premium_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_batches: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          batch_id: string | null
          batch_name: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          unique_code: string | null
          unique_number: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          batch_id?: string | null
          batch_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          unique_code?: string | null
          unique_number?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          batch_id?: string | null
          batch_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          unique_code?: string | null
          unique_number?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          answer: string
          created_at: string
          exam_id: string
          explanation: string
          id: string
          option_images: Json | null
          options: Json
          question: string
          question_image: string | null
          section: string
          sort_order: number
          type: string
        }
        Insert: {
          answer: string
          created_at?: string
          exam_id: string
          explanation?: string
          id?: string
          option_images?: Json | null
          options?: Json
          question: string
          question_image?: string | null
          section?: string
          sort_order?: number
          type?: string
        }
        Update: {
          answer?: string
          created_at?: string
          exam_id?: string
          explanation?: string
          id?: string
          option_images?: Json | null
          options?: Json
          question?: string
          question_image?: string | null
          section?: string
          sort_order?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          color: string
          created_at: string
          description: string
          id: string
          target_date: string
          title: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string
          id?: string
          target_date: string
          title: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string
          id?: string
          target_date?: string
          title?: string
        }
        Relationships: []
      }
      results: {
        Row: {
          answers: Json
          correct: number
          created_at: string
          exam_id: string
          exam_title: string
          final_score: number
          id: string
          max_score: number
          negative_marks: number
          percentage: number
          session_id: string | null
          skipped: number
          total_questions: number
          wrong: number
        }
        Insert: {
          answers?: Json
          correct?: number
          created_at?: string
          exam_id: string
          exam_title: string
          final_score?: number
          id?: string
          max_score?: number
          negative_marks?: number
          percentage?: number
          session_id?: string | null
          skipped?: number
          total_questions: number
          wrong?: number
        }
        Update: {
          answers?: Json
          correct?: number
          created_at?: string
          exam_id?: string
          exam_title?: string
          final_score?: number
          id?: string
          max_score?: number
          negative_marks?: number
          percentage?: number
          session_id?: string | null
          skipped?: number
          total_questions?: number
          wrong?: number
        }
        Relationships: []
      }
      sections: {
        Row: {
          caption: string | null
          created_at: string
          description: string
          id: string
          image: string | null
          name: string
          order: number
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          description?: string
          id?: string
          image?: string | null
          name: string
          order?: number
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          description?: string
          id?: string
          image?: string | null
          name?: string
          order?: number
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          about_content: string
          about_title: string
          active_theme_id: string
          brand_emoji: string
          brand_name: string
          contact_content: string
          contact_title: string
          created_at: string
          custom_theme: Json | null
          features_content: string
          features_title: string
          footer_description: string
          footer_links: Json
          hero_subtitle: string
          hero_tagline: string
          id: string
          social_links: Json
          ui_labels: Json | null
          updated_at: string
        }
        Insert: {
          about_content?: string
          about_title?: string
          active_theme_id?: string
          brand_emoji?: string
          brand_name?: string
          contact_content?: string
          contact_title?: string
          created_at?: string
          custom_theme?: Json | null
          features_content?: string
          features_title?: string
          footer_description?: string
          footer_links?: Json
          hero_subtitle?: string
          hero_tagline?: string
          id?: string
          social_links?: Json
          ui_labels?: Json | null
          updated_at?: string
        }
        Update: {
          about_content?: string
          about_title?: string
          active_theme_id?: string
          brand_emoji?: string
          brand_name?: string
          contact_content?: string
          contact_title?: string
          created_at?: string
          custom_theme?: Json | null
          features_content?: string
          features_title?: string
          footer_description?: string
          footer_links?: Json
          hero_subtitle?: string
          hero_tagline?: string
          id?: string
          social_links?: Json
          ui_labels?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wrong_answers: {
        Row: {
          correct_answer: string
          created_at: string
          exam_id: string
          exam_title: string
          explanation: string | null
          id: string
          option_images: Json | null
          options: Json
          question_id: string
          question_image: string | null
          question_text: string
          section: string
          session_id: string
          user_answer: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          exam_id: string
          exam_title: string
          explanation?: string | null
          id?: string
          option_images?: Json | null
          options?: Json
          question_id: string
          question_image?: string | null
          question_text: string
          section?: string
          session_id: string
          user_answer?: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          exam_id?: string
          exam_title?: string
          explanation?: string | null
          id?: string
          option_images?: Json | null
          options?: Json
          question_id?: string
          question_image?: string | null
          question_text?: string
          section?: string
          session_id?: string
          user_answer?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_batch_to_profile: {
        Args: { _batch_id: string; _user_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      redeem_live_exam_code: { Args: { _code: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
