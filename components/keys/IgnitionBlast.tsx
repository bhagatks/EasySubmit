"use client";

import { JetBrains_Mono } from "next/font/google";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, forwardRef, type ReactNode } from "react";
import { ScanningBeam } from "@/components/resume/ScanningBeam";
import type { HandshakeProvider } from "@/src/lib/config/career-grade-models";
import type { IgnitionBlastOrigin } from "@/lib/keys/blast-origin";
import { resolveBlastOriginFromCell } from "@/lib/keys/blast-origin";
import { cn } from "@/lib/utils";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const MINT = "oklch(0.82 0.16 165)";
const PAPER = "oklch(0.98 0.01 268)";
const NAVY = "oklch(0.16 0.04 268)";

export type { IgnitionBlastOrigin } from "@/lib/keys/blast-origin";

export type IgnitionBlastPayload = {
  provider: HandshakeProvider;
  providerLabel: string;
  /** Bloom origin as % of chamber bounds (defaults to console center). */
  origin?: IgnitionBlastOrigin;
};

const BLOOM_MS = 400;
const STATUS_HOLD_MS = 1400;
const BLAST_DURATION_MS = BLOOM_MS + STATUS_HOLD_MS;

const SHAKE_VARIANT = {
  x: [0, -10, 10, -7, 7, -4, 4, 0],
  y: [0, 5, -5, 3, -3, 2, 0],
};

type IgnitionBlastOverlayProps = {
  payload: IgnitionBlastPayload | null;
  onComplete?: () => void;
  className?: string;
};

