-- Add systemAiEnabled flag to User model
-- Free users can toggle system AI access; defaults to true (enabled)
ALTER TABLE "users" ADD COLUMN "systemAiEnabled" BOOLEAN NOT NULL DEFAULT true;
