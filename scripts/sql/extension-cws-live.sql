-- One-shot prod patch (same as migration 20260706203000_extension_cws_live).
-- Run in Supabase SQL editor if migration has not deployed yet.

INSERT INTO "app_config" ("key", "value", "updatedAt")
VALUES (
  'forceUpgrade',
  '{
    "enabled": false,
    "minVersion": "1.0.0",
    "updateUrl": "https://chromewebstore.google.com/detail/ondcaafebdfegfkmdggeklofnmbijmlc",
    "message": "Update the EasySubmit extension to continue. Open chrome://extensions and click Update, or reinstall from the Chrome Web Store."
  }'::jsonb,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO UPDATE
SET value = COALESCE("app_config"."value", '{}'::jsonb)
  || '{"updateUrl": "https://chromewebstore.google.com/detail/ondcaafebdfegfkmdggeklofnmbijmlc"}'::jsonb,
  "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "app_config"
SET value = jsonb_set(
  COALESCE(value, '{}'::jsonb),
  '{dashboardVisit}',
  'true'::jsonb
),
"updatedAt" = CURRENT_TIMESTAMP
WHERE key = 'extensionInstallPrompt';
