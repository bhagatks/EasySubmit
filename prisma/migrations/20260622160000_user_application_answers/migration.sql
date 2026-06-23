-- CreateTable
CREATE TABLE "user_application_answers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fieldSignature" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "tenantHost" TEXT,
    "automationId" TEXT,
    "semanticKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "optionsHash" TEXT,
    "answer" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_application_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_application_answers_userId_semanticKey_idx" ON "user_application_answers"("userId", "semanticKey");

-- CreateIndex
CREATE INDEX "user_application_answers_userId_platform_automationId_idx" ON "user_application_answers"("userId", "platform", "automationId");

-- CreateIndex
CREATE UNIQUE INDEX "user_application_answers_userId_fieldSignature_key" ON "user_application_answers"("userId", "fieldSignature");

-- AddForeignKey
ALTER TABLE "user_application_answers" ADD CONSTRAINT "user_application_answers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
