"use client";

import { useEffect } from "react";
import { shouldResetClientIgnition } from "@/lib/dashboard/ignition-vault-sync";
import { useIgnitionStore } from "@/src/stores/use-ignition-store";

type DashboardIgnitionGuardProps = {
  /** Server truth from `users.vaultKeyId`. */
  vaultKeyId?: string | null;
};

/**
 * Keeps client ignition state aligned with server vault truth. Does not block navigation —
 * missing BYOK is surfaced via Cold Engine UI and action-time gates.
 */
export function DashboardIgnitionGuard({ vaultKeyId }: DashboardIgnitionGuardProps) {
  const hasHydrated = useIgnitionStore((state) => state._hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;

    void (async () => {
      const state = useIgnitionStore.getState();

      if (!state.isIgnitionComplete()) {
        await state.restoreIgnitionFromSession();
      }

      const latest = useIgnitionStore.getState();

      if (shouldResetClientIgnition(vaultKeyId, latest.isIgnitionComplete())) {
        latest.resetIgnition();
      }

      if (latest.isLocked && latest.lockSource === "missing_key") {
        latest.unlockIgnition();
      }
    })();
  }, [hasHydrated, vaultKeyId]);

  return null;
}
