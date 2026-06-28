/** `app_config` row key for enhance pipeline diagnostic logging. */
export const ENHANCE_DIAGNOSTICS_CONFIG_KEY = "enhanceDiagnostics";

/**
 * Severity of a diagnostic log line.
 * - light — verbose internals (counts, flag values, payload hints)
 * - low — step completion with key parameters
 * - high — boundaries, gate results, failures (always worth reading)
 */
export type EnhanceDiagnosticLogLevel = "light" | "low" | "high";

/** Minimum level emitted: light = all, low = low+high, high = high only. */
export type EnhanceDiagnosticThreshold = EnhanceDiagnosticLogLevel;

export interface EnhanceDiagnosticsConfig {
  /** Master switch — when false, no diagnostic lines (journey PostHog unchanged). */
  enabled: boolean;
  /** Minimum event severity to print. Default `light` = maximum detail. */
  logThreshold: EnhanceDiagnosticThreshold;
}

export const ENHANCE_DIAGNOSTICS_DEFAULTS: EnhanceDiagnosticsConfig = {
  enabled: true,
  logThreshold: "light",
};

const LEVEL_RANK: Record<EnhanceDiagnosticLogLevel, number> = {
  light: 0,
  low: 1,
  high: 2,
};

/** True when an event at `eventLevel` should emit given config threshold. */
export function shouldEmitEnhanceDiagnosticLog(
  threshold: EnhanceDiagnosticThreshold,
  eventLevel: EnhanceDiagnosticLogLevel,
): boolean {
  return LEVEL_RANK[eventLevel] >= LEVEL_RANK[threshold];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseThreshold(raw: unknown): EnhanceDiagnosticThreshold | null {
  if (raw === "light" || raw === "low" || raw === "high") return raw;
  return null;
}

export function parseEnhanceDiagnosticsConfig(value: unknown): EnhanceDiagnosticsConfig | null {
  if (!isRecord(value)) return null;

  const threshold =
    parseThreshold(value.logThreshold) ??
    parseThreshold(value.logLevel) ??
    parseThreshold(value.level);

  const enabled =
    typeof value.enabled === "boolean" ? value.enabled : threshold ? true : null;

  if (enabled === null && !threshold) return null;

  return {
    enabled: enabled ?? true,
    logThreshold: threshold ?? ENHANCE_DIAGNOSTICS_DEFAULTS.logThreshold,
  };
}

export function resolveEnhanceDiagnosticsConfig(value: unknown): EnhanceDiagnosticsConfig {
  return parseEnhanceDiagnosticsConfig(value) ?? ENHANCE_DIAGNOSTICS_DEFAULTS;
}

/** Env override for local debugging without DB write. */
export function readEnhanceDiagnosticsEnvOverride(): Partial<EnhanceDiagnosticsConfig> | null {
  if (typeof process === "undefined" || !process.env) return null;
  const enabledRaw = process.env.EASYSUBMIT_ENHANCE_DIAGNOSTICS_ENABLED?.trim();
  const thresholdRaw = process.env.EASYSUBMIT_ENHANCE_DIAGNOSTICS_THRESHOLD?.trim();
  const patch: Partial<EnhanceDiagnosticsConfig> = {};
  if (enabledRaw === "0" || enabledRaw === "false") patch.enabled = false;
  if (enabledRaw === "1" || enabledRaw === "true") patch.enabled = true;
  const threshold = parseThreshold(thresholdRaw);
  if (threshold) patch.logThreshold = threshold;
  return Object.keys(patch).length > 0 ? patch : null;
}
