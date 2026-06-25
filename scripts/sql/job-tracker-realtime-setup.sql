-- =============================================================================
-- Job Tracker Realtime — publication + RLS (Finding 5)
-- =============================================================================
-- Supabase Dashboard → SQL Editor → Run this entire file
-- Project: EasySubmitQA (dwccqrbpwbnuoiihpgth)
--
-- Enables postgres_changes on job_tracker_entries for dashboard + extension sync.
-- Prisma/server writes are unchanged (direct Postgres role bypasses RLS).
-- Safe to re-run.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'job_tracker_entries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE job_tracker_entries;
  END IF;
END $$;

ALTER TABLE job_tracker_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own job tracker rows" ON job_tracker_entries;

CREATE POLICY "Users read own job tracker rows"
  ON job_tracker_entries
  FOR SELECT
  TO authenticated
  USING ("userId" = (auth.jwt() ->> 'sub'));
