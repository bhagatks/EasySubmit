import { AnalyticsEvents } from "@/src/shared/analytics/events";
import { captureAnalyticsEvent } from "@/src/shared/analytics/browser";
import { sanitizeProperties } from "@/src/shared/analytics/sanitize";
import { SCREEN_CATALOG } from "@/src/shared/observability/screen-diagnostics-catalog";
import {
  logScreenOverlay as logScreenOverlayDiag,
  logScreenView as logScreenViewDiag,
  type ScreenViewInput,
} from "@/src/shared/observability/screen-diagnostics";

function screenAnalyticsPayload(input: ScreenViewInput): Record<string, unknown> {
  const catalog = SCREEN_CATALOG[input.screenId];
  return sanitizeProperties({
    screen_id: input.screenId,
    screen_label: catalog.name,
    zone: input.zone ?? catalog.zone,
    route: input.route ?? undefined,
    ...(input.params ?? {}),
    ...(input.flags ?? {}),
  });
}

/** Console `[ScreenDiag]` + PostHog `screen_viewed` for route-bound screens. */
export function trackScreenView(input: ScreenViewInput): void {
  logScreenViewDiag(input);
  captureAnalyticsEvent(AnalyticsEvents.SCREEN_VIEWED, screenAnalyticsPayload(input));
}

/** Console `[ScreenDiag]` + PostHog `screen_viewed` for overlays / extension surfaces. */
export function trackScreenOverlay(
  screenId: ScreenViewInput["screenId"],
  context?: Omit<ScreenViewInput, "screenId">,
): void {
  const input: ScreenViewInput = { screenId, ...context };
  logScreenOverlayDiag(screenId, context);
  captureAnalyticsEvent(AnalyticsEvents.SCREEN_VIEWED, screenAnalyticsPayload(input));
}
