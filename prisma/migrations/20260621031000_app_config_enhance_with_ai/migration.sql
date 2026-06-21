-- Seed Enhance with AI client controls (app_config namespace).
INSERT INTO "app_config" ("key", "value", "updatedAt")
VALUES (
  'enhanceWithAi',
  '{"enhanceWithAiTimeoutMs": 90000}'::jsonb,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO UPDATE SET
  "value" = EXCLUDED."value",
  "updatedAt" = CURRENT_TIMESTAMP;
