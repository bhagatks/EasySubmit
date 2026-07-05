/** Max career-grade models to probe per provider refresh (cost-bounded). */
export const MODEL_HEALTH_MAX_PROBE_COUNT = 5;

/** Skip models in cooldown until this many ms after last failure. */
export const MODEL_HEALTH_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** Re-probe on vault save if health is older than this. */
export const MODEL_HEALTH_STALE_MS = 7 * 24 * 60 * 60 * 1000;

export const MODEL_HEALTH_PROBE_PROMPT = "Reply with the single word OK.";

export const MODEL_HEALTH_PROBE_MAX_OUTPUT_TOKENS = 4;

/** Structured generateObject probes need more tokens than single-word text probes. */
export const MODEL_HEALTH_STRUCTURED_PROBE_MAX_OUTPUT_TOKENS = 64;
