-- =============================================================================
-- Remove unused system key slots (e.g. legacy slots 3 and 4)
-- =============================================================================
-- Run in: Supabase Dashboard → SQL Editor
-- Requires: bootstrap-system-vault.sql (revoke_system_key function)
--
-- v1 pool uses slots 0–2 only (Alpha, Beta, Gamma).
-- =============================================================================

DO $$
DECLARE
  row RECORD;
BEGIN
  FOR row IN
    SELECT slot, "vaultSecretId"
    FROM system_api_keys
    WHERE slot NOT IN (0, 1, 2)
    ORDER BY slot
  LOOP
    PERFORM public.revoke_system_key(row."vaultSecretId");
    DELETE FROM system_api_keys WHERE slot = row.slot;
    RAISE NOTICE 'Revoked and deleted slot %', row.slot;
  END LOOP;
END $$;

-- Confirm only 0–2 remain
SELECT slot, label, enabled, "billingMode"
FROM system_api_keys
ORDER BY slot;
