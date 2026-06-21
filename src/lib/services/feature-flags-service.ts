import { prisma } from "@/lib/prisma";

/** Stable DB keys — use snake_case for ops/SQL. */
export const FEATURE_FLAG_KEYS = {
  enhanceWithAiOnboarding: "enhance_with_ai_onboarding",
  enhanceWithAiResumeProfile: "enhance_with_ai_resume_profile",
} as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[keyof typeof FEATURE_FLAG_KEYS];

/** Parsed `feature_flags.extra` — arbitrary JSON object per flag. */
export type FeatureFlagExtra = Record<string, unknown>;

export type FeatureFlagDetail = {
  enabled: boolean;
  extra: FeatureFlagExtra | null;
};

type FeatureFlagDefinition = {
  key: FeatureFlagKey;
  description: string;
  defaultEnabled: boolean;
  defaultExtra?: FeatureFlagExtra | null;
};

/** Registry of known flags — add new entries here when shipping a toggle. */
export const FEATURE_FLAG_REGISTRY: Record<
  keyof typeof FEATURE_FLAG_KEYS,
  FeatureFlagDefinition
> = {
  enhanceWithAiOnboarding: {
    key: FEATURE_FLAG_KEYS.enhanceWithAiOnboarding,
    description: "Show Enhance with AI in onboarding Studio (phase 3)",
    defaultEnabled: true,
  },
  enhanceWithAiResumeProfile: {
    key: FEATURE_FLAG_KEYS.enhanceWithAiResumeProfile,
    description: "Show Enhance with AI in dashboard resume profile studio",
    defaultEnabled: true,
  },
};

export type FeatureFlagsSnapshot = {
  enhanceWithAiOnboarding: boolean;
  enhanceWithAiResumeProfile: boolean;
};

export const FEATURE_FLAGS_DEFAULTS: FeatureFlagsSnapshot = {
  enhanceWithAiOnboarding: FEATURE_FLAG_REGISTRY.enhanceWithAiOnboarding.defaultEnabled,
  enhanceWithAiResumeProfile: FEATURE_FLAG_REGISTRY.enhanceWithAiResumeProfile.defaultEnabled,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Parses `feature_flags.extra` — returns null when missing or not a JSON object. */
export function parseFeatureFlagExtra(value: unknown): FeatureFlagExtra | null {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) return null;
  return value;
}

function resolveEnabled(
  key: FeatureFlagKey,
  defaultEnabled: boolean,
  byKey: Map<string, boolean>,
): boolean {
  const stored = byKey.get(key);
  return stored ?? defaultEnabled;
}

function registryEntryForKey(key: string): FeatureFlagDefinition | undefined {
  return Object.values(FEATURE_FLAG_REGISTRY).find((entry) => entry.key === key);
}

function toFeatureFlagDetail(
  key: string,
  row: { enabled: boolean; extra: unknown } | null,
): FeatureFlagDetail {
  const registryEntry = registryEntryForKey(key);
  if (!row) {
    return {
      enabled: registryEntry?.defaultEnabled ?? false,
      extra: registryEntry?.defaultExtra ?? null,
    };
  }

  return {
    enabled: row.enabled,
    extra: parseFeatureFlagExtra(row.extra) ?? registryEntry?.defaultExtra ?? null,
  };
}

/** Full flag state (enabled + optional extra JSON). */
export async function getFeatureFlag(key: string): Promise<FeatureFlagDetail> {
  const row = await prisma.featureFlag.findUnique({
    where: { key },
    select: { enabled: true, extra: true },
  });

  return toFeatureFlagDetail(key, row);
}

/** Loads all registered feature flags. Missing rows fall back to registry defaults. */
export async function getFeatureFlags(): Promise<FeatureFlagsSnapshot> {
  const rows = await prisma.featureFlag.findMany({
    select: { key: true, enabled: true },
  });
  const byKey = new Map(rows.map((row) => [row.key, row.enabled]));

  return {
    enhanceWithAiOnboarding: resolveEnabled(
      FEATURE_FLAG_REGISTRY.enhanceWithAiOnboarding.key,
      FEATURE_FLAG_REGISTRY.enhanceWithAiOnboarding.defaultEnabled,
      byKey,
    ),
    enhanceWithAiResumeProfile: resolveEnabled(
      FEATURE_FLAG_REGISTRY.enhanceWithAiResumeProfile.key,
      FEATURE_FLAG_REGISTRY.enhanceWithAiResumeProfile.defaultEnabled,
      byKey,
    ),
  };
}

/** Enabled states plus `extra` JSON for every row in the database. */
export async function getFeatureFlagsWithExtra(): Promise<
  Record<string, FeatureFlagDetail>
> {
  const rows = await prisma.featureFlag.findMany({
    select: { key: true, enabled: true, extra: true },
  });

  const result: Record<string, FeatureFlagDetail> = {};
  for (const row of rows) {
    result[row.key] = toFeatureFlagDetail(row.key, row);
  }

  for (const entry of Object.values(FEATURE_FLAG_REGISTRY)) {
    if (!result[entry.key]) {
      result[entry.key] = toFeatureFlagDetail(entry.key, null);
    }
  }

  return result;
}

/** Single-flag lookup — unknown keys default to `false`. */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  const detail = await getFeatureFlag(key);
  return detail.enabled;
}

/** Rows to upsert on seed — does not overwrite `enabled` or `extra` on existing rows. */
export function getFeatureFlagSeedRows(): FeatureFlagDefinition[] {
  return Object.values(FEATURE_FLAG_REGISTRY);
}

/** Onboarding studio — requires feature flag and system AI (onboarding uses `forceSystem`). */
export function isEnhanceOnboardingVisible(
  flags: FeatureFlagsSnapshot,
  systemAiEnabled: boolean,
): boolean {
  return flags.enhanceWithAiOnboarding && systemAiEnabled;
}
