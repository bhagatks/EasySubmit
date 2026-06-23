import { createHmac } from "node:crypto";
import { getSupabaseKey, getSupabaseUrl } from "@/lib/supabase/env";

const DEFAULT_TTL_SECONDS = 60 * 60;

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

/** HS256 JWT for Supabase Realtime when `SUPABASE_JWT_SECRET` is configured. */
export function signSupabaseRealtimeToken(
  userId: string,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): string | null {
  const secret = process.env.SUPABASE_JWT_SECRET?.trim();
  if (!secret) return null;

  const header = base64UrlJson({ alg: "HS256", typ: "JWT" });
  const now = Math.floor(Date.now() / 1000);
  const payload = base64UrlJson({
    sub: userId,
    role: "authenticated",
    aud: "authenticated",
    iat: now,
    exp: now + ttlSeconds,
  });

  const unsigned = `${header}.${payload}`;
  const signature = createHmac("sha256", secret).update(unsigned).digest("base64url");
  return `${unsigned}.${signature}`;
}

export function getSupabaseRealtimePublicConfig(): {
  supabaseUrl: string;
  supabaseKey: string;
} | null {
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseKey();
  if (!supabaseUrl || !supabaseKey) return null;
  return { supabaseUrl, supabaseKey };
}

export function isSupabaseRealtimeConfigured(): boolean {
  return Boolean(process.env.SUPABASE_JWT_SECRET?.trim() && getSupabaseRealtimePublicConfig());
}
