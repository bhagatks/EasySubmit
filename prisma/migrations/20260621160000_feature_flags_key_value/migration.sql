-- Upgrade legacy singleton feature_flags (column-based) to key/value rows.
DO $$
DECLARE
  onboarding_enabled BOOLEAN := true;
  resume_enabled BOOLEAN := true;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'feature_flags'
      AND column_name = 'enhanceWithAiOnboarding'
  ) THEN
    EXECUTE 'SELECT "enhanceWithAiOnboarding", "enhanceWithAiResumeProfile" FROM "feature_flags" WHERE "id" = ''default'''
      INTO onboarding_enabled, resume_enabled;

    DROP TABLE "feature_flags";

    CREATE TABLE "feature_flags" (
        "key" TEXT NOT NULL,
        "enabled" BOOLEAN NOT NULL DEFAULT false,
        "description" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("key")
    );

    INSERT INTO "feature_flags" ("key", "enabled", "description", "updatedAt") VALUES
      ('enhance_with_ai_onboarding', COALESCE(onboarding_enabled, true), 'Show Enhance with AI in onboarding Studio (phase 3)', CURRENT_TIMESTAMP),
      ('enhance_with_ai_resume_profile', COALESCE(resume_enabled, true), 'Show Enhance with AI in dashboard resume profile studio', CURRENT_TIMESTAMP);
  END IF;
END $$;
