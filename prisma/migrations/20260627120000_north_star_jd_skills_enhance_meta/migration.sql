-- North-star resume enhance: JD skills vocabulary cache + tailor enhance metadata
ALTER TABLE "job_tracker_entries"
  ADD COLUMN IF NOT EXISTS "jdSkillsVocabulary" JSONB,
  ADD COLUMN IF NOT EXISTS "jdSkillsHash" TEXT;

ALTER TABLE "job_resume_tailors"
  ADD COLUMN IF NOT EXISTS "enhanceMeta" JSONB;
