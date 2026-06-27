"use client";

import { Suspense } from "react";
import { AnalyticsProvider } from "@/components/providers/analytics-provider";

export function AnalyticsRoot({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AnalyticsProvider>{children}</AnalyticsProvider>
    </Suspense>
  );
}
