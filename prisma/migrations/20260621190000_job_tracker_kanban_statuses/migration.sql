-- Kanban pipeline statuses for Job Tracker (replaces SAVED with CAPTURED + resume/apply stages)
-- Run after 20260621180000_job_tracker_entries. Safe on empty job_tracker_entries.

BEGIN;

TRUNCATE TABLE job_tracker_entries;

ALTER TYPE "JobTrackerStatus" RENAME VALUE 'SAVED' TO 'CAPTURED';

ALTER TYPE "JobTrackerStatus" ADD VALUE IF NOT EXISTS 'RESUME_READY';
ALTER TYPE "JobTrackerStatus" ADD VALUE IF NOT EXISTS 'READY_TO_APPLY';

ALTER TABLE job_tracker_entries ALTER COLUMN status SET DEFAULT 'CAPTURED';

COMMIT;
