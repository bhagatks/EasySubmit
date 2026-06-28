import {
  SCREEN_CATALOG,
  type ScreenAuthZone,
  type ScreenId,
} from "@/src/shared/observability/screen-diagnostics-catalog";
import {
  readEnhanceDiagnosticsEnvOverride,
  resolveEnhanceDiagnosticsConfig,
  shouldEmitEnhanceDiagnosticLog,
  type EnhanceDiagnosticLogLevel,
  type EnhanceDiagnosticsConfig,
} from "@/src/lib/services/enhance-diagnostics-config";

export const SCREEN_DIAG_LOG_PREFIX = "[ScreenDiag]";

export type ScreenDiagPhase = "start" | "done" | "skip" | "fail";

let cachedConfig: EnhanceDiagnosticsConfig | null = null;

function resolveConfig(): EnhanceDiagnosticsConfig {
  const envOverride = readEnhanceDiagnosticsEnvOverride();
  if (envOverride) {
    return resolveEnhanceDiagnosticsConfig({ ...envOverride });
  }
  if (cachedConfig) return cachedConfig;
  cachedConfig = resolveEnhanceDiagnosticsConfig(null);
  return cachedConfig;
}

function isScreenDiagConsoleEnabled(): boolean {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
    return false;
  }
  return true;
}

export type ScreenDiagInput = {
  screenId: ScreenId;
  level: EnhanceDiagnosticLogLevel;
  event: string;
  phase: ScreenDiagPhase;
  route?: string | null;
  zone?: ScreenAuthZone;
  errorCode?: string | null;
  errorMessage?: string | null;
  flags?: Record<string, string | number | boolean | null | undefined>;
  params?: Record<string, unknown>;
};

export function logScreenDiag(input: ScreenDiagInput): void {
  const config = resolveConfig();
  if (!config.enabled) return;
  if (!shouldEmitEnhanceDiagnosticLog(config.logThreshold, input.level)) return;
  if (!isScreenDiagConsoleEnabled()) return;

  const catalog = SCREEN_CATALOG[input.screenId];

  const payload: Record<string, unknown> = {
    ts: new Date().toISOString(),
    diag: true,
    track: "screen",
    screenId: input.screenId,
    screenName: catalog.name,
    zone: input.zone ?? catalog.zone,
    phase: input.phase,
    level: input.level,
    event: input.event,
    ...(input.route ? { route: input.route } : {}),
    ...(input.errorCode ? { errorCode: input.errorCode } : {}),
    ...(input.errorMessage ? { errorMessage: input.errorMessage } : {}),
    ...(input.flags && Object.keys(input.flags).length > 0 ? { flags: input.flags } : {}),
    ...(input.params && Object.keys(input.params).length > 0 ? { params: input.params } : {}),
  };

  console.log(SCREEN_DIAG_LOG_PREFIX, payload);
}

export type ScreenViewInput = {
  screenId: ScreenId;
  route?: string | null;
  zone?: ScreenAuthZone;
  params?: Record<string, unknown>;
  flags?: Record<string, string | number | boolean | null | undefined>;
};

/**
 * Emit the standard three-tier screen view logs (high → low → light).
 * Uses the same threshold config as `[EnhanceDiag]` (`app_config.enhanceDiagnostics`).
 */
export function logScreenView(input: ScreenViewInput): void {
  const catalog = SCREEN_CATALOG[input.screenId];

  logScreenDiag({
    screenId: input.screenId,
    level: "high",
    event: "screen.enter",
    phase: "start",
    route: input.route,
    zone: input.zone ?? catalog.zone,
    params: {
      screenName: catalog.name,
      ...(input.params ?? {}),
    },
  });

  logScreenDiag({
    screenId: input.screenId,
    level: "low",
    event: "screen.ready",
    phase: "done",
    route: input.route,
    zone: input.zone ?? catalog.zone,
    params: input.params,
  });

  logScreenDiag({
    screenId: input.screenId,
    level: "light",
    event: "screen.context",
    phase: "done",
    route: input.route,
    zone: input.zone ?? catalog.zone,
    flags: input.flags,
  });
}

/** For overlays/modals/extension surfaces without a dedicated route. */
export function logScreenOverlay(
  screenId: ScreenId,
  context?: Omit<ScreenViewInput, "screenId">,
): void {
  logScreenView({
    screenId,
    ...context,
  });
}
