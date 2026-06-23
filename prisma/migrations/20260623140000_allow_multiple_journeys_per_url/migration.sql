-- DropIndex
DROP INDEX "job_tracker_entries_userId_urlHash_key";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "applicationProfile" JSONB,
ADD COLUMN     "customizeResume" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "job_tracker_entries_userId_urlHash_idx" ON "job_tracker_entries"("userId", "urlHash");
