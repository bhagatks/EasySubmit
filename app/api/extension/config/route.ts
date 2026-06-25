import type { NextRequest } from "next/server";
import { getExtensionRuntimeConfig } from "@/lib/extension/runtime-config";
import { getExtensionUserPrefs } from "@/lib/extension/user-prefs";
import { getExtensionConnectedUser } from "@/lib/extension/connected-user";
import { ONE_CLICK_APPLY_PLATFORMS } from "@/lib/extension/apply-pipeline";
import { readBearerToken, verifyExtensionToken } from "@/lib/extension/auth-token";
import { resolveExtensionUserId } from "@/lib/extension/auth-request";
import { logAiHealth, logAiHealthError, redactUserId } from "@/lib/ai/ai-health-debug";
import { getAiHealthCheckForUser } from "@/lib/ai/ai-health-status";
import { getAiReadinessForUser } from "@/lib/ai/ai-readiness-gate-for-user";

export async function GET(request: NextRequest) {
  const tokenUserId = verifyExtensionToken(readBearerToken(request.headers.get("authorization")));

  const [config, connectedUser] = await Promise.all([
    getExtensionRuntimeConfig(request.nextUrl.origin),
    tokenUserId ? getExtensionConnectedUser(tokenUserId) : Promise.resolve(null),
  ]);

  const userId = connectedUser?.id ?? null;

  const [userPrefs, aiHealth, readiness] = await Promise.all([
    userId ? getExtensionUserPrefs(userId) : Promise.resolve(null),
    userId ? getAiHealthCheckForUser(userId) : Promise.resolve(null),
    userId ? getAiReadinessForUser(userId) : Promise.resolve(null),
  ]);

  let aiHealthError: string | null = null;
  let systemQuotaExceeded = false;
  let byokKeyInvalid = false;
  if (userId && aiHealth && readiness) {
    try {
      systemQuotaExceeded = readiness.systemQuota.applies && readiness.systemQuota.exceeded;
      byokKeyInvalid = readiness.byokKey.applies && !readiness.byokKey.valid;
      aiHealthError = !aiHealth.status.ok ? aiHealth.status.message : null;
      logAiHealth("extension.config", {
        userId: redactUserId(userId),
        ok: aiHealth.status.ok,
        code: aiHealth.status.ok ? null : aiHealth.status.code,
        systemQuotaExceeded,
        byokKeyInvalid,
        aiHealthError,
      });
    } catch (error) {
      logAiHealthError("extension.config.error", error, { userId: redactUserId(userId) });
    }
  } else {
    logAiHealth("extension.config", { userId: "none", ok: true, aiHealthError: null });
  }

  return Response.json({
    success: true,
    extensionGlobalSwitch: config.extensionGlobalSwitch,
    jobCardEnabled: config.extensionGlobalSwitch && config.jobCardEnabled,
    enabledPlatforms: config.enabledPlatforms,
    genericFallbackEnabled: config.genericFallbackEnabled,
    minConfidence: config.minConfidence,
    selectorOverrides: config.selectorOverrides,
    apiBaseUrl: config.apiBaseUrl,
    autoApplyUserSwitch: userPrefs?.autoApplyUserSwitch ?? true,
    applicationProfile: userPrefs?.applicationProfile ?? null,
    customizeResume: userPrefs?.customizeResume ?? true,
    oneClickApplyPlatforms: ONE_CLICK_APPLY_PLATFORMS,
    autoApplyEnabled: config.autoApplyEnabled,
    connectedUser,
    aiHealthError,
    systemQuotaExceeded,
    byokKeyInvalid,
  });
}
