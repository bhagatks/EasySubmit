import type { EnhanceOffReason, FeatureSurface } from "@/lib/features/types";
import { resolveEnhanceFeature } from "@/lib/features/resolve-enhance";
import type { ResolvedAiRoute } from "@/src/lib/ai/engine/router";
import type { SystemQuotaUserRow } from "@/src/lib/ai/engine/system-quota-gate";

export type AiUpgradeResolution = {
  aiAllowed: boolean;
  reason?: EnhanceOffReason;
  route?: ResolvedAiRoute;
  systemFallbackRoute?: ResolvedAiRoute | null;
  warning?: string;
  baselineAvailable: true;
  aiAvailable: boolean;
};

export async function resolveAiUpgrade(
  user: SystemQuotaUserRow,
  surface: FeatureSurface,
  opts?: {
    forceSystem?: boolean;
    forceAiEnabled?: boolean;
    useCustomerKey?: boolean;
    traceId?: string;
  },
): Promise<AiUpgradeResolution> {
  const enhance = await resolveEnhanceFeature(user, surface, opts);

  if (enhance.aiAvailable && enhance.route) {
    return {
      aiAllowed: true,
      route: enhance.route,
      systemFallbackRoute: enhance.systemFallbackRoute,
      baselineAvailable: true,
      aiAvailable: true,
    };
  }

  const reason = enhance.reason ?? "user_disabled";
  return {
    aiAllowed: false,
    reason,
    warning:
      enhance.blockedMessage ??
      "AI upgrade skipped — baseline enhancements were applied.",
    baselineAvailable: true,
    aiAvailable: false,
  };
}
