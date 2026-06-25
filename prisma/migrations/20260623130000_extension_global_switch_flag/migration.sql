-- Rename extension_job_card → extension_global_switch (code wiring follows in a later change).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "feature_flags" WHERE "key" = 'extension_job_card') THEN
    UPDATE "feature_flags"
    SET
      "key" = 'extension_global_switch',
      "description" = 'This will shutdown the extension for all the users',
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "key" = 'extension_job_card';
  ELSIF NOT EXISTS (SELECT 1 FROM "feature_flags" WHERE "key" = 'extension_global_switch') THEN
    INSERT INTO "feature_flags" ("key", "enabled", "description", "updatedAt")
    VALUES (
      'extension_global_switch',
      true,
      'This will shutdown the extension for all the users',
      CURRENT_TIMESTAMP
    );
  ELSE
    UPDATE "feature_flags"
    SET
      "description" = 'This will shutdown the extension for all the users',
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "key" = 'extension_global_switch';
  END IF;
END $$;
