-- System key pool quota + billing fields (v1 router epic)
ALTER TABLE "system_api_keys" ADD COLUMN "billingMode" TEXT NOT NULL DEFAULT 'free';
ALTER TABLE "system_api_keys" ADD COLUMN "modelId" TEXT NOT NULL DEFAULT 'gemini-2.5-flash-lite';
ALTER TABLE "system_api_keys" ADD COLUMN "callsToday" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "system_api_keys" ADD COLUMN "exhaustedUntil" TIMESTAMP(3);
ALTER TABLE "system_api_keys" ADD COLUMN "quotaResetDate" TEXT;

UPDATE "system_api_keys"
SET "quotaResetDate" = to_char((now() AT TIME ZONE 'America/Los_Angeles')::date, 'YYYY-MM-DD')
WHERE "quotaResetDate" IS NULL;

UPDATE "system_api_keys" SET "label" = 'Alpha' WHERE "slot" = 0;
UPDATE "system_api_keys" SET "label" = 'Beta' WHERE "slot" = 1;
UPDATE "system_api_keys" SET "label" = 'Gamma' WHERE "slot" = 2;

-- ApiCallLog operational telemetry
ALTER TABLE "api_call_logs" ADD COLUMN IF NOT EXISTS "keyLabel" TEXT;
ALTER TABLE "api_call_logs" ADD COLUMN IF NOT EXISTS "billingMode" TEXT;
