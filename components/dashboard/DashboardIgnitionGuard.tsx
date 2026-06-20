"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { readSessionApiKeyCipher } from "@/src/lib/ai/session-key-vault";
import { useIgnitionStore } from "@/src/stores/use-ignition-store";

/**
 * On dashboard entry only: if BYOK / Primary Fuel is missing after rehydration,
 * send the user to onboarding Ignition Gate instead of the Key Protector overlay.
 * Key Protector remains for provider auth failures (401/403) during active use.
 */
export function DashboardIgnitionGuard() {
  const router = useRouter();
  const hasHydrated = useIgnitionStore((state) => state._hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;

    void (async () => {
      const state = useIgnitionStore.getState();
      if (state.isIgnitionComplete()) return;

      const restored = await state.restoreIgnitionFromSession();
      if (restored) return;

      const cipher = readSessionApiKeyCipher();
      const latest = useIgnitionStore.getState();
      if (!cipher && !latest.apiKey) {
        if (latest.isLocked && latest.lockSource === "missing_key") {
          latest.unlockIgnition();
        }
        router.replace("/onboarding?ignition=1");
      }
    })();
  }, [hasHydrated, router]);

  return null;
}
