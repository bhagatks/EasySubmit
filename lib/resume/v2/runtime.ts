import {
  DEFAULT_RESUME_PAGE_MODE_V2,
  isResumePageModeV2Implemented,
  normalizeResumePageModeV2,
  type ResumePageModeV2,
} from "@/lib/resume/v2/page-mode";
import type { ResumeRulesV2OffReason } from "@/lib/features/types";

export type ResumeRulesV2Resolution = {
  enabled: boolean;
  pageMode: ResumePageModeV2;
  profileImplemented: boolean;
  reason?: ResumeRulesV2OffReason;
};

function envOverride(): boolean | null {
  if (process.env.RESUME_RULES_V2_ENABLED === "true") return true;
  if (process.env.NEXT_PUBLIC_RESUME_RULES_V2 === "true") return true;
  if (process.env.RESUME_RULES_V2_ENABLED === "false") return false;
  if (process.env.NEXT_PUBLIC_RESUME_RULES_V2 === "false") return false;
  return null;
}

export function resolveResumeRulesV2ForPageMode(
  pageLengthPreference: unknown,
  featureEnabled: boolean,
): ResumeRulesV2Resolution {
  const env = envOverride();
  const pageMode = normalizeResumePageModeV2(
    pageLengthPreference ?? DEFAULT_RESUME_PAGE_MODE_V2,
  );
  const profileImplemented = isResumePageModeV2Implemented(pageMode);

  if (env === true) {
    return {
      enabled: profileImplemented,
      pageMode,
      profileImplemented,
      reason: profileImplemented ? undefined : "page_mode_not_implemented",
    };
  }
  if (env === false) {
    return {
      enabled: false,
      pageMode,
      profileImplemented,
      reason: "env_disabled",
    };
  }

  if (!featureEnabled) {
    return {
      enabled: false,
      pageMode,
      profileImplemented,
      reason: "feature_disabled",
    };
  }

  if (!profileImplemented) {
    return {
      enabled: false,
      pageMode,
      profileImplemented: false,
      reason: "page_mode_not_implemented",
    };
  }

  return {
    enabled: true,
    pageMode,
    profileImplemented: true,
  };
}

export type ResumeRulesV2RuntimeOptions = {
  /** From `resolveFeature({ feature: "resumeRulesV2" })` on server paths. */
  featureEnabled?: boolean;
};

/** Sync gate for server + client — env overrides, then feature flag + page mode. */
export function isResumeRulesV2Enabled(
  pageLengthPreference?: unknown,
  options: ResumeRulesV2RuntimeOptions = {},
): boolean {
  return resolveResumeRulesV2ForPageMode(
    pageLengthPreference ?? DEFAULT_RESUME_PAGE_MODE_V2,
    options.featureEnabled ?? false,
  ).enabled;
}

export function normalizeActiveResumePageMode(pageLengthPreference?: unknown): ResumePageModeV2 {
  return normalizeResumePageModeV2(pageLengthPreference ?? DEFAULT_RESUME_PAGE_MODE_V2);
}
