-- Add system.enable and customer.aiDailyUnlimited to app_config.aiEngine.
UPDATE "app_config"
SET "value" = jsonb_set(
  jsonb_set(
    "value",
    '{quotas,system,enable}',
    COALESCE("value" #> '{quotas,system,enable}', 'true'::jsonb),
    true
  ),
  '{quotas,customer,aiDailyUnlimited}',
  COALESCE("value" #> '{quotas,customer,aiDailyUnlimited}', 'true'::jsonb),
  true
)
WHERE "key" = 'aiEngine';
