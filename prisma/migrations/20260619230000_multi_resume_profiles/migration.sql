-- Multi resume profiles per user; architecture linked to profile (not user).
-- Safe to re-run pieces via DO blocks where columns may already exist from partial applies.

-- profiles: allow many per user + default flag
DO $$ BEGIN
  ALTER TABLE "profiles" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DROP INDEX IF EXISTS "profiles_userId_key";

CREATE INDEX IF NOT EXISTS "profiles_userId_idx" ON "profiles"("userId");
CREATE INDEX IF NOT EXISTS "profiles_userId_isDefault_idx" ON "profiles"("userId", "isDefault");

-- Mark one profile per user as default (first created if none marked)
UPDATE "profiles" p
SET "isDefault" = true
WHERE p."id" IN (
  SELECT DISTINCT ON ("userId") "id"
  FROM "profiles"
  ORDER BY "userId", "createdAt" ASC
)
AND NOT EXISTS (
  SELECT 1 FROM "profiles" d WHERE d."userId" = p."userId" AND d."isDefault" = true
);

-- architectures: profileId instead of userId
DO $$ BEGIN
  ALTER TABLE "architectures" ADD COLUMN "profileId" TEXT;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Backfill profileId from matching profile (prefer isDefault, else earliest profile)
UPDATE "architectures" a
SET "profileId" = sub."id"
FROM (
  SELECT DISTINCT ON (p."userId") p."userId", p."id"
  FROM "profiles" p
  ORDER BY p."userId", p."isDefault" DESC, p."createdAt" ASC
) AS sub
WHERE a."userId" = sub."userId"
  AND a."profileId" IS NULL;

-- Orphan architectures (no profile) — remove before NOT NULL
DELETE FROM "architectures" WHERE "profileId" IS NULL;

ALTER TABLE "architectures" DROP CONSTRAINT IF EXISTS "architectures_userId_fkey";
DROP INDEX IF EXISTS "architectures_userId_key";

DO $$ BEGIN
  ALTER TABLE "architectures" DROP COLUMN "userId";
EXCEPTION
  WHEN undefined_column THEN NULL;
END $$;

ALTER TABLE "architectures" ALTER COLUMN "profileId" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "architectures_profileId_key" ON "architectures"("profileId");

DO $$ BEGIN
  ALTER TABLE "architectures" ADD CONSTRAINT "architectures_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
