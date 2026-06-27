"use client";

import { JetBrains_Mono } from "next/font/google";
import { motion } from "framer-motion";
import { KeyRound } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { trackByokCtaClicked } from "@/src/shared/analytics/product-events";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const WARNING_RED = "oklch(0.55 0.22 25)";
const SYSTEM_MINT = "oklch(0.82 0.16 165)";

export function resolveBYOKStatus(vaultKeyId?: string | null): "ACTIVE" | "INACTIVE" {
  return vaultKeyId ? "ACTIVE" : "INACTIVE";
}

type BYOKStatusProps = {
  vaultKeyId?: string | null;
  className?: string;
};

/** Header badge when BYOK is vaulted and active. */
export function BYOKStatusBadge({ vaultKeyId, className }: BYOKStatusProps) {
  const status = resolveBYOKStatus(vaultKeyId);

  if (status !== "ACTIVE") {
    return null;
  }

  return (
    <Link
      href="/dashboard/keys"
      onClick={() => trackByokCtaClicked("header_badge")}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-opacity hover:opacity-90",
        className,
      )}
      style={{
        color: SYSTEM_MINT,
        borderColor: "oklch(0.82 0.16 165 / 0.4)",
        backgroundColor: "oklch(0.82 0.16 165 / 0.1)",
      }}
      aria-label="BYOK active — manage AI keys"
    >
      <KeyRound className="h-3 w-3 shrink-0" aria-hidden="true" />
      BYOK Active
    </Link>
  );
}

/** Header CTA when BYOK is not configured — links to AI Keys. */
export function BYOKKeyButton({ className }: { className?: string }) {
  return (
    <Link
      href="/dashboard/keys"
      onClick={() => trackByokCtaClicked("header_cta")}
      className={cn(
        jetbrainsMono.className,
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] transition-opacity hover:opacity-90",
        className,
      )}
      style={{
        color: WARNING_RED,
        borderColor: "oklch(0.55 0.22 25 / 0.45)",
        backgroundColor: "oklch(0.55 0.22 25 / 0.1)",
      }}
      aria-label="Add BYOK API key"
    >
      <KeyRound className="h-3 w-3 shrink-0" aria-hidden="true" />
      BYOK KEY
    </Link>
  );
}

/** Compact inactive indicator for the AI Keys sidebar nav item. */
export function BYOKInactiveNavBadge({ className }: { className?: string }) {
  const mono = jetbrainsMono.className;

  return (
    <motion.span
      className={cn(
        mono,
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.08em]",
        className,
      )}
      style={{
        color: "oklch(0.62 0.21 265)",
        borderColor: "oklch(0.62 0.21 265 / 0.35)",
        backgroundColor: "oklch(0.62 0.21 265 / 0.08)",
      }}
      animate={{}}
      aria-hidden="true"
    >
      Add key
    </motion.span>
  );
}
