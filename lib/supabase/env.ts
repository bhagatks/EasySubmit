const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

/** Supports Supabase publishable keys (`sb_publishable_*`) with anon-key fallback. */
export function getSupabaseKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ""
  );
}

export function getSupabaseUrl(): string {
  return supabaseUrl ?? "";
}
