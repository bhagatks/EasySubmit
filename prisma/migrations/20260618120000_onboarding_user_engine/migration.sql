-- Move onboarding preferences from user_profiles onto users; add Engine for parsed resume data.

ALTER TABLE "users" ADD COLUMN "resumeUrl" TEXT;
ALTER TABLE "users" ADD COLUMN "resumeRawText" TEXT;
ALTER TABLE "users" ADD COLUMN "targetTitle" TEXT;
ALTER TABLE "users" ADD COLUMN "minSalary" INTEGER;
ALTER TABLE "users" ADD COLUMN "workMode" TEXT;
ALTER TABLE "users" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "users" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "users" AS u
SET
  "targetTitle" = p."selectedRole",
  "minSalary" = p."minSalary",
  "resumeUrl" = p."resumePath"
FROM "user_profiles" AS p
WHERE p."userId" = u."id";

CREATE TABLE "engines" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parsedData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "engines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "engines_userId_key" ON "engines"("userId");

ALTER TABLE "engines" ADD CONSTRAINT "engines_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE "user_profiles";
