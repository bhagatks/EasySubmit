import type { NextRequest } from "next/server";
import { getExtensionRuntimeConfig } from "@/lib/extension/runtime-config";
import { getExtensionUserPrefs } from "@/lib/extension/user-prefs";
import { getExtensionConnectedUser } from "@/lib/extension/connected-user";
import { ONE_CLICK_APPLY_PLATFORMS } from "@/lib/extension/apply-pipeline";
import { getExtensionUserId } from "@/lib/extension/auth-request";

export async function GET(request: NextRequest) {
  const config = await getExtensionRuntimeConfig(request.nextUrl.origin);
  const userId = getExtensionUserId(request);
  const [userPrefs, connectedUser] = await Promise.all([
    userId ? getExtensionUserPrefs(userId) : null,
    userId ? getExtensionConnectedUser(userId) : null,
  ]);

  return Response.json({
    success: true,
    jobCardEnabled: config.jobCardEnabled && config.featureFlagEnabled,
    enabledPlatforms: config.enabledPlatforms,
    genericFallbackEnabled: config.genericFallbackEnabled,
    minConfidence: config.minConfidence,
    selectorOverrides: config.selectorOverrides,
    apiBaseUrl: config.apiBaseUrl,
    oneClickApply: userPrefs?.oneClickApply ?? true,
    oneClickApplyPlatforms: ONE_CLICK_APPLY_PLATFORMS,
    autoApplyEnabled: config.autoApplyEnabled,
    connectedUser,
  });
}
