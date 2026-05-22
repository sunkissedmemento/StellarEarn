# Technical Requirements: Non-Custodial Account System

## Overview

This document outlines the technical architecture required to support non-custodial Stellar account creation, management, and operations in the StellarEarn platform. The system is designed with the core principle: **encrypted secret keys live client-side only; the backend never touches private keys**.

---

## 1. Data Model

### 1.1 Core Tables

#### `users`
Stores basic user registration and Stellar account mapping.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  stellar_public_key VARCHAR(56) NOT NULL UNIQUE,
  account_created_at TIMESTAMP,
  account_status ENUM('pending', 'active', 'suspended', 'closed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  auth_provider ENUM('sep10', 'email') DEFAULT 'sep10',

  -- SEP-10 Challenge
  sep10_challenge_xdr TEXT,
  sep10_challenge_created_at TIMESTAMP,

  -- Account Health
  last_balance_check TIMESTAMP,
  minimum_balance_xlm DECIMAL(19, 7) DEFAULT 1.0,

  -- Metadata
  avatar_url TEXT,
  bio TEXT,
  location TEXT
);

-- Indexes for performance
CREATE INDEX idx_users_stellar_public_key ON users(stellar_public_key);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_account_status ON users(account_status);
```

---

#### `stellar_accounts`
Tracks detailed information about each user's Stellar account.

```sql
CREATE TABLE stellar_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_key VARCHAR(56) NOT NULL UNIQUE,

  -- Account Lifecycle
  account_created_on_network TIMESTAMP,
  funding_method ENUM('friendbot', 'createAccount', 'exchange', 'sponsor') DEFAULT 'friendbot',
  funding_txn_hash VARCHAR(64),

  -- Account State
  balance_native DECIMAL(19, 7) DEFAULT 0,
  balance_last_updated TIMESTAMP,

  -- Sequence Number (for transaction ordering)
  sequence_number BIGINT,
  sequence_updated_at TIMESTAMP,

  -- Reserve Requirements
  num_trustlines INT DEFAULT 0,
  num_signers INT DEFAULT 0,

  -- Network
  network ENUM('testnet', 'mainnet') DEFAULT 'testnet',

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stellar_accounts_user_id ON stellar_accounts(user_id);
CREATE INDEX idx_stellar_accounts_public_key ON stellar_accounts(public_key);
CREATE INDEX idx_stellar_accounts_network ON stellar_accounts(network);
```

---

#### `trustlines`
Tracks which custom assets a user has established trustlines for.

```sql
CREATE TABLE trustlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stellar_account_id UUID NOT NULL REFERENCES stellar_accounts(id) ON DELETE CASCADE,
  asset_code VARCHAR(12) NOT NULL,
  asset_issuer VARCHAR(56) NOT NULL,

  -- Trustline State
  balance DECIMAL(19, 7) DEFAULT 0,
  limit_amount DECIMAL(19, 7),

  -- Lifecycle
  created_at TIMESTAMP DEFAULT NOW(),
  established_on_network TIMESTAMP,

  -- Metadata
  is_authorized BOOLEAN DEFAULT TRUE,

  UNIQUE(stellar_account_id, asset_code, asset_issuer)
);

