-- =============================================================================
-- STEP 2 — EasySubmit — Vault system Gemini keys (slots 0–2 only)
-- =============================================================================
-- Run in: Supabase Dashboard → SQL Editor
--
-- BEFORE RUNNING:
--   1. Run STEP 1 first: scripts/sql/bootstrap-system-vault.sql
--   2. Replace YOUR_GEMINI_KEY_SLOT_0 … _2 with real keys (AIza…)
--   3. If you previously created slots 3–4, run scripts/sql/revoke-system-key-slots.sql first
--
-- Slot map (v1):
--   0 = Alpha   (free)
--   1 = Beta    (free)
--   2 = Gamma   (free; set billingMode = 'paid' later for overflow)
--
-- AFTER RUNNING:
--   - Remove EASYSUBMIT_SYSTEM_GEMINI_API_KEYS from Vercel/production env
--   - Redeploy app
-- =============================================================================

-- ── Slot 0 — Alpha ──────────────────────────────────────────────────────────
WITH vaulted AS (
  SELECT public.vault_system_key(0, 'YOUR_GEMINI_KEY_SLOT_0') AS secret_id
)
INSERT INTO system_api_keys (
  slot, "vaultSecretId", label, enabled, provider,
  "billingMode", "modelId", "updatedAt"
)
SELECT 0, secret_id, 'Alpha', true, 'gemini', 'free', 'gemini-2.5-flash-lite', NOW()
FROM vaulted
ON CONFLICT (slot) DO UPDATE SET
  "vaultSecretId" = EXCLUDED."vaultSecretId",
  label = EXCLUDED.label,
  enabled = true,
  "updatedAt" = NOW();

-- ── Slot 1 — Beta ───────────────────────────────────────────────────────────
WITH vaulted AS (
  SELECT public.vault_system_key(1, 'YOUR_GEMINI_KEY_SLOT_1') AS secret_id
)
INSERT INTO system_api_keys (
  slot, "vaultSecretId", label, enabled, provider,
  "billingMode", "modelId", "updatedAt"
)
SELECT 1, secret_id, 'Beta', true, 'gemini', 'free', 'gemini-2.5-flash-lite', NOW()
FROM vaulted
ON CONFLICT (slot) DO UPDATE SET
  "vaultSecretId" = EXCLUDED."vaultSecretId",
  label = EXCLUDED.label,
  enabled = true,
  "updatedAt" = NOW();

-- ── Slot 2 — Gamma ──────────────────────────────────────────────────────────
WITH vaulted AS (
  SELECT public.vault_system_key(2, 'YOUR_GEMINI_KEY_SLOT_2') AS secret_id
)
INSERT INTO system_api_keys (
  slot, "vaultSecretId", label, enabled, provider,
  "billingMode", "modelId", "updatedAt"
)
SELECT 2, secret_id, 'Gamma', true, 'gemini', 'free', 'gemini-2.5-flash-lite', NOW()
FROM vaulted
ON CONFLICT (slot) DO UPDATE SET
  "vaultSecretId" = EXCLUDED."vaultSecretId",
  label = EXCLUDED.label,
  enabled = true,
  "updatedAt" = NOW();

-- =============================================================================
-- Verify (safe — does not show key values)
-- =============================================================================
SELECT slot, label, enabled, "billingMode", "modelId", "updatedAt"
FROM system_api_keys
ORDER BY slot;

-- Optional smoke test — confirms Vault decrypt works
-- SELECT slot, label, public.unvault_system_key(slot) IS NOT NULL AS vault_ok
-- FROM system_api_keys
-- ORDER BY slot;
