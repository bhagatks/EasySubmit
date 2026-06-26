ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "plan"                 TEXT        NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS "subscriptionStatus"   TEXT,
  ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeCustomerId"     TEXT,
  ADD COLUMN IF NOT EXISTS "subscriptionEndsAt"   TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "users_stripeSubscriptionId_key" ON "users"("stripeSubscriptionId");
CREATE UNIQUE INDEX IF NOT EXISTS "users_stripeCustomerId_key"     ON "users"("stripeCustomerId");
