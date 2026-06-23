-- Cached JD Brain output on saved jobs
ALTER TABLE "job_tracker_entries"
  ADD COLUMN IF NOT EXISTS "jdIntelligence" JSONB,
  ADD COLUMN IF NOT EXISTS "jdIntelUpdatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "jdDescriptionHash" TEXT;
