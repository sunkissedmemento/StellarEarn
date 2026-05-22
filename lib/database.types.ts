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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      account_activity: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          data: Json | null
          description: string
          id: number
          ledger_sequence: number | null
          recorded_at: string | null
          stellar_account_id: string
          txn_hash: string | null
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          data?: Json | null
          description: string
          id?: number
          ledger_sequence?: number | null
          recorded_at?: string | null
          stellar_account_id: string
          txn_hash?: string | null
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          data?: Json | null
          description?: string
          id?: number
          ledger_sequence?: number | null
          recorded_at?: string | null
          stellar_account_id?: string
          txn_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_activity_stellar_account_id_fkey"
            columns: ["stellar_account_id"]
            isOneToOne: false
            referencedRelation: "stellar_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      account_funding_log: {
        Row: {
          amount_xlm: number
          completed_at: string | null
          error_message: string | null
          funding_method: Database["public"]["Enums"]["funding_method"] | null
          funding_source_account: string | null
          funding_txn_hash: string | null
          funding_txn_xdr: string | null
          id: string
          requested_at: string | null
          status: Database["public"]["Enums"]["funding_status_type"] | null
          stellar_account_id: string
          user_id: string
        }
        Insert: {
          amount_xlm: number
          completed_at?: string | null
          error_message?: string | null
          funding_method?: Database["public"]["Enums"]["funding_method"] | null
          funding_source_account?: string | null
          funding_txn_hash?: string | null
          funding_txn_xdr?: string | null
          id?: string
          requested_at?: string | null
          status?: Database["public"]["Enums"]["funding_status_type"] | null
          stellar_account_id: string
          user_id: string
        }
        Update: {
          amount_xlm?: number
          completed_at?: string | null
          error_message?: string | null
          funding_method?: Database["public"]["Enums"]["funding_method"] | null
          funding_source_account?: string | null
          funding_txn_hash?: string | null
          funding_txn_xdr?: string | null
          id?: string
          requested_at?: string | null
          status?: Database["public"]["Enums"]["funding_status_type"] | null
          stellar_account_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_funding_log_stellar_account_id_fkey"
            columns: ["stellar_account_id"]
            isOneToOne: false
            referencedRelation: "stellar_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_funding_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gig_submissions: {
        Row: {
          approved_at: string | null
          approved_by_user_id: string | null
          gig_id: string
          id: string
          notes: string | null
          payout_tx_hash: string | null
          reviewed_at: string | null
          soroban_submission_hash: string | null
          status: string
          submission_url: string
          submit_tx_hash: string | null
          submit_tx_xdr: string | null
          submitted_at: string
          worker_name: string | null
          worker_stellar_public_key: string | null
          worker_user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          gig_id: string
          id?: string
          notes?: string | null
          payout_tx_hash?: string | null
          reviewed_at?: string | null
          soroban_submission_hash?: string | null
          status?: string
          submission_url: string
          submit_tx_hash?: string | null
          submit_tx_xdr?: string | null
          submitted_at?: string
          worker_name?: string | null
          worker_stellar_public_key?: string | null
          worker_user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          gig_id?: string
          id?: string
          notes?: string | null
          payout_tx_hash?: string | null
          reviewed_at?: string | null
          soroban_submission_hash?: string | null
          status?: string
          submission_url?: string
          submit_tx_hash?: string | null
          submit_tx_xdr?: string | null
          submitted_at?: string
          worker_name?: string | null
          worker_stellar_public_key?: string | null
          worker_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gig_submissions_approved_by_user_id_fkey"
            columns: ["approved_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gig_submissions_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gig_submissions_worker_user_id_fkey"
            columns: ["worker_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gigs: {
        Row: {
          created_at: string
          created_by_user_id: string
          creation_tx_hash: string | null
          creation_tx_xdr: string | null
          deadline_at: string
          deliverables: string[]
          description: string
          featured: boolean
          fee_xlm: number
          id: string
          initials: string
          live: boolean
          org: string
          paid_at: string | null
          paid_by_user_id: string | null
          payment_tx_hash: string | null
          prize_php: number
          reward_amount: number
          reward_unit: string
          skill: string
          slug: string
          soroban_bounty_id: number | null
          sponsor_name: string | null
          sponsor_wallet: string | null
          status: string
          submissions: number
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          creation_tx_hash?: string | null
          creation_tx_xdr?: string | null
          deadline_at: string
          deliverables?: string[]
          description: string
          featured?: boolean
          fee_xlm?: number
          id?: string
          initials: string
          live?: boolean
          org: string
          paid_at?: string | null
          paid_by_user_id?: string | null
          payment_tx_hash?: string | null
          prize_php: number
          reward_amount: number
          reward_unit?: string
          skill: string
          slug: string
          soroban_bounty_id?: number | null
          sponsor_name?: string | null
          sponsor_wallet?: string | null
          status?: string
          submissions?: number
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          creation_tx_hash?: string | null
          creation_tx_xdr?: string | null
          deadline_at?: string
          deliverables?: string[]
          description?: string
          featured?: boolean
          fee_xlm?: number
          id?: string
          initials?: string
          live?: boolean
          org?: string
          paid_at?: string | null
          paid_by_user_id?: string | null
          payment_tx_hash?: string | null
          prize_php?: number
          reward_amount?: number
          reward_unit?: string
          skill?: string
          slug?: string
          soroban_bounty_id?: number | null
          sponsor_name?: string | null
          sponsor_wallet?: string | null
          status?: string
          submissions?: number
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gigs_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gigs_paid_by_user_id_fkey"
            columns: ["paid_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stellar_accounts: {
        Row: {
          account_created_on_network: string | null
          balance_last_updated: string | null
          balance_native: number | null
          created_at: string | null
          funding_method: Database["public"]["Enums"]["funding_method"] | null
          funding_txn_hash: string | null
          id: string
          network: Database["public"]["Enums"]["network_type"] | null
          num_signers: number | null
          num_trustlines: number | null
          public_key: string
          sequence_number: number | null
          sequence_updated_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_created_on_network?: string | null
          balance_last_updated?: string | null
          balance_native?: number | null
          created_at?: string | null
          funding_method?: Database["public"]["Enums"]["funding_method"] | null
          funding_txn_hash?: string | null
          id?: string
          network?: Database["public"]["Enums"]["network_type"] | null
          num_signers?: number | null
          num_trustlines?: number | null
          public_key: string
          sequence_number?: number | null
          sequence_updated_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_created_on_network?: string | null
          balance_last_updated?: string | null
          balance_native?: number | null
          created_at?: string | null
          funding_method?: Database["public"]["Enums"]["funding_method"] | null
          funding_txn_hash?: string | null
          id?: string
          network?: Database["public"]["Enums"]["network_type"] | null
          num_signers?: number | null
          num_trustlines?: number | null
          public_key?: string
          sequence_number?: number | null
          sequence_updated_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stellar_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions_signed: {
        Row: {
          amount_xlm: number | null
          confirmed_at: string | null
          created_at: string | null
          destination_account: string | null
          error_message: string | null
          horizon_txn_id: string | null
          id: string
          ip_address: unknown
          operation_type: string | null
          status: Database["public"]["Enums"]["transaction_status"] | null
          stellar_account_id: string
          submitted_at: string | null
          txn_hash: string | null
          txn_xdr: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          amount_xlm?: number | null
          confirmed_at?: string | null
          created_at?: string | null
          destination_account?: string | null
          error_message?: string | null
          horizon_txn_id?: string | null
          id?: string
          ip_address?: unknown
          operation_type?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          stellar_account_id: string
          submitted_at?: string | null
          txn_hash?: string | null
          txn_xdr: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          amount_xlm?: number | null
          confirmed_at?: string | null
          created_at?: string | null
          destination_account?: string | null
          error_message?: string | null
          horizon_txn_id?: string | null
          id?: string
          ip_address?: unknown
          operation_type?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          stellar_account_id?: string
          submitted_at?: string | null
          txn_hash?: string | null
          txn_xdr?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_signed_stellar_account_id_fkey"
            columns: ["stellar_account_id"]
            isOneToOne: false
            referencedRelation: "stellar_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_signed_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      trustlines: {
        Row: {
          asset_code: string
          asset_issuer: string
          balance: number | null
          created_at: string | null
          established_on_network: string | null
          id: string
          is_authorized: boolean | null
          limit_amount: number | null
          stellar_account_id: string
          user_id: string
        }
        Insert: {
          asset_code: string
          asset_issuer: string
          balance?: number | null
          created_at?: string | null
          established_on_network?: string | null
          id?: string
          is_authorized?: boolean | null
          limit_amount?: number | null
          stellar_account_id: string
          user_id: string
        }
        Update: {
          asset_code?: string
          asset_issuer?: string
          balance?: number | null
          created_at?: string | null
          established_on_network?: string | null
          id?: string
          is_authorized?: boolean | null
          limit_amount?: number | null
          stellar_account_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trustlines_stellar_account_id_fkey"
            columns: ["stellar_account_id"]
            isOneToOne: false
            referencedRelation: "stellar_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trustlines_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          account_created_at: string | null
          account_status: Database["public"]["Enums"]["account_status"] | null
          auth_provider:
            | Database["public"]["Enums"]["auth_provider_type"]
            | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string
          id: string
          last_balance_check: string | null
          location: string | null
          minimum_balance_xlm: number | null
          sep10_challenge_created_at: string | null
          sep10_challenge_xdr: string | null
          stellar_public_key: string
          updated_at: string | null
          username: string
        }
        Insert: {
          account_created_at?: string | null
          account_status?: Database["public"]["Enums"]["account_status"] | null
          auth_provider?:
            | Database["public"]["Enums"]["auth_provider_type"]
            | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email: string
          id?: string
          last_balance_check?: string | null
          location?: string | null
          minimum_balance_xlm?: number | null
          sep10_challenge_created_at?: string | null
          sep10_challenge_xdr?: string | null
          stellar_public_key: string
          updated_at?: string | null
          username: string
        }
        Update: {
          account_created_at?: string | null
          account_status?: Database["public"]["Enums"]["account_status"] | null
          auth_provider?:
            | Database["public"]["Enums"]["auth_provider_type"]
            | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string
          id?: string
          last_balance_check?: string | null
          location?: string | null
          minimum_balance_xlm?: number | null
          sep10_challenge_created_at?: string | null
          sep10_challenge_xdr?: string | null
          stellar_public_key?: string
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_minimum_balance: { Args: { account_id: string }; Returns: boolean }
      get_user_stellar_account: {
        Args: { user_id: string }
        Returns: {
          balance_native: number
          id: string
          network: Database["public"]["Enums"]["network_type"]
          public_key: string
        }[]
      }
    }
    Enums: {
      account_status: "pending" | "active" | "suspended" | "closed"
      activity_type:
        | "account_created"
        | "trustline_added"
        | "payment_sent"
        | "payment_received"
        | "balance_updated"
        | "minimum_balance_alert"
        | "error"
      auth_provider_type: "sep10" | "email"
      funding_method: "friendbot" | "createAccount" | "exchange" | "sponsor"
      funding_status_type: "pending" | "completed" | "failed"
      network_type: "testnet" | "mainnet"
      transaction_status:
        | "pending_signature"
        | "signed"
        | "submitted"
        | "confirmed"
        | "failed"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_status: ["pending", "active", "suspended", "closed"],
      activity_type: [
        "account_created",
        "trustline_added",
        "payment_sent",
        "payment_received",
        "balance_updated",
        "minimum_balance_alert",
        "error",
      ],
      auth_provider_type: ["sep10", "email"],
      funding_method: ["friendbot", "createAccount", "exchange", "sponsor"],
      funding_status_type: ["pending", "completed", "failed"],
      network_type: ["testnet", "mainnet"],
      transaction_status: [
        "pending_signature",
        "signed",
        "submitted",
        "confirmed",
        "failed",
      ],
    },
  },
} as const
