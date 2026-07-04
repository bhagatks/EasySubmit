"use client";

import type { ReactNode } from "react";
import { AnalyticsRoot } from "@/components/providers/analytics-root";
import { AuthProvider } from "@/components/providers/auth-provider";
import { SupabaseProvider } from "@/components/providers/supabase-provider";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <SupabaseProvider>
      <AuthProvider>
        <AnalyticsRoot>{children}</AnalyticsRoot>
      </AuthProvider>
    </SupabaseProvider>
  );
}
