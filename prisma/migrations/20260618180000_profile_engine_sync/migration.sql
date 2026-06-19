-- Profile model for multi-platform sync; move career fields off users.

ALTER TABLE "users" ALTER COLUMN "onboardingStep" SET DEFAULT 0;

CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "city" TEXT,
    "country" TEXT,
    "targetTitle" TEXT,
    "minSalary" INTEGER,
    "workMode" TEXT,
    "summary" TEXT,
    "coreCompetencies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "resumeUrl" TEXT,
    "resumeRawText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "profiles_userId_key" ON "profiles"("userId");
CREATE INDEX "profiles_email_idx" ON "profiles"("email");

ALTER TABLE "profiles" ADD CONSTRAINT "profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "profiles" (
    "id",
    "userId",
    "fullName",
    "email",
    "targetTitle",
    "minSalary",
    "workMode",
    "resumeUrl",
    "resumeRawText",
    "coreCompetencies",
    "skills",
    "createdAt",
    "updatedAt"
)
SELECT
    md5(u."id" || ':profile'),
    u."id",
    u."name",
    COALESCE(u."email", u."id" || '@users.easysubmit.local'),
    u."targetTitle",
    u."minSalary",
    u."workMode",
    u."resumeUrl",
    u."resumeRawText",
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    u."createdAt",
    u."updatedAt"
FROM "users" AS u
WHERE NOT EXISTS (
    SELECT 1 FROM "profiles" AS p WHERE p."userId" = u."id"
);

CREATE TABLE "experiences" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "description" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "educations" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "degree" TEXT,
    "field" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "educations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "certifications" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT,
    "issueDate" TEXT,
    "url" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "experiences_profileId_idx" ON "experiences"("profileId");
CREATE INDEX "projects_profileId_idx" ON "projects"("profileId");
CREATE INDEX "educations_profileId_idx" ON "educations"("profileId");
CREATE INDEX "certifications_profileId_idx" ON "certifications"("profileId");

ALTER TABLE "experiences" ADD CONSTRAINT "experiences_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "educations" ADD CONSTRAINT "educations_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "users" DROP COLUMN "resumeUrl";
ALTER TABLE "users" DROP COLUMN "resumeRawText";
ALTER TABLE "users" DROP COLUMN "targetTitle";
ALTER TABLE "users" DROP COLUMN "minSalary";
ALTER TABLE "users" DROP COLUMN "workMode";
