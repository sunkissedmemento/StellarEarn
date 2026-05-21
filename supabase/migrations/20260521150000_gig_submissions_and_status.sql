-- ============================================================================
-- Web2 gig workflow: reward fields + submission tracking + pending review state
-- ============================================================================

ALTER TABLE gigs
  ADD COLUMN IF NOT EXISTS reward_amount NUMERIC(18, 2),
  ADD COLUMN IF NOT EXISTS reward_unit TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT;

UPDATE gigs
SET
  reward_amount = COALESCE(reward_amount, prize_php::numeric),
  reward_unit = COALESCE(reward_unit, 'XLM'),
  status = COALESCE(status, 'open');

ALTER TABLE gigs
  ALTER COLUMN reward_amount SET NOT NULL,
  ALTER COLUMN reward_unit SET NOT NULL,
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE gigs
  ALTER COLUMN reward_unit SET DEFAULT 'XLM',
  ALTER COLUMN status SET DEFAULT 'open';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_reward_amount'
  ) THEN
    ALTER TABLE gigs ADD CONSTRAINT valid_reward_amount CHECK (reward_amount > 0);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_reward_unit'
  ) THEN
    ALTER TABLE gigs ADD CONSTRAINT valid_reward_unit CHECK (reward_unit IN ('XLM', 'PHP', 'USDC'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_gig_status'
  ) THEN
    ALTER TABLE gigs ADD CONSTRAINT valid_gig_status CHECK (status IN ('open', 'pending_review', 'closed'));
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS gig_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  worker_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  worker_name TEXT,
  submission_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,

  CONSTRAINT valid_submission_status CHECK (status IN ('pending_review', 'approved', 'rejected')),
  CONSTRAINT valid_submission_url CHECK (submission_url ~* '^https?://')
);

CREATE INDEX IF NOT EXISTS idx_gig_submissions_gig_id ON gig_submissions(gig_id);
CREATE INDEX IF NOT EXISTS idx_gig_submissions_worker_user_id ON gig_submissions(worker_user_id);
CREATE INDEX IF NOT EXISTS idx_gig_submissions_status ON gig_submissions(status);
CREATE INDEX IF NOT EXISTS idx_gig_submissions_submitted_at ON gig_submissions(submitted_at DESC);

ALTER TABLE gig_submissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'gig_submissions' AND policyname = 'Anyone can read gig submissions'
  ) THEN
    CREATE POLICY "Anyone can read gig submissions"
      ON gig_submissions FOR SELECT
      USING (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'gig_submissions' AND policyname = 'Service role can manage gig submissions'
  ) THEN
    CREATE POLICY "Service role can manage gig submissions"
      ON gig_submissions FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END
$$;
