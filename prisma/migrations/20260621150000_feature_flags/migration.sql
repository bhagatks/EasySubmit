-- Global feature toggles (one row per flag key).
CREATE TABLE "feature_flags" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("key")
);

INSERT INTO "feature_flags" ("key", "enabled", "description", "updatedAt") VALUES
  ('enhance_with_ai_onboarding', true, 'Show Enhance with AI in onboarding Studio (phase 3)', CURRENT_TIMESTAMP),
  ('enhance_with_ai_resume_profile', true, 'Show Enhance with AI in dashboard resume profile studio', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
