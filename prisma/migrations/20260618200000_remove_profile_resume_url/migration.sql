-- Headless profile: drop file storage pointer from profiles.

ALTER TABLE "profiles" DROP COLUMN IF EXISTS "resumeUrl";
