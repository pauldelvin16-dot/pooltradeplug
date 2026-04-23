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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          deposit_countdown_minutes: number
          deposits_enabled: boolean
          first_deposit_bonus_amount: number
          first_deposit_bonus_enabled: boolean
          first_deposit_min_amount: number
          id: string
          mt5_enabled: boolean
          otp_login_enabled: boolean | null
          pools_enabled: boolean
          registrations_enabled: boolean
          smtp_enabled: boolean | null
          smtp_from_email: string | null
          smtp_from_name: string | null
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_secure: boolean | null
          smtp_username: string | null
          stat_active_traders: string | null
          stat_total_volume: string | null
          stat_trading_pools: string | null
          stat_uptime: string | null
          telegram_admin_chat_id: string | null
          telegram_bot_link: string | null
          telegram_bot_token: string | null
          updated_at: string
          withdrawals_enabled: boolean
        }
        Insert: {
          deposit_countdown_minutes?: number
          deposits_enabled?: boolean
          first_deposit_bonus_amount?: number
          first_deposit_bonus_enabled?: boolean
          first_deposit_min_amount?: number
          id?: string
          mt5_enabled?: boolean
          otp_login_enabled?: boolean | null
          pools_enabled?: boolean
          registrations_enabled?: boolean
          smtp_enabled?: boolean | null
          smtp_from_email?: string | null
          smtp_from_name?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          smtp_username?: string | null
          stat_active_traders?: string | null
          stat_total_volume?: string | null
          stat_trading_pools?: string | null
          stat_uptime?: string | null
          telegram_admin_chat_id?: string | null
          telegram_bot_link?: string | null
          telegram_bot_token?: string | null
          updated_at?: string
          withdrawals_enabled?: boolean
        }
        Update: {
          deposit_countdown_minutes?: number
          deposits_enabled?: boolean
          first_deposit_bonus_amount?: number
          first_deposit_bonus_enabled?: boolean
          first_deposit_min_amount?: number
          id?: string
          mt5_enabled?: boolean
          otp_login_enabled?: boolean | null
          pools_enabled?: boolean
          registrations_enabled?: boolean
          smtp_enabled?: boolean | null
          smtp_from_email?: string | null
          smtp_from_name?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          smtp_username?: string | null
          stat_active_traders?: string | null
          stat_total_volume?: string | null
          stat_trading_pools?: string | null
          stat_uptime?: string | null
          telegram_admin_chat_id?: string | null
          telegram_bot_link?: string | null
          telegram_bot_token?: string | null
          updated_at?: string
          withdrawals_enabled?: boolean
        }
        Relationships: []
      }
      crypto_addresses: {
        Row: {
          address: string
          created_at: string
          currency: string
          id: string
          is_active: boolean
          label: string | null
          network: string
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          label?: string | null
          network?: string
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          label?: string | null
          network?: string
          updated_at?: string
        }
        Relationships: []
      }
      deposits: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          crypto_address_id: string | null
          currency: string
          expires_at: string | null
          id: string
          network: string
          proof_url: string | null
          status: Database["public"]["Enums"]["deposit_status"]
          txid: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          crypto_address_id?: string | null
          currency?: string
          expires_at?: string | null
          id?: string
          network?: string
          proof_url?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          txid?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          crypto_address_id?: string | null
          currency?: string
          expires_at?: string | null
          id?: string
          network?: string
          proof_url?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          txid?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposits_crypto_address_id_fkey"
            columns: ["crypto_address_id"]
            isOneToOne: false
            referencedRelation: "crypto_addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      email_log: {
        Row: {
          created_at: string
          error: string | null
          id: string
          status: string
          subject: string
          template: string | null
          to_email: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          status?: string
          subject: string
          template?: string | null
          to_email: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          status?: string
          subject?: string
          template?: string | null
          to_email?: string
        }
        Relationships: []
      }
      mt5_accounts: {
        Row: {
          admin_note: string | null
          created_at: string
          current_usage: number | null
          id: string
          max_allocation: number | null
          mt5_login: string
          mt5_server: string | null
          status: Database["public"]["Enums"]["mt5_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          current_usage?: number | null
          id?: string
          max_allocation?: number | null
          mt5_login: string
          mt5_server?: string | null
          status?: Database["public"]["Enums"]["mt5_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          current_usage?: number | null
          id?: string
          max_allocation?: number | null
          mt5_login?: string
          mt5_server?: string | null
          status?: Database["public"]["Enums"]["mt5_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mt5_bookings: {
        Row: {
          admin_note: string | null
          booking_fee: number
          created_at: string
          deposit_id: string | null
          id: string
          mt5_account_id: string
          scheduled_at: string | null
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          booking_fee?: number
          created_at?: string
          deposit_id?: string | null
          id?: string
          mt5_account_id: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          booking_fee?: number
          created_at?: string
          deposit_id?: string | null
          id?: string
          mt5_account_id?: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mt5_bookings_deposit_id_fkey"
            columns: ["deposit_id"]
            isOneToOne: false
            referencedRelation: "deposits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mt5_bookings_mt5_account_id_fkey"
            columns: ["mt5_account_id"]
            isOneToOne: false
            referencedRelation: "mt5_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          purpose: string
          used: boolean
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          purpose?: string
          used?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          purpose?: string
          used?: boolean
        }
        Relationships: []
      }
      pool_chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          pool_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          pool_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          pool_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pool_chat_messages_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
        ]
      }
      pool_participants: {
        Row: {
          amount_invested: number
          id: string
          joined_at: string
          pool_id: string
          profit_share: number | null
          user_id: string
        }
        Insert: {
          amount_invested: number
          id?: string
          joined_at?: string
          pool_id: string
          profit_share?: number | null
          user_id: string
        }
        Update: {
          amount_invested?: number
          id?: string
          joined_at?: string
          pool_id?: string
          profit_share?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pool_participants_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
        ]
      }
      pools: {
        Row: {
          created_at: string
          current_participants: number
          current_profit: number
          description: string | null
          duration_days: number
          end_date: string | null
          entry_amount: number
          fallback_action: string | null
          id: string
          max_participants: number
          name: string
          profit_split_percentage: number | null
          refund_policy: string | null
          start_date: string
          status: Database["public"]["Enums"]["pool_status"]
          target_profit: number
          traded_symbol: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_participants?: number
          current_profit?: number
          description?: string | null
          duration_days?: number
          end_date?: string | null
          entry_amount: number
          fallback_action?: string | null
          id?: string
          max_participants?: number
          name: string
          profit_split_percentage?: number | null
          refund_policy?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["pool_status"]
          target_profit: number
          traded_symbol?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_participants?: number
          current_profit?: number
          description?: string | null
          duration_days?: number
          end_date?: string | null
          entry_amount?: number
          fallback_action?: string | null
          id?: string
          max_participants?: number
          name?: string
          profit_split_percentage?: number | null
          refund_policy?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["pool_status"]
          target_profit?: number
          traded_symbol?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          balance: number
          created_at: string
          email: string | null
          first_deposit_claimed: boolean
          first_name: string | null
          id: string
          last_name: string | null
          telegram_chat_id: string | null
          telegram_linked: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          balance?: number
          created_at?: string
          email?: string | null
          first_deposit_claimed?: boolean
          first_name?: string | null
          id?: string
          last_name?: string | null
          telegram_chat_id?: string | null
          telegram_linked?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          balance?: number
          created_at?: string
          email?: string | null
          first_deposit_claimed?: boolean
          first_name?: string | null
          id?: string
          last_name?: string | null
          telegram_chat_id?: string | null
          telegram_linked?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      telegram_bot_state: {
        Row: {
          id: number
          update_offset: number
          updated_at: string
        }
        Insert: {
          id: number
          update_offset?: number
          updated_at?: string
        }
        Update: {
          id?: number
          update_offset?: number
          updated_at?: string
        }
        Relationships: []
      }
      telegram_messages: {
        Row: {
          chat_id: number
          created_at: string
          raw_update: Json
          text: string | null
          update_id: number
        }
        Insert: {
          chat_id: number
          created_at?: string
          raw_update: Json
          text?: string | null
          update_id: number
        }
        Update: {
          chat_id?: number
          created_at?: string
          raw_update?: Json
          text?: string | null
          update_id?: number
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
      withdrawals: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          currency: string
          id: string
          network: string
          status: Database["public"]["Enums"]["withdrawal_status"]
          updated_at: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          currency?: string
          id?: string
          network?: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
          user_id: string
          wallet_address: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          network?: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "trader" | "user"
      booking_status: "pending" | "paid" | "approved" | "rejected"
      deposit_status: "pending" | "confirmed" | "rejected" | "expired"
      mt5_status: "available" | "active" | "disabled" | "pending_review"
      pool_status: "active" | "completed" | "failed" | "cancelled"
      withdrawal_status:
        | "pending"
        | "approved"
        | "rejected"
        | "processing"
        | "completed"
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
      app_role: ["admin", "manager", "trader", "user"],
      booking_status: ["pending", "paid", "approved", "rejected"],
      deposit_status: ["pending", "confirmed", "rejected", "expired"],
      mt5_status: ["available", "active", "disabled", "pending_review"],
      pool_status: ["active", "completed", "failed", "cancelled"],
      withdrawal_status: [
        "pending",
        "approved",
        "rejected",
        "processing",
        "completed",
      ],
    },
  },
} as const
