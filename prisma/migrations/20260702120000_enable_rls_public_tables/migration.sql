-- Enable RLS on all public tables to close Supabase PostgREST exposure
-- (flagged by Supabase's rls_disabled_in_public / sensitive_columns_exposed linter).
-- No policies are added: the app connects via Prisma using the Supabase
-- pooler "postgres" role, which has BYPASSRLS and is unaffected. This only
-- blocks the anon/authenticated PostgREST roles from reading these tables.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verification_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app_config" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_api_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "system_api_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usage_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "api_call_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "feature_flags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_application_answers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_tracker_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_resume_tailors" ENABLE ROW LEVEL SECURITY;
