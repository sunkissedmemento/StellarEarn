# Supabase Setup Guide

This guide walks you through setting up the StellarEarn database schema in Supabase.

## Prerequisites

- Supabase account (https://supabase.com)
- Supabase CLI installed: `npm install -g supabase`
- Node.js 18+

## Step 1: Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Choose your organization
4. Enter project name: `stellarearn`
5. Set a strong database password
6. Choose your region (pick closest to users)
7. Click "Create new project" and wait 2-3 minutes

## Step 2: Get Your Credentials

Once your project is created:

1. Go to **Settings → API** in the Supabase dashboard
2. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY` (🔒 keep this secret!)

## Step 3: Link Your Local Project

```bash
# Login to Supabase CLI
supabase login

# Link to your remote project
supabase link --project-ref YOUR_PROJECT_ID

# You can find YOUR_PROJECT_ID in the Supabase dashboard URL
# https://app.supabase.com/project/YOUR_PROJECT_ID
```

## Step 4: Deploy the Schema

```bash
# Apply the migration to your remote project
supabase db push

# This will:
# - Create all tables
# - Set up indexes
# - Configure RLS policies
# - Create helper functions
```

Confirm the migration by typing `y` when prompted.

## Step 5: Add Environment Variables

Copy the credentials from Step 2 into your `.env.local` file:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stellar
NEXT_PUBLIC_STELLAR_NETWORK=testnet
```

## Step 6: Test Your Setup

```bash
# Start the dev server
npm run dev

# Test the registration endpoint
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "stellar_public_key": "GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZB"
  }'
```

Expected response (201):
```json
{
  "user_id": "...",
  "email": "test@example.com",
  "next_step": "fund_account"
}
```

## Step 7: Fund a Test Account

```bash
# Fund the account you just created
curl -X POST http://localhost:3000/api/accounts/fund \
  -H "Content-Type: application/json" \
  -d '{
    "public_key": "GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZB",
    "network": "testnet"
  }'
```

Expected response (200):
```json
{
  "account_id": "...",
  "status": "completed",
  "balance": 10000,
  "message": "Account successfully funded!"
}
```

## Troubleshooting

### "Missing Supabase environment variables"
- Double-check `.env.local` has all required vars
- Verify no typos in variable names
- Restart dev server after updating `.env.local`

### "Project not linked"
```bash
supabase link --project-ref YOUR_PROJECT_ID
supabase db push
```

### Database migration failed
1. Check the Supabase dashboard for migration errors
2. Verify the SQL syntax in `supabase/migrations/`
3. Try running migrations again: `supabase db push`

### RLS policies blocking queries
This is expected! RLS policies enforce security:
- Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` for client operations
- Use `SUPABASE_SERVICE_ROLE_KEY` for server-side admin operations
- Never expose service role key to the client

### "Account already exists" error on registration
The email or username is already registered. Try a different one.

## Local Development

For local testing without deploying to Supabase cloud:

```bash
# Start local Supabase stack
supabase start

# This runs PostgreSQL locally on port 54322
# Dashboard available at http://localhost:54323

# Apply migrations locally
supabase migration up

# Stop when done
supabase stop
```

## Next Steps

1. ✅ Schema deployed
2. ⬜ Implement SEP-10 authentication (`app/api/auth/sep10/`)
3. ⬜ Add trustline management endpoints
4. ⬜ Integrate Stellar SDK for transaction signing
5. ⬜ Build user dashboard to view accounts/balance

## Files Created

```
supabase/
  migrations/
    20260521120000_init_schema.sql     # Main schema
  .env.example                          # Config template

lib/
  supabase.ts                           # Client setup
  database.types.ts                     # TypeScript types

app/api/
  auth/
    register/route.ts                   # User registration
  accounts/
    fund/route.ts                       # Fund account
    [public_key]/route.ts               # Get account info
```

## References

- [Supabase Docs](https://supabase.com/docs)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Stellar Docs](https://developers.stellar.org)
- [SEP-10 Authentication](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0010.md)

---

**Need help?** Check the Supabase dashboard or run:
```bash
supabase status
```
