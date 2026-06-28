"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  resolveScreenIdFromPath,
  sanitizeQueryKeys,
} from "@/src/shared/observability/resolve-screen-from-path";
import { trackScreenView } from "@/src/shared/analytics/screen-events";

/**
 * Logs `[ScreenDiag]` + PostHog `screen_viewed` on every route change.
 * Mounted from `AnalyticsProvider` alongside PostHog `$pageview`.
 */
export function ScreenDiagnosticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastRouteRef = useRef<string | null>(null);

  useEffect(() => {
    const query = searchParams.toString();
    const route = query ? `${pathname}?${query}` : pathname;
    if (lastRouteRef.current === route) return;
    lastRouteRef.current = route;

    const screenId = resolveScreenIdFromPath(pathname);
    const queryKeys = sanitizeQueryKeys(query ? `?${query}` : "");

    trackScreenView({
      screenId,
      route: pathname,
      params: {
        hasQuery: queryKeys.length > 0,
        queryKeyCount: queryKeys.length,
      },
      flags: {
        queryKeys: queryKeys.join(",") || null,
        setup: searchParams.get("setup") === "1" ? true : null,
        welcome: searchParams.get("welcome") === "1" ? true : null,
        fromReview: searchParams.get("from") === "review" ? true : null,
        jobPanel: searchParams.get("panel") ?? null,
      },
    });
  }, [pathname, searchParams]);

  return null;
}
