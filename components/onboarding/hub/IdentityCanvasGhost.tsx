"use client";

import { motion } from "framer-motion";
import { Crosshair } from "lucide-react";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { cn } from "@/lib/utils";

const CANVAS = "oklch(0.16 0.04 268)";
const MINT = "oklch(0.82 0.16 165)";
const PRIMARY = "oklch(0.62 0.21 265)";
const MUTED = "oklch(0.45 0.02 268)";

type IdentityCanvasGhostProps = {
  monoClass: string;
  className?: string;
};

/** Technical loading grid + ghost coordinate lock for Identity phase canvas. */
export function IdentityCanvasGhost({
  monoClass,
  className,
}: IdentityCanvasGhostProps) {
  const targetRole = useOnboardingStore((state) => state.identity.targetRole);
  const roleLocked = targetRole.trim().length > 0;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden rounded-[2px]",
        className,
      )}
      style={{ backgroundColor: CANVAS }}
    >
      <motion.div
        className="absolute inset-0"
        animate={{
          opacity: roleLocked ? 0.55 : 0.22,
        }}
        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{
          backgroundImage: `
            linear-gradient(to right, oklch(0.82 0.16 165 / 0.14) 1px, transparent 1px),
            linear-gradient(to bottom, oklch(0.82 0.16 165 / 0.14) 1px, transparent 1px)
          `,
          backgroundSize: "28px 28px",
        }}
      />

      <motion.div
        className="absolute inset-0"
        animate={{
          opacity: roleLocked ? [0.15, 0.35, 0.15] : 0,
        }}
        transition={{
          duration: roleLocked ? 2.4 : 0.3,
          repeat: roleLocked ? Infinity : 0,
          ease: "easeInOut",
        }}
        style={{
          backgroundImage: `
            linear-gradient(to right, oklch(0.62 0.21 265 / 0.12) 1px, transparent 1px),
            linear-gradient(to bottom, oklch(0.62 0.21 265 / 0.12) 1px, transparent 1px)
          `,
          backgroundSize: "7px 7px",
        }}
      />

      {roleLocked ? (
        <>
          <div
            className="absolute inset-x-0 z-10 h-20 animate-scan"
            style={{
              background:
                "linear-gradient(180deg, transparent, oklch(0.82 0.16 165 / 0.08), oklch(0.82 0.16 165 / 0.28), oklch(0.82 0.16 165 / 0.08), transparent)",
            }}
          />
          <div
            className="absolute inset-x-0 z-20 h-px animate-scan"
            style={{
              backgroundColor: MINT,
              boxShadow: "0 0 16px oklch(0.82 0.16 165 / 0.55)",
            }}
          />
        </>
      ) : null}

      <div className="absolute inset-x-0 bottom-[12%] z-30 flex flex-col items-center gap-3 px-6 text-center">
        <motion.div
          initial={false}
          animate={{
            scale: roleLocked ? 1 : 0.92,
            opacity: roleLocked ? 1 : 0.65,
          }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex h-11 w-11 items-center justify-center rounded-full border"
          style={{
            borderColor: roleLocked ? MINT : "oklch(0.45 0.02 268 / 0.35)",
            backgroundColor: roleLocked
              ? "oklch(0.82 0.16 165 / 0.12)"
              : "oklch(0.16 0.04 268 / 0.6)",
            boxShadow: roleLocked
              ? "0 0 32px oklch(0.82 0.16 165 / 0.35)"
              : undefined,
          }}
        >
          <Crosshair
            className="h-5 w-5"
            style={{ color: roleLocked ? MINT : MUTED }}
          />
        </motion.div>

        <p
          className={cn(monoClass, "text-[10px] font-medium uppercase tracking-[0.2em]")}
          style={{ color: roleLocked ? MINT : MUTED }}
        >
          {roleLocked ? "Coordinate locked" : "Technical grid · awaiting role"}
        </p>

        <motion.p
          key={targetRole.trim() || "empty"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: roleLocked ? 1 : 0, y: roleLocked ? 0 : 8 }}
          transition={{ duration: 0.35 }}
          className={cn(monoClass, "max-w-[18rem] text-[11px] uppercase tracking-[0.14em]")}
          style={{ color: PRIMARY }}
        >
          {targetRole.trim()}
        </motion.p>
      </div>
    </div>
  );
}
