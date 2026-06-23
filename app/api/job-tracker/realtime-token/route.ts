import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getSupabaseRealtimePublicConfig,
  isSupabaseRealtimeConfigured,
  signSupabaseRealtimeToken,
} from "@/lib/supabase/realtime-token";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseRealtimeConfigured()) {
    return Response.json({
      success: false,
      error: "Realtime not configured",
      code: "realtime_unavailable",
    });
  }

  const token = signSupabaseRealtimeToken(userId);
  const publicConfig = getSupabaseRealtimePublicConfig();
  if (!token || !publicConfig) {
    return Response.json(
      { success: false, error: "Realtime not configured", code: "realtime_unavailable" },
      { status: 503 },
    );
  }

  return Response.json({
    success: true,
    token,
    userId,
    supabaseUrl: publicConfig.supabaseUrl,
    supabaseKey: publicConfig.supabaseKey,
  });
}
