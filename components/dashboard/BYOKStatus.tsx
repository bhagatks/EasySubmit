"use client";

import { JetBrains_Mono } from "next/font/google";
import { motion } from "framer-motion";
import { AlertTriangle, KeyRound } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

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

/** Header badge — mint when vaulted; red pulsing inactive with link to AI Keys. */
export function BYOKStatusBadge({ vaultKeyId, className }: BYOKStatusProps) {
  const status = resolveBYOKStatus(vaultKeyId);
  const mono = jetbrainsMono.className;

  if (status === "ACTIVE") {
    return (
      <Link
        href="/dashboard/keys"
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

  return (
    <Link
      href="/dashboard/keys"
      className={cn("group inline-flex flex-col items-end gap-0.5 sm:items-center sm:gap-0", className)}
      aria-label="BYOK inactive — add an API key"
    >
      <motion.span
        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium"
        style={{
          color: WARNING_RED,
          borderColor: "oklch(0.55 0.22 25 / 0.45)",
          backgroundColor: "oklch(0.55 0.22 25 / 0.1)",
        }}
        animate={{
          boxShadow: [
            "0 0 0 0 oklch(0.55 0.22 25 / 0.4)",
            "0 0 0 6px oklch(0.55 0.22 25 / 0)",
            "0 0 0 0 oklch(0.55 0.22 25 / 0.4)",
          ],
        }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
        BYOK Inactive
      </motion.span>
      <span
        className={cn(
          mono,
          "hidden text-[10px] uppercase tracking-[0.1em] text-[oklch(0.55_0.22_25/0.9)] group-hover:underline sm:inline",
        )}
      >
        Add API key →
      </span>
    </Link>
  );
}
