-- CreateEnum
CREATE TYPE "JobTrackerStatus" AS ENUM ('SAVED', 'APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "job_tracker_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "canonicalUrl" TEXT NOT NULL,
    "urlHash" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT,
    "location" TEXT,
    "salaryText" TEXT,
    "description" TEXT,
    "platform" TEXT,
    "status" "JobTrackerStatus" NOT NULL DEFAULT 'SAVED',
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_tracker_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_tracker_entries_userId_status_idx" ON "job_tracker_entries"("userId", "status");

-- CreateIndex
CREATE INDEX "job_tracker_entries_userId_savedAt_idx" ON "job_tracker_entries"("userId", "savedAt");

-- CreateIndex
CREATE UNIQUE INDEX "job_tracker_entries_userId_urlHash_key" ON "job_tracker_entries"("userId", "urlHash");

-- AddForeignKey
ALTER TABLE "job_tracker_entries" ADD CONSTRAINT "job_tracker_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
