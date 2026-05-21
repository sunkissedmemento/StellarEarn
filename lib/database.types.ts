// Auto-generated TypeScript types from Supabase schema
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          username: string;
          stellar_public_key: string;
          account_created_at: string | null;
          account_status: 'pending' | 'active' | 'suspended' | 'closed';
          created_at: string;
          updated_at: string;
          auth_provider: 'sep10' | 'email';
          sep10_challenge_xdr: string | null;
          sep10_challenge_created_at: string | null;
          last_balance_check: string | null;
          minimum_balance_xlm: number;
          avatar_url: string | null;
          bio: string | null;
          location: string | null;
        };
        Insert: Omit<
          Database['public']['Tables']['users']['Row'],
          'id' | 'created_at' | 'updated_at'
        >;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
        Relationships: [];
      };
      stellar_accounts: {
        Row: {
          id: string;
          user_id: string;
          public_key: string;
          account_created_on_network: string | null;
          funding_method: 'friendbot' | 'createAccount' | 'exchange' | 'sponsor';
          funding_txn_hash: string | null;
          balance_native: number;
          balance_last_updated: string | null;
          sequence_number: number | null;
          sequence_updated_at: string | null;
          num_trustlines: number;
          num_signers: number;
          network: 'testnet' | 'mainnet';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['stellar_accounts']['Row'],
          'id' | 'created_at' | 'updated_at'
        >;
        Update: Partial<Database['public']['Tables']['stellar_accounts']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'stellar_accounts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      trustlines: {
        Row: {
          id: string;
          user_id: string;
          stellar_account_id: string;
          asset_code: string;
          asset_issuer: string;
          balance: number;
          limit_amount: number | null;
          created_at: string;
          established_on_network: string | null;
          is_authorized: boolean;
        };
        Insert: Omit<
          Database['public']['Tables']['trustlines']['Row'],
          'id' | 'created_at'
        >;
        Update: Partial<Database['public']['Tables']['trustlines']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'trustlines_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trustlines_stellar_account_id_fkey';
            columns: ['stellar_account_id'];
            isOneToOne: false;
            referencedRelation: 'stellar_accounts';
            referencedColumns: ['id'];
          }
        ];
      };
      transactions_signed: {
        Row: {
          id: string;
          user_id: string;
          stellar_account_id: string;
          txn_xdr: string;
          txn_hash: string | null;
          status: 'pending_signature' | 'signed' | 'submitted' | 'confirmed' | 'failed';
          error_message: string | null;
          operation_type: string | null;
          amount_xlm: number | null;
          destination_account: string | null;
          created_at: string;
          submitted_at: string | null;
          confirmed_at: string | null;
          horizon_txn_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
        };
        Insert: Omit<
          Database['public']['Tables']['transactions_signed']['Row'],
          'id' | 'created_at'
        >;
        Update: Partial<Database['public']['Tables']['transactions_signed']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'transactions_signed_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_signed_stellar_account_id_fkey';
            columns: ['stellar_account_id'];
            isOneToOne: false;
            referencedRelation: 'stellar_accounts';
            referencedColumns: ['id'];
          }
        ];
      };
      account_funding_log: {
        Row: {
          id: string;
          user_id: string;
          stellar_account_id: string;
          funding_method: 'friendbot' | 'createAccount' | 'exchange' | 'sponsor' | null;
          amount_xlm: number;
          funding_source_account: string | null;
          funding_txn_hash: string | null;
          funding_txn_xdr: string | null;
          status: 'pending' | 'completed' | 'failed';
          error_message: string | null;
          requested_at: string;
          completed_at: string | null;
        };
        Insert: Omit<
          Database['public']['Tables']['account_funding_log']['Row'],
          'id' | 'requested_at'
        >;
        Update: Partial<Database['public']['Tables']['account_funding_log']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'account_funding_log_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'account_funding_log_stellar_account_id_fkey';
            columns: ['stellar_account_id'];
            isOneToOne: false;
            referencedRelation: 'stellar_accounts';
            referencedColumns: ['id'];
          }
        ];
      };
      account_activity: {
        Row: {
          id: number;
          stellar_account_id: string;
          activity_type:
            | 'account_created'
            | 'trustline_added'
            | 'payment_sent'
            | 'payment_received'
            | 'balance_updated'
            | 'minimum_balance_alert'
            | 'error';
          description: string;
          data: Record<string, unknown> | null;
          ledger_sequence: number | null;
          txn_hash: string | null;
          recorded_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['account_activity']['Row'],
          'id' | 'recorded_at'
        >;
        Update: Partial<Database['public']['Tables']['account_activity']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'account_activity_stellar_account_id_fkey';
            columns: ['stellar_account_id'];
            isOneToOne: false;
            referencedRelation: 'stellar_accounts';
            referencedColumns: ['id'];
          }
        ];
      };
      gigs: {
        Row: {
          id: string;
          created_by_user_id: string;
          slug: string;
          title: string;
          org: string;
          initials: string;
          prize_php: number;
          reward_amount: number;
          reward_unit: 'XLM' | 'PHP' | 'USDC';
          type: 'bounty' | 'project';
          skill: 'content' | 'design' | 'dev' | 'research';
          status: 'open' | 'pending_review' | 'closed' | 'paid';
          deadline_at: string;
          description: string;
          deliverables: string[];
          sponsor_name: string | null;
          sponsor_wallet: string | null;
          live: boolean;
          featured: boolean;
          submissions: number;
          fee_xlm: number;
          paid_by_user_id: string | null;
          paid_at: string | null;
          payment_tx_hash: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['gigs']['Row'],
          'id' | 'created_at' | 'updated_at'
        >;
        Update: Partial<Database['public']['Tables']['gigs']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'gigs_created_by_user_id_fkey';
            columns: ['created_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'gigs_paid_by_user_id_fkey';
            columns: ['paid_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      gig_submissions: {
        Row: {
          id: string;
          gig_id: string;
          worker_user_id: string;
          worker_name: string | null;
          submission_url: string;
          status: 'pending_review' | 'approved' | 'rejected';
          submitted_at: string;
          approved_by_user_id: string | null;
          approved_at: string | null;
          payout_tx_hash: string | null;
          reviewed_at: string | null;
          notes: string | null;
        };
        Insert: Omit<
          Database['public']['Tables']['gig_submissions']['Row'],
          'id' | 'submitted_at'
        >;
        Update: Partial<Database['public']['Tables']['gig_submissions']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'gig_submissions_gig_id_fkey';
            columns: ['gig_id'];
            isOneToOne: false;
            referencedRelation: 'gigs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'gig_submissions_worker_user_id_fkey';
            columns: ['worker_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'gig_submissions_approved_by_user_id_fkey';
            columns: ['approved_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {};
    Functions: {
      get_user_stellar_account: {
        Args: {
          user_id: string;
        };
        Returns: {
          id: string;
          public_key: string;
          balance_native: number;
          network: 'testnet' | 'mainnet';
        }[];
      };
      check_minimum_balance: {
        Args: {
          account_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      account_status: 'pending' | 'active' | 'suspended' | 'closed';
      activity_type:
        | 'account_created'
        | 'trustline_added'
        | 'payment_sent'
        | 'payment_received'
        | 'balance_updated'
        | 'minimum_balance_alert'
        | 'error';
      auth_provider_type: 'sep10' | 'email';
      funding_method: 'friendbot' | 'createAccount' | 'exchange' | 'sponsor';
      funding_status_type: 'pending' | 'completed' | 'failed';
      network_type: 'testnet' | 'mainnet';
      transaction_status: 'pending_signature' | 'signed' | 'submitted' | 'confirmed' | 'failed';
    };
    CompositeTypes: {};
  };
};
