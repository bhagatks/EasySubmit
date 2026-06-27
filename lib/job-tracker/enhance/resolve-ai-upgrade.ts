import type { EnhanceOffReason, FeatureSurface } from "@/lib/features/types";
import { resolveEnhanceFeature } from "@/lib/features/resolve-enhance";
import type { ResolvedAiRoute } from "@/src/lib/ai/engine/router";
import type { SystemQuotaUserRow } from "@/src/lib/ai/engine/system-quota-gate";

export type AiUpgradeResolution = {
  aiAllowed: boolean;
  reason?: EnhanceOffReason;
  route?: ResolvedAiRoute;
  warning?: string;
  baselineAvailable: true;
  aiAvailable: boolean;
};

const WARNING_MESSAGES: Partial<Record<EnhanceOffReason, string>> = {
  globally_disabled: "AI is off — baseline enhancements were applied.",
  feature_disabled: "AI enhance is off — baseline enhancements were applied.",
  user_disabled: "AI is disabled in settings — baseline enhancements were applied.",
  no_key: "Add an API key in AI Keys to upgrade with AI. Baseline enhancements were applied.",
  pool_down: "Shared AI is temporarily unavailable. Baseline enhancements were applied.",
  quota_exceeded: "Daily AI limit reached. Baseline enhancements were applied.",
};

export async function resolveAiUpgrade(
  user: SystemQuotaUserRow,
  surface: FeatureSurface,
  opts?: { forceSystem?: boolean; useCustomerKey?: boolean },
): Promise<AiUpgradeResolution> {
  const enhance = await resolveEnhanceFeature(user, surface, opts);

  if (enhance.aiAvailable) {
    const route: ResolvedAiRoute =
      enhance.mode === "customer"
        ? {
            mode: "customer",
            provider: enhance.provider as Extract<ResolvedAiRoute, { mode: "customer" }>["provider"],
            modelId: enhance.modelId!,
            vaultKeyId: enhance.vaultKeyId!,
          }
        : { mode: "system", modelId: enhance.modelId! };

    return {
      aiAllowed: true,
      route,
      baselineAvailable: true,
      aiAvailable: true,
    };
  }

  const reason = enhance.reason ?? "user_disabled";
  return {
    aiAllowed: false,
    reason,
    warning: WARNING_MESSAGES[reason] ?? "AI upgrade skipped — baseline enhancements were applied.",
    baselineAvailable: true,
    aiAvailable: false,
  };
}
