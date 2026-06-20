-- Consolidate resume data onto profiles; drop unused child tables and architectures.
-- Fresh-start migration: existing career rows are not preserved.

DROP TABLE IF EXISTS "certifications" CASCADE;
DROP TABLE IF EXISTS "educations" CASCADE;
DROP TABLE IF EXISTS "experiences" CASCADE;
DROP TABLE IF EXISTS "projects" CASCADE;
DROP TABLE IF EXISTS "architectures" CASCADE;

ALTER TABLE "profiles" DROP COLUMN IF EXISTS "minSalary";
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "workMode";
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "coreCompetencies";

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "content" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "calibrationScore" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "profiles_targetTitle_idx" ON "profiles"("targetTitle");
