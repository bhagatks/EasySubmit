import type { NextRequest } from "next/server";
import { getExtensionRuntimeConfig } from "@/lib/extension/runtime-config";
import { getExtensionUserPrefs } from "@/lib/extension/user-prefs";
import { getExtensionConnectedUser } from "@/lib/extension/connected-user";
import { ONE_CLICK_APPLY_PLATFORMS } from "@/lib/extension/apply-pipeline";
import { readBearerToken, verifyExtensionToken } from "@/lib/extension/auth-token";
import { resolveExtensionUserId } from "@/lib/extension/auth-request";
import { getAiHealthStatusForUser } from "@/lib/ai/ai-health-status";

export async function GET(request: NextRequest) {
  const config = await getExtensionRuntimeConfig(request.nextUrl.origin);
  const tokenUserId = verifyExtensionToken(readBearerToken(request.headers.get("authorization")));
  const connectedUser = tokenUserId ? await getExtensionConnectedUser(tokenUserId) : null;
  const userId = connectedUser?.id ?? null;
  const userPrefs = userId ? await getExtensionUserPrefs(userId) : null;
  const aiHealth = userId ? await getAiHealthStatusForUser(userId) : null;
  const aiHealthError = aiHealth && !aiHealth.ok ? aiHealth.message : null;

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
  });
}
