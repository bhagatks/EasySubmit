import { getAiHealthCheckForUser } from "@/lib/ai/ai-health-status";
import { getAiReadinessForUser } from "@/lib/ai/ai-readiness-gate-for-user";
import {
  getExtensionAiHealthBlockMessage,
  isExtensionApplyBlockedByAiHealth,
} from "@/src/shared/extension/ai-health-banner";
import type { ExtensionRuntimeConfig } from "@/src/shared/extension/types";

function extensionAiHealthConfigFromChecks(
  aiHealth: Awaited<ReturnType<typeof getAiHealthCheckForUser>>,
  readiness: Awaited<ReturnType<typeof getAiReadinessForUser>>,
): Pick<ExtensionRuntimeConfig, "aiHealthError" | "systemQuotaExceeded" | "byokKeyInvalid"> {
  return {
    aiHealthError: !aiHealth.status.ok ? aiHealth.status.message : null,
    systemQuotaExceeded: readiness.systemQuota.applies && readiness.systemQuota.exceeded,
    byokKeyInvalid: readiness.byokKey.applies && !readiness.byokKey.valid,
  };
}

/** Server-side gate: blocks capture/apply only when system daily quota is exhausted. */
export async function getExtensionAiApplyBlockForUser(userId: string): Promise<string | null> {
  const [aiHealth, readiness] = await Promise.all([
    getAiHealthCheckForUser(userId),
    getAiReadinessForUser(userId),
  ]);
  const config = extensionAiHealthConfigFromChecks(aiHealth, readiness);
  if (!isExtensionApplyBlockedByAiHealth(config)) return null;
  return (
    getExtensionAiHealthBlockMessage(config) ??
    "AI is unavailable. Fix your settings and try again."
  );
}
