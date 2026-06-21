-- =============================================================================
-- EasySubmit — one-page pool health (bookmark in Supabase SQL Editor)
-- =============================================================================

-- 1) Vault slots + daily quota state
SELECT
  slot,
  label,
  enabled,
  "billingMode",
  "modelId",
  "callsToday",
  "exhaustedUntil",
  "quotaResetDate",
  "updatedAt"
FROM system_api_keys
ORDER BY slot;

-- 2) Vault decrypt smoke (does not print key values)
SELECT
  slot,
  label,
  public.unvault_system_key(slot) IS NOT NULL AS vault_ok
FROM system_api_keys
ORDER BY slot;

-- 3) Last 10 system Enhance calls
SELECT
  "createdAt",
  "traceId",
  status,
  "keySlot",
  "keyLabel",
  "billingMode",
  "tokensUsed",
  "durationMs",
  metadata->>'pass' AS pass,
  "errorCode"
FROM api_call_logs
WHERE operation = 'ai.enhance.generate_text'
  AND "aiMode" = 'system'
ORDER BY "createdAt" DESC
LIMIT 10;

-- 4) Slot usage last 24h
SELECT
  "keySlot",
  "keyLabel",
  status,
  COUNT(*) AS calls,
  AVG("durationMs")::int AS avg_ms
FROM api_call_logs
WHERE "createdAt" > NOW() - INTERVAL '24 hours'
  AND "aiMode" = 'system'
GROUP BY "keySlot", "keyLabel", status
ORDER BY "keySlot", status;
