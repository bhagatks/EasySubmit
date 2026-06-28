import type { EnhanceLogScope } from "@/src/lib/ai/engine/enhance-logger";
import { ENHANCE_AI_LOG_PREFIX, logEnhance } from "@/src/lib/ai/engine/enhance-logger";
import {
  PIPELINE_STEP_TO_DESIGN,
  type EnhanceDesignStepId,
  type EnhanceDiagnosticPhase,
  type EnhanceDiagnosticTrack,
} from "@/src/lib/ai/engine/enhance-diagnostics-catalog";
import type { EnhancePipelineStep } from "@/src/lib/ai/engine/enhance-pipeline";
import { pipelineStepHint } from "@/src/lib/ai/engine/enhance-pipeline";
import {
  readEnhanceDiagnosticsEnvOverride,
  resolveEnhanceDiagnosticsConfig,
  shouldEmitEnhanceDiagnosticLog,
  type EnhanceDiagnosticLogLevel,
  type EnhanceDiagnosticsConfig,
} from "@/src/lib/services/enhance-diagnostics-config";
import { getAppConfig } from "@/src/lib/services/config-service";

export const ENHANCE_DIAG_LOG_PREFIX = "[EnhanceDiag]";

let cachedConfig: EnhanceDiagnosticsConfig | null = null;
let cachedAt = 0;
const CONFIG_TTL_MS = 30_000;

const traceSessions = new Map<string, EnhanceDiagnosticsConfig>();

export async function getEnhanceDiagnosticsConfig(): Promise<EnhanceDiagnosticsConfig> {
  const envOverride = readEnhanceDiagnosticsEnvOverride();
  const now = Date.now();
  if (!envOverride && cachedConfig && now - cachedAt < CONFIG_TTL_MS) {
    return cachedConfig;
  }
  const fromDb = resolveEnhanceDiagnosticsConfig(await getAppConfig("enhanceDiagnostics"));
  const merged: EnhanceDiagnosticsConfig = {
    ...fromDb,
    ...(envOverride ?? {}),
  };
  cachedConfig = merged;
  cachedAt = now;
  return merged;
}

/** Bind config to a trace for the duration of one enhance transaction. */
export async function beginEnhanceDiagnosticSession(
  traceId: string,
): Promise<EnhanceDiagnosticsConfig> {
  const config = await getEnhanceDiagnosticsConfig();
  traceSessions.set(traceId, config);
  logEnhanceDiag({
    traceId,
    designStep: "0",
    track: "pipeline",
    pipelineStep: "10_server_action_start",
    phase: "start",
    level: "high",
    event: "session.start",
    scope: "server",
    params: {
      logThreshold: config.logThreshold,
      enabled: config.enabled,
    },
  });
  return config;
}

export function endEnhanceDiagnosticSession(traceId: string): void {
  traceSessions.delete(traceId);
}

function resolveSessionConfig(traceId: string): EnhanceDiagnosticsConfig | null {
  return traceSessions.get(traceId) ?? cachedConfig;
}

export type EnhanceDiagInput = {
  traceId: string;
  designStep: EnhanceDesignStepId;
  track: EnhanceDiagnosticTrack;
  pipelineStep: EnhancePipelineStep | string;
  phase: EnhanceDiagnosticPhase;
  level: EnhanceDiagnosticLogLevel;
  event: string;
  scope?: EnhanceLogScope;
  userId?: string | null;
  surface?: string | null;
  variant?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  /** Feature flags, gate inputs, route mode, cache hits, etc. */
  flags?: Record<string, string | number | boolean | null | undefined>;
  /** Step-specific metrics (counts, durations, previews). */
  params?: Record<string, unknown>;
};

/**
 * Structured diagnostic log for one enhance transaction.
 * Filtered by `app_config.enhanceDiagnostics.logThreshold` (default `light` = all).
 */
export function logEnhanceDiag(input: EnhanceDiagInput): void {
  const config = resolveSessionConfig(input.traceId);
  if (config && !config.enabled) return;
  if (
    config &&
    !shouldEmitEnhanceDiagnosticLog(config.logThreshold, input.level)
  ) {
    return;
  }

  const hint = pipelineStepHint(
    typeof input.pipelineStep === "string" ? input.pipelineStep : undefined,
  );
  const designFromPipeline = PIPELINE_STEP_TO_DESIGN[input.pipelineStep];

  const payload: Record<string, unknown> = {
    ts: new Date().toISOString(),
    diag: true,
    traceId: input.traceId,
    designStep: input.designStep,
    track: input.track,
    phase: input.phase,
    level: input.level,
    event: input.event,
    step: input.pipelineStep,
    ...(designFromPipeline ? { designStepHint: designFromPipeline } : {}),
    ...(hint ? { hint } : {}),
    ...(input.userId ? { userId: input.userId } : {}),
    ...(input.surface ? { surface: input.surface } : {}),
    ...(input.variant ? { variant: input.variant } : {}),
    ...(input.errorCode ? { errorCode: input.errorCode } : {}),
    ...(input.errorMessage ? { errorMessage: input.errorMessage } : {}),
    ...(input.flags && Object.keys(input.flags).length > 0 ? { flags: input.flags } : {}),
    ...(input.params && Object.keys(input.params).length > 0 ? { params: input.params } : {}),
  };

  if (!isEnhanceDiagConsoleEnabled()) return;

  console.log(ENHANCE_DIAG_LOG_PREFIX, payload);
}

function isEnhanceDiagConsoleEnabled(): boolean {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
    return false;
  }
  return true;
}

/** Log AI gate G1–G6 with pass/fail and reason. */
export function logEnhanceGate(input: {
  traceId: string;
  gate: EnhanceDesignStepId;
  passed: boolean;
  reason?: string | null;
  flags?: EnhanceDiagInput["flags"];
  level?: EnhanceDiagnosticLogLevel;
}): void {
  logEnhanceDiag({
    traceId: input.traceId,
    designStep: input.gate,
    track: "gate",
    pipelineStep: input.passed ? "13_server_route" : "27a_ai_upgrade_blocked",
    phase: input.passed ? "done" : "block",
    level: input.level ?? (input.passed ? "low" : "high"),
    event: input.passed ? "gate.pass" : "gate.block",
    scope: "server",
    errorCode: input.passed ? null : (input.reason ?? "blocked"),
    flags: input.flags,
  });
}

/** Mirror to legacy `[EnhanceAI]` for tools that only grep that prefix. */
export function logEnhanceDiagAlsoLegacy(
  scope: EnhanceLogScope,
  input: EnhanceDiagInput,
): void {
  logEnhanceDiag(input);
  logEnhance(scope, input.event, {
    traceId: input.traceId,
    step: input.pipelineStep,
    designStep: input.designStep,
    track: input.track,
    phase: input.phase,
    level: input.level,
    ...input.flags,
    ...input.params,
    ...(input.errorCode ? { errorCode: input.errorCode } : {}),
    ...(input.errorMessage ? { errorMessage: input.errorMessage } : {}),
  });
}

export { ENHANCE_AI_LOG_PREFIX };
