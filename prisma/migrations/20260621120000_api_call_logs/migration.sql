-- Structured telemetry for external API calls (AI providers, vault, etc.)
CREATE TABLE "api_call_logs" (
    "id" TEXT NOT NULL,
    "traceId" TEXT,
    "userId" TEXT,
    "domain" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "provider" TEXT,
    "modelId" TEXT,
    "status" TEXT NOT NULL,
    "httpStatus" INTEGER,
    "durationMs" INTEGER NOT NULL,
    "tokensUsed" INTEGER,
    "estimatedCost" DECIMAL(12, 6),
    "aiMode" TEXT,
    "keySlot" INTEGER,
    "keySource" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_call_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "api_call_logs_traceId_idx" ON "api_call_logs"("traceId");
CREATE INDEX "api_call_logs_userId_idx" ON "api_call_logs"("userId");
CREATE INDEX "api_call_logs_createdAt_idx" ON "api_call_logs"("createdAt");
CREATE INDEX "api_call_logs_domain_operation_idx" ON "api_call_logs"("domain", "operation");
CREATE INDEX "api_call_logs_provider_status_idx" ON "api_call_logs"("provider", "status");

ALTER TABLE "api_call_logs"
ADD CONSTRAINT "api_call_logs_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
