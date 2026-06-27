"use client";

import { JetBrains_Mono } from "next/font/google";
import { motion } from "framer-motion";
import { KeyRound } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SETTINGS_ADD_KEY_HREF, SETTINGS_KEYS_HREF } from "@/lib/dashboard/settings-ai-links";
import {
  dashboardHeaderMintPillClassName,
  dashboardHeaderMintPillStyle,
  dashboardHeaderWarningPillClassName,
  dashboardHeaderWarningPillStyle,
} from "@/lib/dashboard/dashboard-header-chrome";
import { trackByokCtaClicked } from "@/src/shared/analytics/product-events";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

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
      href={SETTINGS_KEYS_HREF}
      onClick={() => trackByokCtaClicked("header_badge")}
      className={dashboardHeaderMintPillClassName(className)}
      style={dashboardHeaderMintPillStyle}
      aria-label="BYOK active — manage AI keys"
    >
      <KeyRound className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      BYOK Active
    </Link>
  );
}

const byokKeyButtonClassName = cn(
  jetbrainsMono.className,
  dashboardHeaderWarningPillClassName("uppercase tracking-[0.08em]"),
);

/** Header CTA when BYOK is not configured — opens add-key in Settings. */
export function BYOKKeyButton({ className }: { className?: string }) {
  return (
    <Link
      href={SETTINGS_ADD_KEY_HREF}
      onClick={() => trackByokCtaClicked("header_cta")}
      className={cn(byokKeyButtonClassName, className)}
      style={dashboardHeaderWarningPillStyle}
      aria-label="Add BYOK API key"
    >
      <KeyRound className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      BYOK KEY
    </Link>
  );
}

/** Same BYOK CTA as a button — for in-page actions (e.g. Settings header slot). */
export function BYOKKeyHeaderAction({
  className,
  onClick,
}: {
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        trackByokCtaClicked("settings_header");
        onClick();
      }}
      className={cn(byokKeyButtonClassName, className)}
      style={dashboardHeaderWarningPillStyle}
      aria-label="Add BYOK API key"
    >
      <KeyRound className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      BYOK KEY
    </button>
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
