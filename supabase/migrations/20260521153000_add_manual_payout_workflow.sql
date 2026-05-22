-- ============================================================================
-- Manual payout workflow (Approve & Pay via Freighter + Horizon)
-- ============================================================================

ALTER TABLE gigs
  ADD COLUMN IF NOT EXISTS paid_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_tx_hash VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_gigs_paid_by_user_id ON gigs(paid_by_user_id);
CREATE INDEX IF NOT EXISTS idx_gigs_payment_tx_hash ON gigs(payment_tx_hash);

ALTER TABLE gig_submissions
  ADD COLUMN IF NOT EXISTS approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payout_tx_hash VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_gig_submissions_approved_by_user_id ON gig_submissions(approved_by_user_id);
CREATE INDEX IF NOT EXISTS idx_gig_submissions_payout_tx_hash ON gig_submissions(payout_tx_hash);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_gig_status'
  ) THEN
    ALTER TABLE gigs DROP CONSTRAINT valid_gig_status;
  END IF;
END
$$;

ALTER TABLE gigs
  ADD CONSTRAINT valid_gig_status CHECK (status IN ('open', 'pending_review', 'closed', 'paid'));
