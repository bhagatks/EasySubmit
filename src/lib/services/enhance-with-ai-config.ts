/** `app_config` row key for Enhance with AI client controls. */
export const ENHANCE_WITH_AI_CONFIG_KEY = "enhanceWithAi";

/** Parsed `app_config.enhanceWithAi` payload. */
export interface EnhanceWithAiConfig {
  /** Max wait for the enhance server action on the client (milliseconds). */
  enhanceWithAiTimeoutMs: number;
}

/** Code default when DB row is missing or invalid (90 seconds). */
export const DEFAULT_ENHANCE_WITH_AI_TIMEOUT_MS = 90_000;

const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 600_000;

function readEnvTimeoutMs(): number | null {
  const raw = process.env.EASYSUBMIT_ENHANCE_WITH_AI_TIMEOUT_MS?.trim();
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return null;
  return clampEnhanceTimeoutMs(parsed);
}

/** Hardcoded safety default — env override, then code default. */
export const ENHANCE_WITH_AI_SAFETY_DEFAULT: EnhanceWithAiConfig = {
  enhanceWithAiTimeoutMs:
    readEnvTimeoutMs() ?? DEFAULT_ENHANCE_WITH_AI_TIMEOUT_MS,
};

export function clampEnhanceTimeoutMs(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_ENHANCE_WITH_AI_TIMEOUT_MS;
  }
  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, Math.round(value)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Parse DB JSON for `enhanceWithAi`; accepts legacy `EnhanceWithAITimeout` key. */
export function parseEnhanceWithAiConfig(value: unknown): EnhanceWithAiConfig | null {
  if (!isRecord(value)) return null;

  const raw =
    value.enhanceWithAiTimeoutMs ??
    value.EnhanceWithAITimeout ??
    value.enhanceWithAITimeout;

  if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) {
    return null;
  }

  return { enhanceWithAiTimeoutMs: clampEnhanceTimeoutMs(raw) };
}

export function resolveEnhanceWithAiConfig(value: unknown): EnhanceWithAiConfig {
  return parseEnhanceWithAiConfig(value) ?? ENHANCE_WITH_AI_SAFETY_DEFAULT;
}
