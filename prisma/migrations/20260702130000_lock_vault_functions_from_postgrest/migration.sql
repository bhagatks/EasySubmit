-- Lock vault key functions out of Supabase's PostgREST API
-- (flagged by anon_security_definer_function_executable / authenticated_security_definer_function_executable).
-- These SECURITY DEFINER functions take a bare user_id/slot argument with no
-- caller-identity check, so exposing them to anon/authenticated via
-- /rest/v1/rpc/... let anyone read or overwrite any user's BYOK key or the
-- shared system keys. The app only ever calls them via Prisma's direct
-- $queryRaw/$executeRaw over the pooler connection (see lib/vault/), never
-- through PostgREST, so revoking these grants is a no-op for app behavior.
REVOKE EXECUTE ON FUNCTION public.vault_user_key(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.unvault_user_key(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.revoke_user_key(TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.vault_system_key(INT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.unvault_system_key(INT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.revoke_system_key(UUID) FROM PUBLIC, anon, authenticated;
