INSERT INTO "app_config" ("key", "value", "updatedAt")
VALUES (
  'extensionInstallPrompt',
  '{"refreshIntervalMinutes": 30, "dashboardVisit": false, "tabFocusReturn": false, "periodicRefresh": false, "description": "Extension install prompt refresh time (minutes)"}'::jsonb,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO NOTHING;
