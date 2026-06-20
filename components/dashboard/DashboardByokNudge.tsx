"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { KeyRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <AnimatePresence>
      {open ? (
        <motion.div
          key="byok-nudge"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="presentation"
        >
          <motion.button
            type="button"
            aria-label="Dismiss"
            className="pointer-events-auto absolute inset-0 bg-background/70 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
          />
          <motion.div
            role="dialog"
            aria-labelledby="byok-nudge-title"
            aria-describedby="byok-nudge-desc"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="pointer-events-auto relative w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-glow"
          >
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
              <KeyRound className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>

            <h2
              id="byok-nudge-title"
              className="mt-4 font-display text-xl font-semibold tracking-tight"
            >
              Add a key to unlock AI
            </h2>
            <p id="byok-nudge-desc" className="mt-2 text-sm text-muted-foreground">
              Connect your provider key to run resume refinement and apply automation. You can
              browse and edit resumes without one.
            </p>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button variant="hero" className="flex-1" asChild>
                <Link href="/dashboard/keys" onClick={handleDismiss}>
                  Connect AI Keys
                </Link>
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleDismiss}>
                Continue browsing
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
