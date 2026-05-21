-- ============================================================================
-- StellarEarn Non-Custodial Account Schema for Supabase
-- Version: 1.0.0
-- Created: 2026-05-21
-- ============================================================================

-- Create ENUM types
CREATE TYPE account_status AS ENUM ('pending', 'active', 'suspended', 'closed');
CREATE TYPE funding_method AS ENUM ('friendbot', 'createAccount', 'exchange', 'sponsor');
CREATE TYPE network_type AS ENUM ('testnet', 'mainnet');
CREATE TYPE transaction_status AS ENUM ('pending_signature', 'signed', 'submitted', 'confirmed', 'failed');
CREATE TYPE activity_type AS ENUM (
  'account_created',
  'trustline_added',
  'payment_sent',
  'payment_received',
  'balance_updated',
  'minimum_balance_alert',
  'error'
);
CREATE TYPE auth_provider_type AS ENUM ('sep10', 'email');
CREATE TYPE funding_status_type AS ENUM ('pending', 'completed', 'failed');

-- ============================================================================
-- TABLE: users
-- Stores user registration and Stellar account mapping
-- ============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  stellar_public_key VARCHAR(56) NOT NULL UNIQUE,
  account_created_at TIMESTAMP WITH TIME ZONE,
  account_status account_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  auth_provider auth_provider_type DEFAULT 'sep10',

  -- SEP-10 Challenge
  sep10_challenge_xdr TEXT,
  sep10_challenge_created_at TIMESTAMP WITH TIME ZONE,

  -- Account Health
  last_balance_check TIMESTAMP WITH TIME ZONE,
  minimum_balance_xlm DECIMAL(19, 7) DEFAULT 1.0,

  -- Metadata
  avatar_url TEXT,
  bio TEXT,
  location TEXT,

  -- Constraints
  CONSTRAINT valid_email CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  CONSTRAINT valid_username CHECK (username ~ '^[a-zA-Z0-9_-]{3,30}$'),
  CONSTRAINT valid_stellar_public_key CHECK (stellar_public_key ~ '^G[A-Z2-7]{56}$'),
  CONSTRAINT valid_minimum_balance CHECK (minimum_balance_xlm >= 1.0)
);

-- Indexes for users table
CREATE INDEX idx_users_stellar_public_key ON users(stellar_public_key);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_account_status ON users(account_status);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- ============================================================================
-- TABLE: stellar_accounts
-- Detailed Stellar account information and state
-- ============================================================================
CREATE TABLE stellar_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_key VARCHAR(56) NOT NULL UNIQUE,

  -- Account Lifecycle
  account_created_on_network TIMESTAMP WITH TIME ZONE,
  funding_method funding_method DEFAULT 'friendbot',
  funding_txn_hash VARCHAR(64),

  -- Account State
  balance_native DECIMAL(19, 7) DEFAULT 0,
  balance_last_updated TIMESTAMP WITH TIME ZONE,

  -- Sequence Number (for transaction ordering)
  sequence_number BIGINT,
  sequence_updated_at TIMESTAMP WITH TIME ZONE,

  -- Reserve Requirements
  num_trustlines INT DEFAULT 0,
  num_signers INT DEFAULT 0,

  -- Network
  network network_type DEFAULT 'testnet',

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_stellar_public_key CHECK (public_key ~ '^G[A-Z2-7]{56}$'),
  CONSTRAINT valid_balance CHECK (balance_native >= 0),
  CONSTRAINT valid_sequence CHECK (sequence_number IS NULL OR sequence_number >= 0),
  CONSTRAINT valid_trustlines CHECK (num_trustlines >= 0),
  CONSTRAINT valid_signers CHECK (num_signers >= 1)
);

-- Indexes for stellar_accounts table
CREATE INDEX idx_stellar_accounts_user_id ON stellar_accounts(user_id);
CREATE INDEX idx_stellar_accounts_public_key ON stellar_accounts(public_key);
CREATE INDEX idx_stellar_accounts_network ON stellar_accounts(network);
CREATE INDEX idx_stellar_accounts_created_at ON stellar_accounts(created_at DESC);

