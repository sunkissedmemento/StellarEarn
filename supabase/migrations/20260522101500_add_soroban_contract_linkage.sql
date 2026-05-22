-- ============================================================================
-- Add Soroban linkage fields for gigs and submissions
-- ============================================================================

ALTER TABLE gigs
  ADD COLUMN IF NOT EXISTS soroban_bounty_id BIGINT,
  ADD COLUMN IF NOT EXISTS creation_tx_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS creation_tx_xdr TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_gigs_soroban_bounty_id
  ON gigs(soroban_bounty_id)
  WHERE soroban_bounty_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gigs_creation_tx_hash
  ON gigs(creation_tx_hash)
  WHERE creation_tx_hash IS NOT NULL;

ALTER TABLE gig_submissions
  ADD COLUMN IF NOT EXISTS worker_stellar_public_key VARCHAR(56),
  ADD COLUMN IF NOT EXISTS soroban_submission_hash TEXT,
  ADD COLUMN IF NOT EXISTS submit_tx_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS submit_tx_xdr TEXT;

CREATE INDEX IF NOT EXISTS idx_gig_submissions_submit_tx_hash
  ON gig_submissions(submit_tx_hash)
  WHERE submit_tx_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gig_submissions_worker_stellar_public_key
  ON gig_submissions(worker_stellar_public_key)
  WHERE worker_stellar_public_key IS NOT NULL;

ALTER TABLE gig_submissions
  ADD CONSTRAINT valid_worker_stellar_public_key
  CHECK (
    worker_stellar_public_key IS NULL
    OR worker_stellar_public_key ~ '^G[A-Z2-7]{55}$'
  );
