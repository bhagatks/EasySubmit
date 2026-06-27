import { SETTINGS_ADD_KEY_HREF, SETTINGS_AI_AUTO_HREF } from "@/lib/dashboard/settings-ai-links";
import type { ExtensionRuntimeConfig } from "@/src/shared/extension/types";

export type ExtensionAiHealthBanner = {
  message: string;
  isKeyIssue: boolean;
  fixPath: string;
  fixLabel: string;
  bannerLabel: string;
};

const DEFAULT_QUOTA_MESSAGE =
  "Daily enhancement limit reached. Add your API key for more.";
const DEFAULT_KEY_MESSAGE = "Your API key needs attention. Verify it in AI Keys.";

function looksLikeKeyIssue(message: string): boolean {
  if (looksLikeQuotaIssue(message)) return false;
  return /api key is failing|api key needs|saved api key could not|vault|authentication|permission denied|verify.*ai keys|my key is selected/i.test(
    message,
  );
}

function looksLikeQuotaIssue(message: string): boolean {
  return /quota|limit reached|daily enhancement|daily ai call/i.test(message);
}

type ExtensionAiHealthConfig = Pick<
  ExtensionRuntimeConfig,
  "aiHealthError" | "systemQuotaExceeded" | "byokKeyInvalid"
>;

/** Resolve extension AI health banner copy from runtime config + optional pipeline error. */
export function resolveExtensionAiHealthBanner(
  config: ExtensionRuntimeConfig | ExtensionAiHealthConfig | null | undefined,
  pipelineError?: string | null,
): ExtensionAiHealthBanner | null {
  const fromConfig = config?.aiHealthError?.trim() ?? "";
  const pipeline = pipelineError?.trim() ?? "";
  const isKeyIssue = Boolean(config?.byokKeyInvalid);
  const isQuotaIssue = Boolean(config?.systemQuotaExceeded);

  let message = fromConfig;
  if (!message && isKeyIssue) message = DEFAULT_KEY_MESSAGE;
  if (!message && isQuotaIssue) message = DEFAULT_QUOTA_MESSAGE;
  if (!message && pipeline && (looksLikeKeyIssue(pipeline) || looksLikeQuotaIssue(pipeline))) {
    message = pipeline;
  }

  if (!message) return null;

  const keyIssue =
    isKeyIssue || (!looksLikeQuotaIssue(message) && looksLikeKeyIssue(message));
  const fixPath = keyIssue ? SETTINGS_ADD_KEY_HREF : SETTINGS_AI_AUTO_HREF;

  return {
    message,
    isKeyIssue: keyIssue,
    fixPath,
    fixLabel: keyIssue ? "Fix in Settings" : "Fix in Settings",
    bannerLabel: keyIssue ? "Key issue" : "AI issue",
  };
}

/** True when EasySubmit system daily quota is exhausted (blocks add-job / apply). */
export function isExtensionSystemQuotaExhausted(
  config: ExtensionAiHealthConfig | null | undefined,
): boolean {
  if (!config) return false;
  if (config.systemQuotaExceeded) return true;
  const message = config.aiHealthError?.trim() ?? "";
  return Boolean(message && looksLikeQuotaIssue(message));
}

/** True when add-job / apply must wait for quota reset or BYOK (system quota only). */
export function isExtensionApplyBlockedByAiHealth(
  config: ExtensionAiHealthConfig | null | undefined,
): boolean {
  return isExtensionSystemQuotaExhausted(config);
}

/** User-facing block reason when apply is disabled for quota; null for advisory-only warnings. */
export function getExtensionAiHealthBlockMessage(
  config: ExtensionAiHealthConfig | null | undefined,
): string | null {
  if (!isExtensionSystemQuotaExhausted(config)) return null;
  return resolveExtensionAiHealthBanner(config)?.message ?? null;
}

export function shouldHidePipelineErrorInBody(
  banner: ExtensionAiHealthBanner | null,
  pipelineError?: string | null,
): boolean {
  if (!banner || !pipelineError?.trim()) return false;
  return pipelineError.trim() === banner.message;
}
