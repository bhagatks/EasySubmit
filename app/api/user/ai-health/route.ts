import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  isAiHealthDebugEnabled,
  logAiHealth,
  logAiHealthError,
  redactUserId,
} from "@/lib/ai/ai-health-debug";
import { getAiHealthCheckForUser } from "@/lib/ai/ai-health-status";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  logAiHealth("api.request", {
    hasSession: Boolean(session),
    userId: redactUserId(userId),
  });

  if (!userId) {
    logAiHealth("api.response", { userId: "none", ok: true, reason: "no_session" });
    return Response.json({ ok: true });
  }

  try {
    const result = await getAiHealthCheckForUser(userId);
    logAiHealth("api.response", {
      userId: redactUserId(userId),
      ok: result.status.ok,
      code: result.status.ok ? null : result.status.code,
      reason: result.debug.reason,
    });
    return Response.json({
      ...result.status,
      ...(isAiHealthDebugEnabled() ? { _debug: result.debug } : {}),
    });
  } catch (error) {
    logAiHealthError("api.error", error, { userId: redactUserId(userId) });
    return Response.json({ ok: true });
  }
}
