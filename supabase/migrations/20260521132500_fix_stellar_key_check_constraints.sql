-- Fix Stellar public key check constraints.
-- Stellar public keys are 56 chars total: 'G' + 55 base32 chars.

DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE users
      DROP CONSTRAINT IF EXISTS valid_stellar_public_key;
    ALTER TABLE users
      ADD CONSTRAINT valid_stellar_public_key
      CHECK (stellar_public_key ~ '^G[A-Z2-7]{55}$');
  END IF;

  IF to_regclass('public.stellar_accounts') IS NOT NULL THEN
    ALTER TABLE stellar_accounts
      DROP CONSTRAINT IF EXISTS valid_stellar_public_key;
    ALTER TABLE stellar_accounts
      ADD CONSTRAINT valid_stellar_public_key
      CHECK (public_key ~ '^G[A-Z2-7]{55}$');
  END IF;

  IF to_regclass('public.trustlines') IS NOT NULL THEN
    ALTER TABLE trustlines
      DROP CONSTRAINT IF EXISTS valid_asset_issuer;
    ALTER TABLE trustlines
      ADD CONSTRAINT valid_asset_issuer
      CHECK (asset_issuer ~ '^G[A-Z2-7]{55}$');
  END IF;

  IF to_regclass('public.stellar_operations') IS NOT NULL THEN
    ALTER TABLE stellar_operations
      DROP CONSTRAINT IF EXISTS valid_destination;
    ALTER TABLE stellar_operations
      ADD CONSTRAINT valid_destination
      CHECK (destination_account IS NULL OR destination_account ~ '^G[A-Z2-7]{55}$');
  END IF;

  IF to_regclass('public.funding_transactions') IS NOT NULL THEN
    ALTER TABLE funding_transactions
      DROP CONSTRAINT IF EXISTS valid_source_account;
    ALTER TABLE funding_transactions
      ADD CONSTRAINT valid_source_account
      CHECK (funding_source_account IS NULL OR funding_source_account ~ '^G[A-Z2-7]{55}$');
  END IF;
END $$;
