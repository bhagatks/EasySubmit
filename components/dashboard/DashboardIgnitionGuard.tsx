"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { readSessionApiKeyCipher } from "@/src/lib/ai/session-key-vault";
import { useIgnitionStore } from "@/src/stores/use-ignition-store";

type DashboardIgnitionGuardProps = {
  /** Server truth from `users.vaultKeyId`. */
  vaultKeyId?: string | null;
};

/**
 * On dashboard entry: if BYOK is missing (no server vault + no local cipher), send the
 * user to AI Keys or onboarding ignition — unless they are already on the keys page.
 */
export function DashboardIgnitionGuard({ vaultKeyId }: DashboardIgnitionGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const hasHydrated = useIgnitionStore((state) => state._hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;

    if (pathname.startsWith("/dashboard/keys")) {
      return;
    }

    void (async () => {
      const state = useIgnitionStore.getState();
      if (state.isIgnitionComplete()) return;

      const restored = await state.restoreIgnitionFromSession();
      if (restored) return;

      const cipher = readSessionApiKeyCipher();
      const latest = useIgnitionStore.getState();
      const hasClientKey = Boolean(cipher || latest.apiKey);
      const hasServerVault = Boolean(vaultKeyId);

      if (hasServerVault || hasClientKey) {
        return;
      }

      if (latest.isLocked && latest.lockSource === "missing_key") {
        latest.unlockIgnition();
      }

      router.replace("/dashboard/keys");
    })();
  }, [hasHydrated, pathname, router, vaultKeyId]);

  return null;
}
