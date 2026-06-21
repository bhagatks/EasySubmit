-- Align app_config.aiEngine.system.maxKeySlots with 3-key pool (slots 0–2).
UPDATE "app_config"
SET "value" = jsonb_set("value", '{system,maxKeySlots}', '3'::jsonb, true)
WHERE "key" = 'aiEngine';
