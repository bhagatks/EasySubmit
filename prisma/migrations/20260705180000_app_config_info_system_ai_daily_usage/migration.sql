-- Add optional metadata column to app_config rows.
ALTER TABLE "app_config" ADD COLUMN "info" JSONB;

-- Global system AI daily counters (Pacific date key).
CREATE TABLE "system_ai_daily_usage" (
    "date" TEXT NOT NULL,
    "openRouterCalls" INTEGER NOT NULL DEFAULT 0,
    "systemEnhancements" INTEGER NOT NULL DEFAULT 0,
    "deepSeekPaidCalls" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_ai_daily_usage_pkey" PRIMARY KEY ("date")
);
