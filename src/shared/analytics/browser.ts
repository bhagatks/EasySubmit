import posthog from "posthog-js";
import {
  getAnalyticsConfig,
  isDevAnalyticsEnvironment,
  isLocalhostHost,
} from "@/src/shared/analytics/config";
import { sanitizeProperties } from "@/src/shared/analytics/sanitize";
import type { AnalyticsEventName } from "@/src/shared/analytics/events";

let initialized = false;
let identifiedUserId: string | null = null;

function canCapture(): boolean {
  const config = getAnalyticsConfig();
  return config.enabled && Boolean(config.key);
}

function initPostHog(): boolean {
  if (initialized) return canCapture();
  if (!canCapture()) return false;

  const config = getAnalyticsConfig();
  posthog.init(config.key, {
    api_host: config.host,
    person_profiles: "identified_only",
    capture_pageview: false,
    autocapture: config.autocapture,
    persistence: "localStorage+cookie",
  });
  initialized = true;
  return true;
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
  if (!initPostHog()) return;
  posthog.capture(
    event,
    sanitizeProperties({
      ...baseProperties(),
      ...properties,
    }),
  );
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
  if (!initPostHog()) return;
  posthog.capture(
    "$pageview",
    sanitizeProperties({
      ...baseProperties(),
      ...(path ? { $current_url: path } : {}),
    }),
  );
}

export function identifyAnalyticsUser(userId: string): void {
  identifiedUserId = userId;
  if (!initPostHog()) return;
  posthog.identify(userId);
}

export function resetAnalyticsUser(): void {
  identifiedUserId = null;
  if (!initialized) return;
  posthog.reset();
}

export function captureAnalyticsException(error: unknown, context?: Record<string, unknown>): void {
  if (!initPostHog()) return;
  const err = error instanceof Error ? error : new Error(String(error));
  posthog.captureException(err, sanitizeProperties(context));
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
