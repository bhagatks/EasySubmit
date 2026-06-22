-- EasySubmit — start fresh on job tracking data
-- Run in Supabase SQL editor or: psql $DATABASE_URL -f scripts/sql/clean-legacy-job-data.sql
--
-- Safe to re-run. Does NOT delete profiles or resume content — only job-tracking artifacts.

BEGIN;

-- 1) Empty Job Tracker table (Postgres source of truth going forward)
TRUNCATE TABLE job_tracker_entries;

-- 2) Remove legacy applications[] embedded in profiles.content JSONB
--    (old ArchitectureApplication placeholder — not used by dashboard anymore)
UPDATE profiles
SET
  content = (
    CASE
      WHEN content ? 'metadata'
        AND jsonb_typeof(content -> 'metadata') = 'object'
      THEN jsonb_set(
        content,
        '{metadata}',
        (content -> 'metadata') - 'applications'
      )
      ELSE content
    END
  ) - 'applications'
WHERE content ? 'applications'
   OR (
     content ? 'metadata'
     AND jsonb_typeof(content -> 'metadata') = 'object'
     AND content -> 'metadata' ? 'applications'
   );

COMMIT;

-- 3) Verify cleanup (should return 0 rows)
SELECT
  id,
  "userId",
  content ? 'applications' AS has_root_applications,
  (
    content ? 'metadata'
    AND content -> 'metadata' ? 'applications'
  ) AS has_metadata_applications
FROM profiles
WHERE content ? 'applications'
   OR (
     content ? 'metadata'
     AND content -> 'metadata' ? 'applications'
   );

SELECT COUNT(*) AS job_tracker_rows FROM job_tracker_entries;
