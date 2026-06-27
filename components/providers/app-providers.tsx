"use client";

import type { ReactNode } from "react";
import { AnalyticsRoot } from "@/components/providers/analytics-root";
import { AuthProvider } from "@/components/providers/auth-provider";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthProvider>
      <AnalyticsRoot>{children}</AnalyticsRoot>
    </AuthProvider>
  );
}
