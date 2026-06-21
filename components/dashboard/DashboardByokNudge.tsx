"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlossyPromoOverlay } from "@/components/ui/glossy-promo-overlay";
import {
  dismissByokNudge,
  isByokNudgeDismissed,
} from "@/lib/dashboard/byok-nudge-storage";
import { useIgnitionStore } from "@/src/stores/use-ignition-store";

type DashboardByokNudgeProps = {
  vaultKeyId?: string | null;
};

/**
 * One-time centered prompt when the dashboard loads without a vaulted BYOK key.
 */
export function DashboardByokNudge({ vaultKeyId }: DashboardByokNudgeProps) {
  const pathname = usePathname();
  const hasHydrated = useIgnitionStore((state) => state._hasHydrated);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!hasHydrated || vaultKeyId) return;
    if (pathname.startsWith("/dashboard/keys")) return;
    if (isByokNudgeDismissed(window.localStorage)) return;

    const timer = window.setTimeout(() => setOpen(true), 400);
    return () => window.clearTimeout(timer);
  }, [hasHydrated, pathname, vaultKeyId]);

  const handleDismiss = () => {
    dismissByokNudge(window.localStorage);
    setOpen(false);
  };

  return (
    <GlossyPromoOverlay
      open={open}
      onDismiss={handleDismiss}
      title="Add a key to unlock AI"
      description="Connect your provider key to run resume refinement and apply automation. You can browse and edit resumes without one."
      icon={
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
          <KeyRound className="h-6 w-6 text-primary" aria-hidden="true" />
        </div>
      }
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="hero" className="flex-1 rounded-xl" asChild>
          <Link href="/dashboard/keys" onClick={handleDismiss}>
            Connect AI Keys
          </Link>
        </Button>
        <Button variant="outline" className="flex-1 rounded-xl" onClick={handleDismiss}>
          Continue browsing
        </Button>
      </div>
    </GlossyPromoOverlay>
  );
}