-- ============================================================================
-- TABLE: trustlines
-- Custom asset trustlines for each account
-- ============================================================================
CREATE TABLE trustlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stellar_account_id UUID NOT NULL REFERENCES stellar_accounts(id) ON DELETE CASCADE,
  asset_code VARCHAR(12) NOT NULL,
  asset_issuer VARCHAR(56) NOT NULL,

  -- Trustline State
  balance DECIMAL(19, 7) DEFAULT 0,
  limit_amount DECIMAL(19, 7),

  -- Lifecycle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  established_on_network TIMESTAMP WITH TIME ZONE,

  -- Metadata
  is_authorized BOOLEAN DEFAULT TRUE,

  -- Constraints
  CONSTRAINT valid_balance CHECK (balance >= 0),
  CONSTRAINT valid_limit CHECK (limit_amount IS NULL OR limit_amount > 0),
  CONSTRAINT valid_asset_code CHECK (asset_code ~ '^[A-Z0-9]{1,12}$'),
  CONSTRAINT valid_asset_issuer CHECK (asset_issuer ~ '^G[A-Z2-7]{56}$'),

  UNIQUE(stellar_account_id, asset_code, asset_issuer)
);

-- Indexes for trustlines table
CREATE INDEX idx_trustlines_account_id ON trustlines(stellar_account_id);
CREATE INDEX idx_trustlines_asset ON trustlines(asset_code, asset_issuer);
CREATE INDEX idx_trustlines_created_at ON trustlines(created_at DESC);

-- ============================================================================
-- TABLE: transactions_signed
-- Audit trail of all transactions
-- ============================================================================
CREATE TABLE transactions_signed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stellar_account_id UUID NOT NULL REFERENCES stellar_accounts(id) ON DELETE CASCADE,

  -- Transaction Details
  txn_xdr TEXT NOT NULL,
  txn_hash VARCHAR(64) UNIQUE,

  -- Status
  status transaction_status DEFAULT 'pending_signature',
  error_message TEXT,

  -- Operation Type
  operation_type VARCHAR(50),

  -- Financial Impact
  amount_xlm DECIMAL(19, 7),
  destination_account VARCHAR(56),

  -- Lifecycle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  horizon_txn_id VARCHAR(64),

  -- Metadata
  ip_address INET,
  user_agent TEXT,

  -- Constraints
  CONSTRAINT valid_operation_type CHECK (operation_type IN ('createAccount', 'payment', 'changeTrust', 'manageOffer', 'pathPayment')),
  CONSTRAINT valid_amount CHECK (amount_xlm IS NULL OR amount_xlm > 0),
  CONSTRAINT valid_destination CHECK (destination_account IS NULL OR destination_account ~ '^G[A-Z2-7]{56}$')
);

-- Indexes for transactions_signed table
CREATE INDEX idx_transactions_account_id ON transactions_signed(stellar_account_id);
CREATE INDEX idx_transactions_status ON transactions_signed(status);
CREATE INDEX idx_transactions_hash ON transactions_signed(txn_hash);
CREATE INDEX idx_transactions_created_at ON transactions_signed(created_at DESC);

-- ============================================================================
-- TABLE: account_funding_log
-- Funding events for reconciliation
-- ============================================================================
CREATE TABLE account_funding_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stellar_account_id UUID NOT NULL REFERENCES stellar_accounts(id) ON DELETE CASCADE,

  -- Funding Details
  funding_method funding_method,
  amount_xlm DECIMAL(19, 7) NOT NULL,
  funding_source_account VARCHAR(56),

  -- Transaction
  funding_txn_hash VARCHAR(64),
  funding_txn_xdr TEXT,

  -- Status
  status funding_status_type DEFAULT 'pending',
  error_message TEXT,

  -- Lifecycle
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT valid_amount CHECK (amount_xlm > 0),
  CONSTRAINT valid_source_account CHECK (funding_source_account IS NULL OR funding_source_account ~ '^G[A-Z2-7]{56}$')
);

-- Indexes for account_funding_log table
CREATE INDEX idx_funding_log_user_id ON account_funding_log(user_id);
CREATE INDEX idx_funding_log_account_id ON account_funding_log(stellar_account_id);
CREATE INDEX idx_funding_log_status ON account_funding_log(status);
CREATE INDEX idx_funding_log_requested_at ON account_funding_log(requested_at DESC);