CREATE INDEX idx_trustlines_account_id ON trustlines(stellar_account_id);
CREATE INDEX idx_trustlines_asset ON trustlines(asset_code, asset_issuer);
```

---

#### `transactions_signed`
Audit trail of all transactions initiated by the platform (client signs them).

```sql
CREATE TABLE transactions_signed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stellar_account_id UUID NOT NULL REFERENCES stellar_accounts(id) ON DELETE CASCADE,

  -- Transaction Details
  txn_xdr TEXT NOT NULL,
  txn_hash VARCHAR(64) UNIQUE,

  -- Status
  status ENUM('pending_signature', 'signed', 'submitted', 'confirmed', 'failed') DEFAULT 'pending_signature',
  error_message TEXT,

  -- Operation Type
  operation_type VARCHAR(50),  -- 'createAccount', 'payment', 'changeTrust', etc.

  -- Financial Impact (for audit)
  amount_xlm DECIMAL(19, 7),
  destination_account VARCHAR(56),

  -- Lifecycle
  created_at TIMESTAMP DEFAULT NOW(),
  submitted_at TIMESTAMP,
  confirmed_at TIMESTAMP,
  horizon_txn_id VARCHAR(64),

  -- Metadata
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_transactions_account_id ON transactions_signed(stellar_account_id);
CREATE INDEX idx_transactions_status ON transactions_signed(status);
CREATE INDEX idx_transactions_hash ON transactions_signed(txn_hash);
```

---

#### `account_funding_log`
Track all funding events for reconciliation and accounting.

```sql
CREATE TABLE account_funding_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stellar_account_id UUID NOT NULL REFERENCES stellar_accounts(id) ON DELETE CASCADE,

  -- Funding Details
  funding_method ENUM('friendbot', 'createAccount', 'exchange', 'sponsor'),
  amount_xlm DECIMAL(19, 7),
  funding_source_account VARCHAR(56),

  -- Transaction
  funding_txn_hash VARCHAR(64),
  funding_txn_xdr TEXT,

  -- Status
  status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
  error_message TEXT,

  -- Lifecycle
  requested_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_funding_log_user_id ON account_funding_log(user_id);
CREATE INDEX idx_funding_log_account_id ON account_funding_log(stellar_account_id);
CREATE INDEX idx_funding_log_status ON account_funding_log(status);
```

---

#### `account_activity`
Real-time ledger of all account activities for monitoring and debugging.

```sql
CREATE TABLE account_activity (
  id BIGSERIAL PRIMARY KEY,
  stellar_account_id UUID NOT NULL REFERENCES stellar_accounts(id) ON DELETE CASCADE,

  -- Activity Type
  activity_type ENUM(
    'account_created', 'trustline_added', 'payment_sent', 'payment_received',
    'balance_updated', 'minimum_balance_alert', 'error'
  ),

  -- Details
  description TEXT,
  data JSONB,  -- Flexible storage for activity-specific data

  -- Sequence
  ledger_sequence BIGINT,
  txn_hash VARCHAR(64),

  -- Lifecycle
  recorded_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_activity_account_id (stellar_account_id),
  INDEX idx_activity_type (activity_type),
  INDEX idx_activity_ledger (ledger_sequence)
);
```

---

### 1.2 Row-Level Security (RLS)

All tables storing user data must have RLS policies enabled:

```sql
-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data"
  ON users FOR SELECT
  USING (auth.uid()::uuid = id);

CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE
  USING (auth.uid()::uuid = id);

-- Enable RLS on stellar_accounts
ALTER TABLE stellar_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own Stellar accounts"
  ON stellar_accounts FOR SELECT
  USING (user_id = auth.uid()::uuid);

CREATE POLICY "Service role can manage all accounts"
  ON stellar_accounts FOR ALL
  USING (auth.role() = 'service_role');
```

---

### 1.3 Data Integrity Constraints

```sql
-- Ensure public keys are valid Stellar format
ALTER TABLE users
  ADD CONSTRAINT valid_stellar_public_key
  CHECK (stellar_public_key ~ '^G[A-Z2-7]{56}$');

ALTER TABLE stellar_accounts
  ADD CONSTRAINT valid_stellar_public_key
  CHECK (public_key ~ '^G[A-Z2-7]{56}$');

-- Ensure asset issuer is valid
ALTER TABLE trustlines
  ADD CONSTRAINT valid_asset_issuer
  CHECK (asset_issuer ~ '^G[A-Z2-7]{56}$' OR asset_issuer = 'native');

-- Ensure numeric precision for financial data
ALTER TABLE stellar_accounts
  ADD CONSTRAINT valid_balance
  CHECK (balance_native >= 0);

ALTER TABLE trustlines
  ADD CONSTRAINT valid_balance
  CHECK (balance >= 0);
