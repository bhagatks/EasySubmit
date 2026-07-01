import {
  getAnalyticsConfig,
  isDevAnalyticsEnvironment,
  isLocalhostHost,
} from "@/src/shared/analytics/config";
import { sanitizeProperties } from "@/src/shared/analytics/sanitize";
import type { AnalyticsEventName } from "@/src/shared/analytics/events";

const DISTINCT_ID_KEY = "easysubmit_extension_ph_distinct_id_v1";

let identifiedUserId: string | null = null;

function canCapture(): boolean {
  const config = getAnalyticsConfig();
  return config.enabled && Boolean(config.key);
}

function readDistinctId(): string {
  if (typeof localStorage === "undefined") {
    return crypto.randomUUID();
  }
  const existing = localStorage.getItem(DISTINCT_ID_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(DISTINCT_ID_KEY, created);
  return created;
}

function clearDistinctId(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(DISTINCT_ID_KEY);
}

async function sendCapture(
  event: string,
  properties: Record<string, unknown>,
): Promise<void> {
  if (!canCapture()) return;

  const config = getAnalyticsConfig();
  const distinctId = identifiedUserId ?? readDistinctId();

  try {
    await fetch(`${config.host.replace(/\/$/, "")}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: config.key,
        event,
        properties: sanitizeProperties({
          $lib: "easysubmit-extension",
          ...properties,
        }),
        distinct_id: distinctId,
      }),
    });
  } catch {
    // Analytics must never break extension flows.
  }
}

export function isInternalAnalyticsTraffic(userId?: string | null): boolean {
  if (typeof window !== "undefined" && isLocalhostHost(window.location.hostname)) {
    return true;
  }
  const config = getAnalyticsConfig();
  const id = userId ?? identifiedUserId;
  return Boolean(id && config.internalUserIds.has(id));
}

function baseProperties(userId?: string | null): Record<string, unknown> {
  const config = getAnalyticsConfig();
  return {
    environment: config.environment,
    internal: isInternalAnalyticsTraffic(userId),
  };
}

export function captureAnalyticsEvent(
  event: AnalyticsEventName | string,
  properties?: Record<string, unknown>,
): void {
  void sendCapture(event, {
    ...baseProperties(),
    ...properties,
  });
}

/** Dev PostHog project only — use for resume journey debug, not prod metrics. */
export function captureDevAnalyticsEvent(
  event: AnalyticsEventName | string,
  properties?: Record<string, unknown>,
): void {
  if (!isDevAnalyticsEnvironment()) return;
  captureAnalyticsEvent(event, {
    dev_journey: true,
    ...properties,
  });
}

export function captureAnalyticsPageView(path?: string): void {
  void sendCapture("$pageview", {
    ...baseProperties(),
    ...(path ? { $current_url: path } : {}),
  });
}

export function identifyAnalyticsUser(userId: string): void {
  identifiedUserId = userId;
}

export function resetAnalyticsUser(): void {
  identifiedUserId = null;
  clearDistinctId();
}

export function captureAnalyticsException(error: unknown, context?: Record<string, unknown>): void {
  const err = error instanceof Error ? error : new Error(String(error));
  void sendCapture("$exception", {
    ...baseProperties(),
    ...context,
    $exception_message: err.message,
    $exception_type: err.name,
  });
}

export function initAnalyticsGlobalErrorHandlers(): void {
  if (typeof window === "undefined") return;
  if ((window as Window & { __esAnalyticsErrors?: boolean }).__esAnalyticsErrors) return;
  (window as Window & { __esAnalyticsErrors?: boolean }).__esAnalyticsErrors = true;

  window.addEventListener("error", (event) => {
    captureAnalyticsException(event.error ?? event.message, {
      source: "window.error",
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    captureAnalyticsException(event.reason, {
      source: "unhandledrejection",
    });
  });
}
