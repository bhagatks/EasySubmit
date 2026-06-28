"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AnalyticsIdentitySync } from "@/components/providers/analytics-identity-sync";
import { ScreenDiagnosticsTracker } from "@/components/providers/screen-diagnostics-tracker";
import {
  captureAnalyticsPageView,
  initAnalyticsGlobalErrorHandlers,
} from "@/src/shared/analytics";

function AnalyticsPageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    initAnalyticsGlobalErrorHandlers();
  }, []);

  useEffect(() => {
    const query = searchParams.toString();
    const path = query ? `${pathname}?${query}` : pathname;
    captureAnalyticsPageView(path);
  }, [pathname, searchParams]);

  return null;
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AnalyticsPageViewTracker />
      <ScreenDiagnosticsTracker />
      <AnalyticsIdentitySync />
      {children}
    </>
  );
}
