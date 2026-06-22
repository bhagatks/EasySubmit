-- One-click apply user preference + job-specific tailored resume link
ALTER TABLE "users" ADD COLUMN "oneClickApply" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "job_tracker_entries" ADD COLUMN "tailoredProfileId" TEXT;

ALTER TABLE "job_tracker_entries" ADD CONSTRAINT "job_tracker_entries_tailoredProfileId_fkey"
  FOREIGN KEY ("tailoredProfileId") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "job_tracker_entries_tailoredProfileId_idx" ON "job_tracker_entries"("tailoredProfileId");
