INSERT INTO "feature_flags" ("key", "enabled", "description", "updatedAt")
VALUES (
  'system_ai_enabled',
  true,
  'Global kill switch for EasySubmit system AI pool (BYOK unaffected)',
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO NOTHING;
