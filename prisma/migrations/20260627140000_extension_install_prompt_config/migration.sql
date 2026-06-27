INSERT INTO "app_config" ("key", "value", "updatedAt")
VALUES (
  'extensionInstallPrompt',
  '{"refreshIntervalMinutes": 30, "description": "Extension install prompt refresh time (minutes)"}'::jsonb,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO NOTHING;