```

---

## 2. API Endpoints

### Authentication Context

All endpoints (except `/register` and `/sep10/*`) require a valid Supabase JWT token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

The JWT contains `sub` (user ID) used to enforce RLS and ownership checks.

---

### 2.1 User Registration & Authentication

#### `POST /api/auth/register`
Register a new user and initialize their Stellar account.

**Request:**
```json
{
  "email": "user@example.com",
  "username": "stellar_user",
  "stellar_public_key": "GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZB",
  "auth_provider": "sep10"
}
```

**Response (201):**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "stellar_public_key": "GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZB",
  "jwt_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "next_step": "fund_account"
}
```

**Error Responses:**
- `400` — Email or username already exists
- `422` — Invalid public key format
- `500` — Database error

---

#### `POST /api/auth/sep10/challenge`
Generate a SEP-10 authentication challenge for Freighter wallet signing.

**Request:**
```json
{
  "account": "GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZB",
  "home_domain": "stellarearn.local"
}
```

**Response (200):**
```json
{
  "transaction": "AAAAAgAAAABiB1GkNgCCy...", // XDR-encoded challenge tx
  "network_passphrase": "Test SDF Network ; September 2015",
  "challenge_expires_at": "2026-05-21T12:05:00Z"
}
```

**Logic:**
1. Generate a challenge transaction with current timestamp
2. Store XDR in `users.sep10_challenge_xdr` for 5-minute verification window
3. Return transaction for client to sign with Freighter

---

#### `POST /api/auth/sep10/verify`
Verify a signed SEP-10 challenge and issue JWT.

**Request:**
```json
{
  "transaction": "AAAAAgAAAABiB1GkNgCCy..." // Client-signed challenge XDR
}
```

**Response (200):**
```json
{
  "jwt_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "stellar_public_key": "GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZB"
  }
}
```

**Verification Logic:**
1. Verify signature is from user's public key
2. Verify timestamp in challenge is within 5 minutes
3. Issue JWT token
4. Clear `sep10_challenge_xdr` from database

---

### 2.2 Account Initialization

#### `POST /api/accounts/fund`
Fund a newly created user account on Stellar network.

**Request:**
```json
{
  "public_key": "GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZB",
  "network": "testnet",
  "funding_method": "friendbot"
}
```

**Response (202 Accepted):**
```json
{
  "account_id": "550e8400-e29b-41d4-a716-446655440001",
  "funding_log_id": "550e8400-e29b-41d4-a716-446655440002",
  "status": "pending",
  "message": "Funding in progress. Check status via GET /api/accounts/{account_id}/funding-status"
}
```

**Backend Logic:**
1. Validate public key format
2. Check if account already exists on network (via Horizon)
3. **Testnet:** Call Friendbot API
4. **Mainnet:** Create transaction from platform's master account (service role operation)
5. Submit transaction to Horizon
6. Poll for confirmation (up to 30 seconds)
7. Store funding transaction hash in `account_funding_log`

---

#### `GET /api/accounts/{account_id}/funding-status`
Poll funding status for an account.

**Response (200):**
```json
{
  "account_id": "550e8400-e29b-41d4-a716-446655440001",
  "status": "completed",
  "funding_txn_hash": "5d2f...",
  "balance_xlm": 10000.0,
  "minimum_balance_required": 2.5,
  "created_at": "2026-05-21T12:00:00Z"
}
```

---

### 2.3 Account Management

#### `GET /api/accounts/me`
Get the authenticated user's Stellar account details.

**Response (200):**
```json
{
  "account_id": "550e8400-e29b-41d4-a716-446655440001",
  "public_key": "GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZB",
  "account_status": "active",
  "balance_native": 1000.5,
  "sequence_number": "42949672961",
  "num_trustlines": 3,
  "num_signers": 1,
  "minimum_balance_required": 2.5,
  "health_status": "good",
  "last_balance_check": "2026-05-21T12:00:00Z",
  "network": "testnet"
}
```

---

#### `GET /api/accounts/{public_key}`
Get public account information (no auth required, but limited fields).

**Response (200):**
```json
{
  "public_key": "GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZB",
  "account_exists": true,
  "balance_native": 1000.5,
  "num_trustlines": 3,
  "reputation_score": 850,
  "total_bounties_completed": 12
}
```

---

#### `PUT /api/accounts/me`
Update user profile metadata associated with their account.

**Request:**
```json
{
  "avatar_url": "https://ipfs.io/ipfs/QmXxxx",
  "bio": "Stellar bounty hunter",
  "location": "San Francisco"
}
```

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "avatar_url": "https://ipfs.io/ipfs/QmXxxx",
  "bio": "Stellar bounty hunter",
  "location": "San Francisco",
  "updated_at": "2026-05-21T12:00:00Z"
}
```

---

### 2.4 Trustline Management

#### `POST /api/accounts/trustlines`
Prepare a changeTrust operation for the client to sign.

**Request:**
```json
{
  "asset_code": "EARN",
  "asset_issuer": "GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTQSXUSMIQ75UMIN5DQLWIFQ5",
  "limit": "1000000"
}
```

**Response (200):**
```json
{
  "transaction_xdr": "AAAAAgAAAABiB1GkNgCCy...",
  "memo": "Establish EARN trustline",
  "expires_at": "2026-05-21T12:05:00Z"
}
```

**Backend Logic:**
1. Fetch user's Stellar account (sequence number) from Horizon
2. Build changeTrust operation
3. Return unsigned XDR for client to sign and submit
4. Client submits signed transaction directly to Horizon (or via POST below)

---

#### `POST /api/accounts/trustlines/submit`
Submit a signed changeTrust transaction for confirmation tracking.

**Request:**
```json
{
  "transaction_xdr": "AAAAAgAAAABiB1GkNgCCy...", // Signed by client
  "asset_code": "EARN",
  "asset_issuer": "GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTQSXUSMIQ75UMIN5DQLWIFQ5"
}
```

**Response (202 Accepted):**
```json
{
  "trustline_id": "550e8400-e29b-41d4-a716-446655440005",
  "status": "pending",
  "asset_code": "EARN",
  "limit": "1000000",
  "created_at": "2026-05-21T12:00:00Z"
}
```

---

#### `GET /api/accounts/me/trustlines`
List all trustlines for the authenticated user's account.

**Response (200):**
```json
[
  {
    "trustline_id": "550e8400-e29b-41d4-a716-446655440005",
    "asset_code": "EARN",
    "asset_issuer": "GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTQSXUSMIQ75UMIN5DQLWIFQ5",
    "balance": "250.5",
    "limit_amount": "1000000",
    "is_authorized": true,
    "created_at": "2026-05-21T11:00:00Z"
  }
]
```

---

### 2.5 Transaction Management

#### `POST /api/transactions/prepare`
Prepare an unsigned transaction for the client to sign (generic).

**Request:**
```json
{
  "operations": [
    {
      "type": "payment",
      "destination": "GDZST3XVCDTUJ76ZAV2HA72KYRUV4E5LSUQHMHQY6GPMQ6RWHMCHSPJS",
      "asset": { "code": "EARN", "issuer": "GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTQSXUSMIQ75UMIN5DQLWIFQ5" },
      "amount": "100"
    }
  ],
  "memo": "Payment for bounty #42"
}
```

**Response (200):**
```json
{
  "transaction_xdr": "AAAAAgAAAABiB1GkNgCCy...",
  "fee_estimate": {
    "base_fee_stroops": 100,
    "num_operations": 1,
    "total_fee_stroops": 100
  },
  "expires_at": "2026-05-21T12:05:00Z"
}
```

---

#### `POST /api/transactions/submit`
Submit a client-signed transaction.

**Request:**
```json
{
  "transaction_xdr": "AAAAAgAAAABiB1GkNgCCy...", // Signed by client
  "operation_type": "payment",
  "destination_account": "GDZST3XVCDTUJ76ZAV2HA72KYRUV4E5LSUQHMHQY6GPMQ6RWHMCHSPJS",
  "amount_xlm": "100"
}
```

**Response (202 Accepted):**
```json
{
  "transaction_id": "550e8400-e29b-41d4-a716-446655440010",
  "status": "submitted",
  "txn_hash": "5d2f...",
  "submitted_at": "2026-05-21T12:00:00Z"
}
```

---

#### `GET /api/transactions/{txn_hash}`
Get transaction status and details.

**Response (200):**
```json
{
  "transaction_id": "550e8400-e29b-41d4-a716-446655440010",
  "txn_hash": "5d2f...",
  "status": "confirmed",
  "operation_type": "payment",
  "amount": "100",
  "destination": "GDZST3XVCDTUJ76ZAV2HA72KYRUV4E5LSUQHMHQY6GPMQ6RWHMCHSPJS",
  "confirmed_at": "2026-05-21T12:00:15Z",
  "ledger_sequence": 47493729
}
```

---

#### `GET /api/transactions/me`
Get transaction history for authenticated user.

**Query Parameters:**
- `limit=20` — Number of transactions (default 20, max 100)
- `offset=0` — Pagination offset
- `status=confirmed` — Filter by status

**Response (200):**
```json
{
  "transactions": [
    {
      "transaction_id": "550e8400-e29b-41d4-a716-446655440010",
      "txn_hash": "5d2f...",
      "status": "confirmed",
      "operation_type": "payment",
      "amount": "100",
      "direction": "out",
      "counterparty": "GDZST3XVCDTUJ76ZAV2HA72KYRUV4E5LSUQHMHQY6GPMQ6RWHMCHSPJS",
      "timestamp": "2026-05-21T12:00:15Z"
    }
  ],
  "total_count": 47,
  "limit": 20,
  "offset": 0
}
```

---

### 2.6 Balance & Health Monitoring

#### `GET /api/accounts/me/balance`
Get current balance and account health.

**Response (200):**
```json
{
  "balance_native": 1000.5,
  "balance_other": [
    {
      "asset_code": "EARN",
      "asset_issuer": "GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTQSXUSMIQ75UMIN5DQLWIFQ5",
      "balance": "250.5"
    }
  ],
  "minimum_balance_required": 2.5,
  "available_balance": 998.0,
  "health_status": "good",
  "warning_flags": [],
  "last_updated": "2026-05-21T12:00:00Z"
}
```

---

#### `POST /api/accounts/refresh-balance`
Manually trigger a balance update from Horizon (async).

**Response (202 Accepted):**
```json
{
  "account_id": "550e8400-e29b-41d4-a716-446655440001",
  "refresh_status": "in_progress",
  "message": "Balance refresh initiated. Poll GET /api/accounts/me/balance"
}
```

---

### 2.7 Activity & Audit

#### `GET /api/accounts/me/activity`
Get activity feed for account (all trustline, payment, and error events).

**Query Parameters:**
- `limit=50` — Number of activities
- `offset=0` — Pagination

**Response (200):**
```json
{
  "activities": [
    {
      "activity_id": "550e8400-e29b-41d4-a716-446655440020",
      "activity_type": "payment_sent",
      "description": "Sent 100 EARN to GDZST3XVCDTUJ76ZAV2HA72KYRUV4E5LSUQHMHQY6GPMQ6RWHMCHSPJS",
      "timestamp": "2026-05-21T12:00:15Z",
      "ledger_sequence": 47493729,
      "txn_hash": "5d2f..."
    },
    {
      "activity_id": "550e8400-e29b-41d4-a716-446655440021",
      "activity_type": "trustline_added",
      "description": "Established trustline for EARN",
      "timestamp": "2026-05-21T11:00:00Z",
      "ledger_sequence": 47493700
    }
  ],
  "total_count": 125
}
```

---

### 2.8 Admin & Platform Operations

#### `POST /api/admin/accounts/fund-batch` (Service Role Only)
Bulk-fund accounts from platform's master account.

**Request:**
```json
{
  "accounts": [
    { "public_key": "GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZB", "amount_xlm": 2.5 },
    { "public_key": "GDZST3XVCDTUJ76ZAV2HA72KYRUV4E5LSUQHMHQY6GPMQ6RWHMCHSPJS", "amount_xlm": 2.5 }
  ]
}
```

**Response (202 Accepted):**
```json
{
  "batch_id": "550e8400-e29b-41d4-a716-446655440030",
  "total_accounts": 2,
  "status": "processing"
}
```

---

#### `GET /api/admin/funding-status`
Get platform funding account health (service role only).

**Response (200):**
```json
{
  "master_account": "GBBD47UZQ2YWJCZP7FT7H7SQQTPAQXWHZJ5IXQG4F7ETFQVVHPAPGQ5",
  "balance_xlm": 50000.0,
  "funded_accounts_count": 1250,
  "total_funding_cost": 3500.0,
  "health_status": "good"
}
```

---

## 3. Error Handling Strategy

### Standard Error Response Format

All errors should return consistent JSON:

```json
{
  "error": {
    "code": "INVALID_ACCOUNT",
    "message": "Stellar account not found on network",
    "details": {
      "public_key": "GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZB",
      "network": "testnet"
    },
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Common Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `INVALID_ACCOUNT` | 404 | Stellar account does not exist on network |
| `INSUFFICIENT_BALANCE` | 422 | Account lacks XLM for operation |
| `TRUSTLINE_LIMIT_EXCEEDED` | 422 | Trustline limit already established for asset |
| `INVALID_PUBLIC_KEY` | 400 | Public key format invalid |
| `UNAUTHORIZED` | 401 | JWT token missing or invalid |
| `FORBIDDEN` | 403 | User lacks permission for resource |
| `DUPLICATE_ACCOUNT` | 409 | User already has account for this network |
| `TXN_SUBMISSION_FAILED` | 500 | Horizon rejected transaction |
| `SEQUENCE_NUMBER_MISMATCH` | 409 | Account sequence changed; retry |

---

## 4. Integration Points

### 4.1 Supabase Integration

- **Auth:** Use Supabase JWT for authorization
- **Database:** Store all data in Supabase PostgreSQL with RLS
- **Storage:** IPFS hashes stored in Supabase (actual files on IPFS)
- **Real-time:** Use Supabase subscriptions for activity feed

### 4.2 Stellar SDK Integration

- **JS SDK:** `@stellar/stellar-sdk` for client-side keypair generation
- **Horizon API:** Query account details, submit transactions
- **SEP-10:** Implement challenge/response flow for non-custodial auth

### 4.3 External Services

- **Friendbot:** Testnet account funding (testnet only)
- **IPFS:** Store avatar/document files (client upload)
- **Freighter Wallet:** User signs transactions client-side

---

## 5. Security Considerations

### 5.1 Key Principles

1. **Private keys never leave the client**
   - Encrypt with user PIN before localStorage
   - Decryption happens only on user action
   - Derivation happens client-side only

2. **Every backend operation is authenticated**
   - RLS policies enforce ownership
   - Service role used only for platform operations
   - Request IDs logged for audit trail

3. **All financial operations are audited**
   - Every transaction stored in `transactions_signed`
   - Every balance change tracked in `account_activity`
   - Funding operations immutable once confirmed

### 5.2 Input Validation (Zod Schemas)

```typescript
// Account creation
const RegisterSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
  stellar_public_key: z.string().regex(/^G[A-Z2-7]{56}$/),
});

// Trustline operation
const AddTrustlineSchema = z.object({
  asset_code: z.string().length(12),
  asset_issuer: z.string().regex(/^G[A-Z2-7]{56}$/),
  limit: z.string().regex(/^\d+(\.\d+)?$/),
});

// Transaction submission
const SubmitTransactionSchema = z.object({
  transaction_xdr: z.string().min(100),
  operation_type: z.enum(['payment', 'createAccount', 'changeTrust']),
  destination_account: z.string().regex(/^G[A-Z2-7]{56}$/).optional(),
  amount_xlm: z.string().regex(/^\d+(\.\d+)?$/).optional(),
});
```

---

## 6. Sequence Diagrams

### Account Creation Flow

```
User Client                  Backend                Stellar Network
   |                            |                          |
   |--1. POST /register-------->|                          |
   |    (public_key)            |                          |
   |                            |--2. Query Horizon------>|
   |                            |<---Account check--------|
   |                            |                          |
   |                            |--3. Call Friendbot----->|
   |                            |<---Fund (testnet)-------|
   |                            |                          |
   |<--201 with JWT/next_step---|                          |
```

### Transaction Signing Flow

```
Freighter Wallet            User Client              Backend                Horizon
   |                            |                        |                      |
   |<--User signs tx in UI       |                        |                      |
   |                    |--1. GET /prepare-tx----------->|                      |
   |                    |<---Unsigned XDR----------------|                      |
   |                    |                                 |                      |
   |<--------Sign (client-side)                           |                      |
   |                    |                                 |                      |
   |                    |--2. POST /submit (signed)------>|                      |
   |                    |        (user confirms intent)   |                      |
   |                    |<---202 Accepted + hash---------|                      |
   |                    |                                 |--3. Submit to Horizon-->|
   |                    |                                 |<---Confirmed----------|
   |                    |<---GET /status returns "confirmed"
```

---

## 7. Performance & Scalability

### Caching Strategy

- **Balance cache:** TTL 30 seconds (refresh on demand)
- **Account info cache:** TTL 60 seconds
- **Horizon queries:** Cache responses in Redis for 10-30 seconds
- **Transaction history:** Pagination to limit result sets

### Rate Limiting

```
Public endpoints (no auth):    10 req/min per IP
Authenticated endpoints:       100 req/min per user
Fund account endpoint:         1 req/hour per user
Batch admin operations:        10 req/min per service role
```

### Database Indexes

All queries must use indexes on:
- `users.stellar_public_key`
- `users.email`
- `stellar_accounts.user_id`
- `stellar_accounts.public_key`
- `transactions_signed.stellar_account_id`
- `transactions_signed.status`
- `account_activity.stellar_account_id`

---

## 8. Monitoring & Alerts

### Key Metrics

- Funding success rate (% of accounts funded within 2 min)
- Account health (% with balance > minimum reserve)
- Transaction success rate (% confirmed within 60 sec)
- Average balance per account
- Master account balance (critical if below 5 XLM)

### Alerts

- [ ] Master account balance < 10 XLM (mainnet funding risk)
- [ ] Account health < 70% (minimum balance violations)
- [ ] Transaction failure rate > 5%
- [ ] Funding latency > 30 seconds (avg)
- [ ] Horizon API downtime > 1 minute

---

## 9. Migration & Deployment

### Database Migration Checklist

1. Create all tables (§1.1)
2. Add RLS policies (§1.2)
3. Add constraints (§1.3)
4. Create indexes on all foreign keys + query columns
5. Seed `users`, `stellar_accounts` if migrating from another system
6. Test RLS policies with test users

### Backend Deployment Checklist

1. Set `STELLAR_NETWORK` env var (testnet/mainnet)
2. Set `MASTER_ACCOUNT_SECRET` (service role only, never on client)
3. Set `FRIENDBOT_URL` (testnet: `https://friendbot.stellar.org`)
4. Configure Supabase service role client
5. Enable RLS on all tables
6. Test key operations (register, fund, balance check)

---

## 10. References

- **Stellar Documentation**: https://developers.stellar.org
- **SEP-10 Protocol**: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0010.md
- **Freighter API**: https://docs.freighter.app
- **Supabase Documentation**: https://supabase.com/docs
- **@stellar/stellar-sdk**: https://stellar.github.io/js-stellar-sdk/

---

**Version:** 1.0.0
**Last Updated:** May 21, 2026
**Status:** Ready for Implementation
