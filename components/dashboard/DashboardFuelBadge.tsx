"use client";

import { useEffect, useState } from "react";
import { byokStatusLabel } from "@/lib/dashboard/byok-status-labels";
import { useIgnitionStore } from "@/src/stores/use-ignition-store";

const SYSTEM_MINT = "oklch(0.82 0.16 165)";

type DashboardFuelBadgeProps = {
  /** Server truth from `user.vaultKeyId` — preferred over client ignition store. */
  vaultKeyId?: string | null;
};

export function DashboardFuelBadge({ vaultKeyId }: DashboardFuelBadgeProps) {
  const [mounted, setMounted] = useState(false);
  const hasHydrated = useIgnitionStore((state) => state._hasHydrated);
  const clientReady = useIgnitionStore((state) => state.isIgnitionComplete());
  const serverHot = Boolean(vaultKeyId);
  const isActive = serverHot || clientReady;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || (!serverHot && (!hasHydrated || !clientReady))) {
    return null;
  }

  if (!isActive) {
    return null;
  }

  return (
    <span
      className="rounded-full border px-2 py-0.5 text-xs font-medium"
      style={{
        color: SYSTEM_MINT,
        borderColor: "oklch(0.82 0.16 165 / 0.4)",
        backgroundColor: "oklch(0.82 0.16 165 / 0.1)",
      }}
    >
      {byokStatusLabel(vaultKeyId)}
    </span>
  );
}