-- ============================================================================
-- TABLE: account_activity
-- Real-time activity stream
-- ============================================================================
CREATE TABLE account_activity (
  id BIGSERIAL PRIMARY KEY,
  stellar_account_id UUID NOT NULL REFERENCES stellar_accounts(id) ON DELETE CASCADE,

  -- Activity Type
  activity_type activity_type NOT NULL,

  -- Details
  description TEXT NOT NULL,
  data JSONB,

  -- Sequence
  ledger_sequence BIGINT,
  txn_hash VARCHAR(64),

  -- Lifecycle
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for account_activity table
CREATE INDEX idx_activity_account_id ON account_activity(stellar_account_id);
CREATE INDEX idx_activity_type ON account_activity(activity_type);
CREATE INDEX idx_activity_ledger ON account_activity(ledger_sequence);
CREATE INDEX idx_activity_recorded_at ON account_activity(recorded_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stellar_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trustlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions_signed ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_funding_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own data"
  ON users FOR SELECT
  USING (auth.uid()::uuid = id);

CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE
  USING (auth.uid()::uuid = id);

CREATE POLICY "Anyone can register"
  ON users FOR INSERT
  WITH CHECK (true);

-- RLS Policies for stellar_accounts table
CREATE POLICY "Users can view their own Stellar accounts"
  ON stellar_accounts FOR SELECT
  USING (user_id = auth.uid()::uuid);

CREATE POLICY "Service role can manage all accounts"
  ON stellar_accounts FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Anyone can insert accounts"
  ON stellar_accounts FOR INSERT
  WITH CHECK (true);

-- RLS Policies for trustlines table
CREATE POLICY "Users can view their own trustlines"
  ON trustlines FOR SELECT
  USING (
    stellar_account_id IN (
      SELECT id FROM stellar_accounts WHERE user_id = auth.uid()::uuid
    )
  );

CREATE POLICY "Service role can manage trustlines"
  ON trustlines FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Anyone can insert trustlines"
  ON trustlines FOR INSERT
  WITH CHECK (true);

-- RLS Policies for transactions_signed table
CREATE POLICY "Users can view their own transactions"
  ON transactions_signed FOR SELECT
  USING (
    stellar_account_id IN (
      SELECT id FROM stellar_accounts WHERE user_id = auth.uid()::uuid
    )
  );

CREATE POLICY "Service role can manage transactions"
  ON transactions_signed FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Anyone can insert transactions"
  ON transactions_signed FOR INSERT
  WITH CHECK (true);

-- RLS Policies for account_funding_log table
CREATE POLICY "Users can view their own funding history"
  ON account_funding_log FOR SELECT
  USING (user_id = auth.uid()::uuid);

CREATE POLICY "Service role can manage funding log"
  ON account_funding_log FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Anyone can insert funding logs"
  ON account_funding_log FOR INSERT
  WITH CHECK (true);

-- RLS Policies for account_activity table
CREATE POLICY "Users can view their own activity"
  ON account_activity FOR SELECT
  USING (
    stellar_account_id IN (
      SELECT id FROM stellar_accounts WHERE user_id = auth.uid()::uuid
    )
  );

CREATE POLICY "Service role can manage activity"
  ON account_activity FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Anyone can insert activity"
  ON account_activity FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- UPDATE TRIGGER: Update updated_at on users
-- ============================================================================
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at();

-- Update trigger for stellar_accounts
CREATE OR REPLACE FUNCTION update_stellar_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stellar_accounts_updated_at_trigger
  BEFORE UPDATE ON stellar_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_stellar_accounts_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get user's primary Stellar account
CREATE OR REPLACE FUNCTION get_user_stellar_account(user_id UUID)
RETURNS TABLE(
  id UUID,
  public_key VARCHAR(56),
  balance_native DECIMAL,
  network network_type
) AS $$
  SELECT id, public_key, balance_native, network
  FROM stellar_accounts
  WHERE stellar_accounts.user_id = $1
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Check if user has minimum balance
CREATE OR REPLACE FUNCTION check_minimum_balance(account_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  balance DECIMAL;
  minimum_required DECIMAL;
BEGIN
  SELECT balance_native INTO balance
  FROM stellar_accounts
  WHERE id = account_id;

  SELECT minimum_balance_xlm + (num_trustlines * 0.5) INTO minimum_required
  FROM stellar_accounts
  WHERE id = account_id;

  RETURN COALESCE(balance, 0) >= minimum_required;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
