-- Headless Engine: Career Architecture state + usage ledger; vault pointers on User.

-- AlterTable: active BYOK pointer on users (no raw secrets)
ALTER TABLE "users" ADD COLUMN "vaultKeyId" UUID,
ADD COLUMN "activeProvider" TEXT;

CREATE INDEX "users_vaultKeyId_idx" ON "users"("vaultKeyId");

-- Migrate engines → architectures (parsed resume JSON becomes architecture content)
CREATE TABLE "architectures" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetRole" TEXT NOT NULL DEFAULT '',
    "calibrationScore" INTEGER NOT NULL DEFAULT 0,
    "content" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "architectures_pkey" PRIMARY KEY ("id")
);

INSERT INTO "architectures" ("id", "userId", "targetRole", "calibrationScore", "content", "createdAt", "updatedAt")
SELECT
    e."id",
    e."userId",
    COALESCE(p."targetTitle", ''),
    0,
    COALESCE(e."parsedData", '{}'::jsonb),
    e."createdAt",
    e."updatedAt"
FROM "engines" e
LEFT JOIN "profiles" p ON p."userId" = e."userId";

CREATE UNIQUE INDEX "architectures_userId_key" ON "architectures"("userId");
CREATE INDEX "architectures_targetRole_idx" ON "architectures"("targetRole");

ALTER TABLE "architectures" ADD CONSTRAINT "architectures_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE "engines";

-- Usage ledger
CREATE TABLE "usage_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokensUsed" INTEGER NOT NULL,
    "modelId" TEXT NOT NULL,
    "estimatedCost" DECIMAL(12,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "usage_logs_userId_idx" ON "usage_logs"("userId");
CREATE INDEX "usage_logs_createdAt_idx" ON "usage_logs"("createdAt");

ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
