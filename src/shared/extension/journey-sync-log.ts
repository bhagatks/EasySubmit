export const JOURNEY_SYNC_LOG_PREFIX = "[EasySubmit:Sync]";

export type JourneySyncLogSurface = "extension" | "app" | "server";

export type JourneySyncLogPayload = Record<string, unknown>;

function emit(
  level: "info" | "warn" | "debug",
  surface: JourneySyncLogSurface,
  event: string,
  payload?: JourneySyncLogPayload,
): void {
  const line = `${JOURNEY_SYNC_LOG_PREFIX}[${surface}] ${event}`;
  const data = payload ?? {};
  if (level === "warn") {
    console.warn(line, data);
    return;
  }
  if (level === "debug") {
    console.debug(line, data);
    return;
  }
  console.info(line, data);
}

export function journeySyncLog(
  surface: JourneySyncLogSurface,
  event: string,
  payload?: JourneySyncLogPayload,
): void {
  emit("info", surface, event, payload);
}

export function journeySyncWarn(
  surface: JourneySyncLogSurface,
  event: string,
  payload?: JourneySyncLogPayload,
): void {
  emit("warn", surface, event, payload);
}

export function journeySyncDebug(
  surface: JourneySyncLogSurface,
  event: string,
  payload?: JourneySyncLogPayload,
): void {
  emit("debug", surface, event, payload);
}

/** Browser-only — verbose dashboard sync logs when testing. */
export function isJourneySyncDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("easysubmit_sync_debug") === "1";
  } catch {
    return false;
  }
}
