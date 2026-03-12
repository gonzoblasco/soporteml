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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string
          after_snapshot: Json | null
          before_snapshot: Json | null
          company_id: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_user_id: string
          after_snapshot?: Json | null
          before_snapshot?: Json | null
          company_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_user_id?: string
          after_snapshot?: Json | null
          before_snapshot?: Json | null
          company_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          name?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          ai_custom_instructions: string | null
          ai_tone: string
          auto_reply_categories: Json
          auto_reply_enabled: boolean
          auto_reply_exclusion_rules: string | null
          auto_reply_mode: string
          autopilot_confidence_threshold: number | null
          business_hours: Json
          company_id: string
          created_at: string
          features_ai_suggestions: boolean | null
          features_autopilot_after_hours: boolean | null
          features_autopilot_in_hours: boolean | null
          last_synced_at: string | null
          sync_interval_minutes: number
          updated_at: string
        }
        Insert: {
          ai_custom_instructions?: string | null
          ai_tone?: string
          auto_reply_categories?: Json
          auto_reply_enabled?: boolean
          auto_reply_exclusion_rules?: string | null
          auto_reply_mode?: string
          autopilot_confidence_threshold?: number | null
          business_hours?: Json
          company_id: string
          created_at?: string
          features_ai_suggestions?: boolean | null
          features_autopilot_after_hours?: boolean | null
          features_autopilot_in_hours?: boolean | null
          last_synced_at?: string | null
          sync_interval_minutes?: number
          updated_at?: string
        }
        Update: {
          ai_custom_instructions?: string | null
          ai_tone?: string
          auto_reply_categories?: Json
          auto_reply_enabled?: boolean
          auto_reply_exclusion_rules?: string | null
          auto_reply_mode?: string
          autopilot_confidence_threshold?: number | null
          business_hours?: Json
          company_id?: string
          created_at?: string
          features_ai_suggestions?: boolean | null
          features_autopilot_after_hours?: boolean | null
          features_autopilot_in_hours?: boolean | null
          last_synced_at?: string | null
          sync_interval_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_inquiries: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
        }
        Relationships: []
      }
      dismissed_meli_questions: {
        Row: {
          company_id: string
          dismissed_at: string
          id: string
          meli_question_id: string
        }
        Insert: {
          company_id: string
          dismissed_at?: string
          id?: string
          meli_question_id: string
        }
        Update: {
          company_id?: string
          dismissed_at?: string
          id?: string
          meli_question_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          company_id: string
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          payload: Json | null
          type: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          payload?: Json | null
          type: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          payload?: Json | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_entries: {
        Row: {
          ai_visible: boolean
          company_id: string
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean
          priority: number
          scope: string
          scope_ref: string | null
          title: string
          type: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          ai_visible?: boolean
          company_id: string
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean
          priority?: number
          scope?: string
          scope_ref?: string | null
          title: string
          type: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          ai_visible?: boolean
          company_id?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean
          priority?: number
          scope?: string
          scope_ref?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      meli_tokens: {
        Row: {
          access_token: string
          company_id: string
          created_at: string
          expires_at: string
          id: string
          meli_user_id: string
          refresh_token: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          company_id: string
          created_at?: string
          expires_at: string
          id?: string
          meli_user_id: string
          refresh_token?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          company_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          meli_user_id?: string
          refresh_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meli_tokens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_default: boolean
          role: Database["public"]["Enums"]["app_role"]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          link: string | null
          message: string | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          archived_at: string | null
          attributes: Json
          company_id: string
          created_at: string
          id: string
          product_id: string
          support_notes: string | null
          updated_at: string
          updated_by: string | null
          variant_name: string
          variant_sku: string | null
        }
        Insert: {
          archived_at?: string | null
          attributes?: Json
          company_id: string
          created_at?: string
          id?: string
          product_id: string
          support_notes?: string | null
          updated_at?: string
          updated_by?: string | null
          variant_name: string
          variant_sku?: string | null
        }
        Update: {
          archived_at?: string | null
          attributes?: Json
          company_id?: string
          created_at?: string
          id?: string
          product_id?: string
          support_notes?: string | null
          updated_at?: string
          updated_by?: string | null
          variant_name?: string
          variant_sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          company_id: string
          created_at: string
          do_not_say: Json
          external_id: string | null
          external_url: string | null
          faq_bullets: Json
          id: string
          key_points: Json
          meli_cache: Json | null
          meli_cache_fetched_at: string | null
          meli_category_id: string | null
          meli_category_name: string | null
          meli_item_id: string | null
          permalink: string | null
          price: number | null
          returns_notes: string | null
          shipping_notes: string | null
          sku: string | null
          source: string
          status: string
          support_summary: string | null
          title: string
          updated_at: string
          updated_by: string | null
          warranty_notes: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          do_not_say?: Json
          external_id?: string | null
          external_url?: string | null
          faq_bullets?: Json
          id?: string
          key_points?: Json
          meli_cache?: Json | null
          meli_cache_fetched_at?: string | null
          meli_category_id?: string | null
          meli_category_name?: string | null
          meli_item_id?: string | null
          permalink?: string | null
          price?: number | null
          returns_notes?: string | null
          shipping_notes?: string | null
          sku?: string | null
          source?: string
          status?: string
          support_summary?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
          warranty_notes?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          do_not_say?: Json
          external_id?: string | null
          external_url?: string | null
          faq_bullets?: Json
          id?: string
          key_points?: Json
          meli_cache?: Json | null
          meli_cache_fetched_at?: string | null
          meli_category_id?: string | null
          meli_category_name?: string | null
          meli_item_id?: string | null
          permalink?: string | null
          price?: number | null
          returns_notes?: string | null
          shipping_notes?: string | null
          sku?: string | null
          source?: string
          status?: string
          support_summary?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          warranty_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          full_name: string | null
          id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          full_name?: string | null
          id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          ai_category: string | null
          ai_confidence: number | null
          ai_decision_reason: string | null
          ai_suggested_answer: string | null
          answered_at: string | null
          answered_by: string | null
          answered_by_ai: boolean | null
          auto_action: string | null
          buyer_id: string | null
          buyer_nickname: string | null
          company_id: string
          created_at: string
          final_answer: string | null
          id: string
          meli_permalink: string | null
          meli_question_id: string
          meli_status: string | null
          product_id: string | null
          product_meli_id: string | null
          question_text: string
          requires_human: boolean
          requires_human_reason: string | null
          status: string
        }
        Insert: {
          ai_category?: string | null
          ai_confidence?: number | null
          ai_decision_reason?: string | null
          ai_suggested_answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          answered_by_ai?: boolean | null
          auto_action?: string | null
          buyer_id?: string | null
          buyer_nickname?: string | null
          company_id: string
          created_at?: string
          final_answer?: string | null
          id?: string
          meli_permalink?: string | null
          meli_question_id: string
          meli_status?: string | null
          product_id?: string | null
          product_meli_id?: string | null
          question_text: string
          requires_human?: boolean
          requires_human_reason?: string | null
          status?: string
        }
        Update: {
          ai_category?: string | null
          ai_confidence?: number | null
          ai_decision_reason?: string | null
          ai_suggested_answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          answered_by_ai?: boolean | null
          auto_action?: string | null
          buyer_id?: string | null
          buyer_nickname?: string | null
          company_id?: string
          created_at?: string
          final_answer?: string | null
          id?: string
          meli_permalink?: string | null
          meli_question_id?: string
          meli_status?: string | null
          product_id?: string | null
          product_meli_id?: string | null
          question_text?: string
          requires_human?: boolean
          requires_human_reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_answered_by_fkey"
            columns: ["answered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          category: string
          company_id: string
          content: string
          created_at: string
          id: string
          title: string
          updated_at: string
          variables: Json
        }
        Insert: {
          category?: string
          company_id: string
          content: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          category?: string
          company_id?: string
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      meli_connection_status: {
        Row: {
          company_id: string | null
          created_at: string | null
          expires_at: string | null
          has_refresh_token: boolean | null
          id: string | null
          meli_user_id: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          has_refresh_token?: never
          id?: string | null
          meli_user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          has_refresh_token?: never
          id?: string | null
          meli_user_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meli_tokens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_company_membership: {
        Args: {
          _company_id: string
          _role?: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      find_similar_products: {
        Args: {
          _company_id: string
          _limit?: number
          _product_id: string
          _threshold?: number
          _title: string
        }
        Returns: {
          id: string
          similarity: number
          title: string
        }[]
      }
      get_admin_company_metrics: {
        Args: never
        Returns: {
          auto_answered: number
          company_id: string
          company_name: string
          has_meli: boolean
          human_answered: number
          last_question_at: string
          member_count: number
          pending_questions: number
          total_products: number
          total_questions: number
        }[]
      }
      get_admin_users: {
        Args: never
        Returns: {
          company_id: string
          company_name: string
          created_at: string
          email: string
          full_name: string
          memberships: Json
          role: string
          user_id: string
        }[]
      }
      get_company_members: {
        Args: { _company_id: string }
        Returns: {
          full_name: string
          joined_at: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          user_id: string
        }[]
      }
      get_user_active_companies: {
        Args: { _user_id: string }
        Returns: {
          company_id: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      get_user_company_ids: {
        Args: { _user_id: string }
        Returns: {
          company_id: string
        }[]
      }
      get_user_default_company: { Args: { _user_id: string }; Returns: string }
      has_membership_role: {
        Args: {
          _company_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      join_company_by_invite: { Args: { _invite_code: string }; Returns: Json }
      remove_company_membership: {
        Args: { _company_id: string; _user_id: string }
        Returns: undefined
      }
      update_membership_role: {
        Args: {
          _company_id: string
          _new_role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      user_belongs_to_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "agent"
      question_category: "Precio" | "Stock" | "Técnico" | "Envío" | "Garantía"
      question_status: "pending" | "answered" | "discarded"
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
      app_role: ["admin", "agent"],
      question_category: ["Precio", "Stock", "Técnico", "Envío", "Garantía"],
      question_status: ["pending", "answered", "discarded"],
    },
  },
} as const
