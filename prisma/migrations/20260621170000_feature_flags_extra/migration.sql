-- Optional JSON payload per feature flag.
ALTER TABLE "feature_flags" ADD COLUMN IF NOT EXISTS "extra" JSONB;
