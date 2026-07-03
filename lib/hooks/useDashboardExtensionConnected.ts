"use client";

import { useEffect, useState } from "react";
import { isExtensionConnectedForDashboard } from "@/lib/extension/extension-dashboard-connection";

/** `null` while the first PING is in flight — hide install CTAs until resolved. */
export function useDashboardExtensionConnected(): boolean | null {
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void isExtensionConnectedForDashboard().then((value) => {
      if (!cancelled) setConnected(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return connected;
}
