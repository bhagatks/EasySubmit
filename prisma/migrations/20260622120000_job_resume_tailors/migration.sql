-- Per-job resume overrides (Option B) — drop full profile clones per application.

CREATE TABLE "job_resume_tailors" (
  "id" TEXT NOT NULL,
  "jobTrackerEntryId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sourceProfileId" TEXT NOT NULL,
  "overrides" JSONB NOT NULL DEFAULT '{}',
  "changedSections" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "enhanceTraceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "job_resume_tailors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "job_resume_tailors_jobTrackerEntryId_key" ON "job_resume_tailors"("jobTrackerEntryId");
CREATE INDEX "job_resume_tailors_userId_idx" ON "job_resume_tailors"("userId");
CREATE INDEX "job_resume_tailors_sourceProfileId_idx" ON "job_resume_tailors"("sourceProfileId");

ALTER TABLE "job_resume_tailors"
  ADD CONSTRAINT "job_resume_tailors_jobTrackerEntryId_fkey"
  FOREIGN KEY ("jobTrackerEntryId") REFERENCES "job_tracker_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_resume_tailors"
  ADD CONSTRAINT "job_resume_tailors_sourceProfileId_fkey"
  FOREIGN KEY ("sourceProfileId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "job_resume_tailors"
  ADD CONSTRAINT "job_resume_tailors_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_tracker_entries" DROP CONSTRAINT IF EXISTS "job_tracker_entries_tailoredProfileId_fkey";
DROP INDEX IF EXISTS "job_tracker_entries_tailoredProfileId_idx";
ALTER TABLE "job_tracker_entries" DROP COLUMN IF EXISTS "tailoredProfileId";
