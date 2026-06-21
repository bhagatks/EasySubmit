-- Seed `aiEngine` app_config (model + quotas — secrets live in Vault via system_api_keys).

INSERT INTO "app_config" ("key", "value", "createdAt", "updatedAt")
VALUES (
  'aiEngine',
  '{
    "system": {
      "modelId": "gemini-2.5-flash-lite",
      "maxKeySlots": 5
    },
    "quotas": {
      "system": { "dailyEnhancements": 5, "dailyCalls": 20 },
      "customer": { "dailyEnhancements": 50, "dailyCalls": 200 }
    },
    "customerDailyEnhancementCap": 50
  }'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO NOTHING;