/** Mint radial bloom (400ms) + POWER STABILIZED overlay after `igniteEngineVault` success. */
export function IgnitionBlastOverlay({
  payload,
  onComplete,
  className,
}: IgnitionBlastOverlayProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const mono = jetbrainsMono.className;
  const originX = payload?.origin?.x ?? 82;
  const originY = payload?.origin?.y ?? 50;

  useEffect(() => {
    if (!payload) return;

    if (reducedMotion) {
      onComplete?.();
      return;
    }

    const timer = window.setTimeout(() => {
      onComplete?.();
    }, BLAST_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [onComplete, payload, reducedMotion]);

  return (
    <AnimatePresence>
      {payload ? (
        <motion.div
          className={cn("pointer-events-none absolute inset-0 z-[80] overflow-hidden", className)}
          aria-live="polite"
          role="status"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            aria-hidden="true"
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full will-change-[width,height,opacity]"
            style={{
              left: `${originX}%`,
              top: `${originY}%`,
              background: `radial-gradient(circle, ${MINT} 0%, oklch(0.82 0.16 165 / 0.72) 28%, oklch(0.82 0.16 165 / 0.35) 52%, transparent 70%)`,
            }}
            initial={{ width: 16, height: 16, opacity: 0.95 }}
            animate={
              reducedMotion
                ? { opacity: 0 }
                : {
                    width: ["16px", "220vmax"],
                    height: ["16px", "220vmax"],
                    opacity: [0.95, 0.88, 0.55, 0],
                  }
            }
            transition={
              reducedMotion
                ? { duration: 0 }
                : { duration: BLOOM_MS / 1000, ease: [0.22, 1, 0.36, 1] }
            }
          />

          <motion.div
            aria-hidden="true"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={
              reducedMotion
                ? { opacity: 0 }
                : { opacity: [0, 0.55, 0.35, 0] }
            }
            transition={
              reducedMotion
                ? { duration: 0 }
                : { duration: BLOOM_MS / 1000, ease: "easeOut" }
            }
            style={{
              backgroundColor: "oklch(0.82 0.16 165 / 0.18)",
            }}
          />

          <motion.div
            className="absolute inset-0 flex items-center justify-center px-4 sm:px-8"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={
              reducedMotion
                ? { opacity: 1, scale: 1 }
                : {
                    opacity: [0, 0, 1, 1, 0],
                    scale: [0.96, 0.96, 1, 1, 1.02],
                  }
            }
            transition={
              reducedMotion
                ? { duration: 0.15 }
                : {
                    duration: BLAST_DURATION_MS / 1000,
                    times: [0, 0.22, 0.32, 0.82, 1],
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }
            }
          >
            <div className="max-w-5xl text-center">
              <p
                className={cn(
                  mono,
                  "text-[clamp(0.85rem,3.8vw,2.5rem)] font-bold uppercase leading-tight tracking-[0.04em] sm:tracking-[0.06em]",
                )}
                style={{
                  color: PAPER,
                  textShadow:
                    "0 0 40px oklch(0.82 0.16 165 / 0.55), 0 0 80px oklch(0.82 0.16 165 / 0.25)",
                }}
              >
                POWER STABILIZED: {payload.providerLabel} Key Engaged
              </p>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export const IGNITION_BLAST_DURATION_MS = BLAST_DURATION_MS;
export const IGNITION_BLAST_BLOOM_MS = BLOOM_MS;

type IgnitionChamberShakeProps = {
  active: boolean;
  className?: string;
  children: ReactNode;
};

/** Screen-shake wrapper — mount on the Ignition Chamber grid during blast bloom. */
export const IgnitionChamberShake = forwardRef<
  HTMLDivElement,
  IgnitionChamberShakeProps
>(function IgnitionChamberShake({ active, className, children }, ref) {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={false}
      animate={
        active && !reducedMotion
          ? SHAKE_VARIANT
          : { x: 0, y: 0 }
      }
      transition={{
        duration: BLOOM_MS / 1000,
        ease: [0.36, 0.07, 0.19, 0.97],
      }}
    >
      {children}
    </motion.div>
  );
});

type IgnitionPrimeCanvasProps = {
  engineActive: boolean;
  className?: string;
  children: ReactNode;
};

/** 60% left canvas — idle blur → high-contrast active after post-blast revalidation. */
export function IgnitionPrimeCanvas({
  engineActive,
  className,
  children,
}: IgnitionPrimeCanvasProps) {
  return (
    <div className={cn("relative min-h-0 flex-1", className)}>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-4 top-6 bottom-6 mx-auto max-w-md rounded-[2px] shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
        style={{ backgroundColor: PAPER }}
        initial={false}
        animate={{
          filter: engineActive
            ? "blur(0px) brightness(1.08) contrast(1.14)"
            : "blur(10px) brightness(0.62) contrast(0.78)",
          opacity: engineActive ? 1 : 0.32,
          scale: engineActive ? 1 : 0.97,
        }}
        transition={{ duration: 0.75, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="flex h-full flex-col px-[8%] py-[7%]">
          <div
            className="mx-auto h-2.5 w-[38%] rounded-full"
            style={{ backgroundColor: "oklch(0.25 0.02 268 / 0.12)" }}
          />
          <div
            className="mx-auto mt-3 h-1.5 w-[55%] rounded-full"
            style={{ backgroundColor: "oklch(0.25 0.02 268 / 0.08)" }}
          />
          <div className="mt-8 border-b border-[oklch(0.25_0.02_268/0.12)] pb-1" />
          <div className="mt-3 space-y-2">
            <div className="h-1.5 w-full rounded-full bg-[oklch(0.25_0.02_268/0.07)]" />
            <div className="h-1.5 w-[90%] rounded-full bg-[oklch(0.25_0.02_268/0.06)]" />
            <div className="h-1.5 w-[82%] rounded-full bg-[oklch(0.25_0.02_268/0.05)]" />
          </div>
          <div className="mt-7 border-b border-[oklch(0.25_0.02_268/0.12)] pb-1" />
          <div className="mt-3 space-y-2">
            <div className="h-1.5 w-[70%] rounded-full bg-[oklch(0.25_0.02_268/0.06)]" />
            <div className="h-1.5 w-[60%] rounded-full bg-[oklch(0.25_0.02_268/0.05)]" />
          </div>
        </div>
        <ScanningBeam active={engineActive} />
        {engineActive ? (
          <motion.div
            className="absolute inset-0 rounded-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.45, 0.22] }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            style={{
              boxShadow: "inset 0 0 80px oklch(0.82 0.16 165 / 0.22)",
            }}
          />
        ) : null}
      </motion.div>

      <div className="relative z-[1] h-full min-h-[18rem]">{children}</div>

      {!engineActive ? (
        <div
          aria-hidden="true"
          className={cn(
            jetbrainsMono.className,
            "pointer-events-none absolute left-0 top-0 z-[2] text-[10px] uppercase tracking-[0.16em]",
          )}
          style={{ color: "oklch(0.45 0.02 268)" }}
        >
          Prime Paper · Idle
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className={cn(
            jetbrainsMono.className,
            "pointer-events-none absolute left-0 top-0 z-[2] text-[10px] uppercase tracking-[0.16em]",
          )}
          style={{ color: MINT }}
        >
          Prime Paper · Active
        </motion.div>
      )}
    </div>
  );
}

type IgnitionPowerCellSlamProps = {
  slam: boolean;
  children: ReactNode;
  className?: string;
};

/** Power cell recoil when its slot ignites. */
export function IgnitionPowerCellSlam({ slam, children, className }: IgnitionPowerCellSlamProps) {
  return (
    <motion.div
      className={className}
      initial={false}
      animate={
        slam
          ? {
              x: [0, 12, -8, 4, 0],
              y: [0, -3, 2, 0],
              scale: [1, 0.92, 1.06, 0.98, 1],
              rotate: [0, -1.5, 1, 0],
            }
          : { x: 0, y: 0, scale: 1, rotate: 0 }
      }
      transition={{
        duration: 0.42,
        ease: [0.34, 1.45, 0.64, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

type IgnitionBlastProps = {
  payload: IgnitionBlastPayload | null;
  onComplete?: () => void;
  className?: string;
};

export function IgnitionBlast({ payload, onComplete, className }: IgnitionBlastProps) {
  return <IgnitionBlastOverlay payload={payload} onComplete={onComplete} className={className} />;
}

export { resolveBlastOriginFromCell };

export { NAVY as IGNITION_BLAST_NAVY };
