-- ============================================================================
-- Create gigs table for sponsor-created opportunities
-- ============================================================================

CREATE TABLE IF NOT EXISTS gigs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  org TEXT NOT NULL,
  initials VARCHAR(2) NOT NULL,
  prize_php INT NOT NULL CHECK (prize_php > 0),
  type TEXT NOT NULL DEFAULT 'bounty' CHECK (type IN ('bounty', 'project')),
  skill TEXT NOT NULL CHECK (skill IN ('content', 'design', 'dev', 'research')),
  deadline_at DATE NOT NULL,
  description TEXT NOT NULL,
  deliverables TEXT[] NOT NULL DEFAULT '{}',
  sponsor_name TEXT,
  sponsor_wallet VARCHAR(56),
  live BOOLEAN NOT NULL DEFAULT true,
  featured BOOLEAN NOT NULL DEFAULT false,
  submissions INT NOT NULL DEFAULT 0 CHECK (submissions >= 0),
  fee_xlm NUMERIC(10, 2) NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_deadline CHECK (deadline_at >= CURRENT_DATE),
  CONSTRAINT valid_sponsor_wallet CHECK (sponsor_wallet IS NULL OR sponsor_wallet ~ '^G[A-Z2-7]{55}$')
);

CREATE INDEX IF NOT EXISTS idx_gigs_created_at ON gigs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gigs_created_by_user_id ON gigs(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_gigs_type ON gigs(type);
CREATE INDEX IF NOT EXISTS idx_gigs_skill ON gigs(skill);
CREATE INDEX IF NOT EXISTS idx_gigs_deadline ON gigs(deadline_at ASC);

ALTER TABLE gigs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'gigs' AND policyname = 'Anyone can read gigs'
  ) THEN
    CREATE POLICY "Anyone can read gigs"
      ON gigs FOR SELECT
      USING (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'gigs' AND policyname = 'Service role can manage gigs'
  ) THEN
    CREATE POLICY "Service role can manage gigs"
      ON gigs FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION update_gigs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_gigs_updated_at_trigger ON gigs;
CREATE TRIGGER update_gigs_updated_at_trigger
  BEFORE UPDATE ON gigs
  FOR EACH ROW
  EXECUTE FUNCTION update_gigs_updated_at();
