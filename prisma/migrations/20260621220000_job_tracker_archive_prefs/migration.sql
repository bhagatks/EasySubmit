-- AlterTable
ALTER TABLE "users" ADD COLUMN "autoArchiveAppliedJobs" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "job_tracker_entries" ADD COLUMN "archivedAt" TIMESTAMP(3);
