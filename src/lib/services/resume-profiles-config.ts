/** `app_config` row key for resume profile limits. */
export const RESUME_PROFILES_CONFIG_KEY = "resumeProfiles";

export type ResumeProfilesConfig = {
  /** Max resume profiles (`profiles` rows) per user account. */
  maxProfilesPerCustomer: number;
};

export const RESUME_PROFILES_DEFAULTS: ResumeProfilesConfig = {
  maxProfilesPerCustomer: 20,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePositiveInt(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.round(value);
}

export function parseResumeProfilesConfig(value: unknown): ResumeProfilesConfig {
  if (!isRecord(value)) {
    return RESUME_PROFILES_DEFAULTS;
  }

  return {
    maxProfilesPerCustomer: parsePositiveInt(
      value.maxProfilesPerCustomer,
      RESUME_PROFILES_DEFAULTS.maxProfilesPerCustomer,
    ),
  };
}
