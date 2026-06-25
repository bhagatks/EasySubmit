import type { NextRequest } from "next/server";
import { resolveExtensionUserId } from "@/lib/extension/auth-request";
import { extensionGlobalDisabledResponse } from "@/lib/extension/extension-global-gate";
import {
  getSupabaseRealtimePublicConfig,
  isSupabaseRealtimeConfigured,
  signSupabaseRealtimeToken,
} from "@/lib/supabase/realtime-token";

export async function GET(request: NextRequest) {
  const disabled = await extensionGlobalDisabledResponse(request);
  if (disabled) return disabled;

  const auth = await resolveExtensionUserId(request);
  if ("response" in auth) return auth.response;
  const { userId } = auth;

  if (!isSupabaseRealtimeConfigured()) {
    return Response.json(
      {
        success: false,
        error: "Realtime not configured",
        code: "realtime_unavailable",
      },
      { status: 503 },
    );
  }

  const token = signSupabaseRealtimeToken(userId)!;
  const publicConfig = getSupabaseRealtimePublicConfig()!;

  return Response.json({
    success: true,
    token,
    userId,
    supabaseUrl: publicConfig.supabaseUrl,
    supabaseKey: publicConfig.supabaseKey,
  });
}
