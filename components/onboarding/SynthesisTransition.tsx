"use client";

import { JetBrains_Mono } from "next/font/google";
import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { DASHBOARD_SETUP_HREF } from "@/lib/dashboard/dashboard-extension-links";
import { memo, useEffect, useMemo, useRef } from "react";
import {
  PrimeResume,
  type PrimeResumeData,
} from "@/components/onboarding/PrimeResume";
import { GlossyFullscreenShell } from "@/components/ui/glossy-fullscreen-shell";
import { cn } from "@/lib/utils";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const MINT = "oklch(0.82 0.16 165)";
const PRIMARY = "oklch(0.62 0.21 265)";
const PAPER = "oklch(0.98 0.01 268)";
const MUTED = "oklch(0.45 0.02 268)";

const SYNTHESIS_MS = 5000;
const BEAM_DURATION_S = 2.2;
/** Minimum time the overlay stays visible — one full scanning-beam cycle. */
export const MIN_SYNTHESIS_MS = Math.ceil(BEAM_DURATION_S * 1000);
const PAPER_CENTER = { x: 50, y: 44 };

type ParticleSpec = {
  id: string;
  label: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  delay: number;
  duration: number;
};

const PARTICLE_LABELS = [
  '{"role":"target"}',
  '{"skills":[]}',
  '{"summary":""}',
  '{"exp":1}',
  '{"edu":[]}',
  '{"contact":{}}',
  '{"lang":"en"}',
  '{"certs":[]}',
  '{"proj":[]}',
  '{"meta":"ats"}',
  '{"parse":ok}',
  '{"sync":true}',
  '{"vector":[]}',
  '{"map":true}',
  '{"calibrate":1}',
  '{"arch":{}}',
] as const;

const EDGE_ANCHORS = [
  { x: 8, y: -4 },
  { x: 92, y: -4 },
  { x: -4, y: 18 },
  { x: 104, y: 22 },
  { x: -4, y: 72 },
  { x: 104, y: 78 },
  { x: 12, y: 104 },
  { x: 88, y: 104 },
  { x: 50, y: -6 },
  { x: 50, y: 106 },
  { x: -6, y: 48 },
  { x: 106, y: 52 },
  { x: 24, y: -5 },
  { x: 76, y: 105 },
  { x: -5, y: 36 },
  { x: 105, y: 64 },
] as const;

function buildParticles(): ParticleSpec[] {
  return EDGE_ANCHORS.map((anchor, index) => ({
    id: `particle-${index}`,
    label: PARTICLE_LABELS[index % PARTICLE_LABELS.length],
    startX: anchor.x,
    startY: anchor.y,
    endX: PAPER_CENTER.x + ((index * 7) % 9) - 4,
    endY: PAPER_CENTER.y + ((index * 5) % 7) - 3,
    delay: index * 0.06,
    duration: 1.1 + (index % 3) * 0.2,
  }));
}

const BlueprintSkeleton = memo(function BlueprintSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[1] rounded-[2px]"
      style={{
        backgroundImage: `
          linear-gradient(to right, oklch(0.82 0.16 165 / 0.12) 1px, transparent 1px),
          linear-gradient(to bottom, oklch(0.82 0.16 165 / 0.12) 1px, transparent 1px)
        `,
        backgroundSize: "24px 24px",
      }}
    >
      <div className="flex h-full flex-col px-[6%] py-[5.5%]">
        <div className="mx-auto h-3 w-[42%] rounded-full bg-[oklch(0.82_0.16_165/0.22)]" />
        <div className="mx-auto mt-3 h-2 w-[58%] rounded-full bg-[oklch(0.82_0.16_165/0.14)]" />
        <div className="mx-auto mt-2 h-1.5 w-[72%] rounded-full bg-[oklch(0.82_0.16_165/0.1)]" />

        <div className="mt-8 border-b border-[oklch(0.82_0.16_165/0.2)] pb-1.5">
          <div className="h-2 w-[38%] rounded-full bg-[oklch(0.82_0.16_165/0.18)]" />
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-1.5 w-full rounded-full bg-[oklch(0.82_0.16_165/0.1)]" />
          <div className="h-1.5 w-[92%] rounded-full bg-[oklch(0.82_0.16_165/0.08)]" />
          <div className="h-1.5 w-[85%] rounded-full bg-[oklch(0.82_0.16_165/0.08)]" />
        </div>

        <div className="mt-7 border-b border-[oklch(0.82_0.16_165/0.2)] pb-1.5">
          <div className="h-2 w-[44%] rounded-full bg-[oklch(0.82_0.16_165/0.18)]" />
        </div>
        <div className="mt-4 space-y-4">
          <div>
            <div className="flex justify-between gap-3">
              <div className="h-2 w-[36%] rounded-full bg-[oklch(0.82_0.16_165/0.14)]" />
              <div className="h-2 w-[18%] rounded-full bg-[oklch(0.82_0.16_165/0.1)]" />
            </div>
            <div className="mt-2 h-1.5 w-[48%] rounded-full bg-[oklch(0.82_0.16_165/0.08)]" />
            <div className="mt-3 space-y-1.5 pl-3">
              <div className="h-1.5 w-[88%] rounded-full bg-[oklch(0.82_0.16_165/0.07)]" />
              <div className="h-1.5 w-[82%] rounded-full bg-[oklch(0.82_0.16_165/0.07)]" />
            </div>
          </div>
          <div>
            <div className="flex justify-between gap-3">
              <div className="h-2 w-[32%] rounded-full bg-[oklch(0.82_0.16_165/0.12)]" />
              <div className="h-2 w-[16%] rounded-full bg-[oklch(0.82_0.16_165/0.08)]" />
            </div>
            <div className="mt-2 h-1.5 w-[40%] rounded-full bg-[oklch(0.82_0.16_165/0.07)]" />
          </div>
        </div>

        <div className="mt-7 border-b border-[oklch(0.82_0.16_165/0.2)] pb-1.5">
          <div className="h-2 w-[30%] rounded-full bg-[oklch(0.82_0.16_165/0.16)]" />
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-1.5 w-[70%] rounded-full bg-[oklch(0.82_0.16_165/0.08)]" />
          <div className="h-1.5 w-[55%] rounded-full bg-[oklch(0.82_0.16_165/0.07)]" />
        </div>
      </div>

      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "repeating-linear-gradient(0deg, oklch(0.82 0.16 165 / 0.05) 0px, transparent 2px, transparent 8px)",
        }}
      />
    </div>
  );
});

const ViewportScanningBeam = memo(function ViewportScanningBeam({
  reducedMotion,
}: {
  reducedMotion: boolean;
}) {
  const transition = reducedMotion
    ? { duration: 0 }
    : {
        duration: BEAM_DURATION_S,
        ease: "linear" as const,
        repeat: Infinity,
      };

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[2] overflow-hidden"
    >
      <motion.div
        className="absolute inset-x-0 h-28 -translate-y-1/2 will-change-transform"
        style={{
          background: `linear-gradient(180deg, transparent, oklch(0.82 0.16 165 / 0.06), oklch(0.82 0.16 165 / 0.22), oklch(0.82 0.16 165 / 0.06), transparent)`,
        }}
        initial={{ top: "-14%" }}
        animate={{ top: reducedMotion ? "50%" : "114%" }}
        transition={transition}
      />
      <motion.div
        className="absolute inset-x-0 h-px -translate-y-1/2 will-change-transform"
        style={{
          backgroundColor: MINT,
          boxShadow:
            "0 0 24px oklch(0.82 0.16 165 / 0.65), 0 0 48px oklch(0.82 0.16 165 / 0.25)",
        }}
        initial={{ top: "-14%" }}
        animate={{ top: reducedMotion ? "50%" : "114%" }}
        transition={transition}
      />
    </div>
  );
});

const JsonParticleFlow = memo(function JsonParticleFlow({
  particles,
  reducedMotion,
}: {
  particles: ParticleSpec[];
  reducedMotion: boolean;
}) {
  if (reducedMotion) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[5] overflow-hidden"
    >
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className={cn(
            jetbrainsMono.className,
            "absolute whitespace-nowrap text-[9px] font-medium tracking-[0.06em] will-change-transform",
          )}
          style={{
            left: `${particle.startX}%`,
            top: `${particle.startY}%`,
            color: PRIMARY,
            textShadow: "0 0 12px oklch(0.62 0.21 265 / 0.45)",
          }}
          initial={{ opacity: 0, x: "-50%", y: "-50%", scale: 0.88 }}
          animate={{
            opacity: [0, 0.92, 0.55, 0],
            scale: [0.88, 1, 0.94, 0.82],
            left: [`${particle.startX}%`, `${particle.endX}%`],
            top: [`${particle.startY}%`, `${particle.endY}%`],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            repeatDelay: 0.35,
            ease: [0.22, 0.61, 0.36, 1],
          }}
        >
          {particle.label}
        </motion.span>
      ))}
    </div>
  );
});

export type SynthesisTransitionProps = {
  resume?: PrimeResumeData;
  /** When false, the overlay is not rendered. Default true. */
  active?: boolean;
  /** Redirect path after synthesis completes. Set to null to skip internal navigation. */
  redirectTo?: string | null;
  durationMs?: number;
  /** Called after the synthesis timer — use to trigger dashboard redirect. */
  onComplete?: () => void | Promise<void>;
  className?: string;
};

/**
 * Full-screen Career Synthesis finale — viewport scanning beam, edge-to-center
 * JSON particle flow, Prime Paper skeleton, then dashboard handoff.
 */
export function SynthesisTransition({
  resume = {},
  active = true,
  redirectTo = DASHBOARD_SETUP_HREF,
  durationMs = SYNTHESIS_MS,
  onComplete,
  className,
}: SynthesisTransitionProps) {
  const router = useRouter();
  const reducedMotion = useReducedMotion() ?? false;
  const completedRef = useRef(false);
  const particles = useMemo(() => buildParticles(), []);

  useEffect(() => {
    if (!active) {
      completedRef.current = false;
      return;
    }

    const holdMs = Math.max(durationMs, MIN_SYNTHESIS_MS);

    const timer = window.setTimeout(() => {
      void (async () => {
        if (completedRef.current) return;
        completedRef.current = true;
        try {
          await onComplete?.();
          if (redirectTo) {
            router.push(redirectTo);
          }
        } catch {
          completedRef.current = false;
        }
      })();
    }, holdMs);

    return () => window.clearTimeout(timer);
  }, [active, durationMs, onComplete, redirectTo, router]);

  if (!active) return null;

  return (
    <GlossyFullscreenShell
      role="status"
      aria-live="polite"
      aria-busy
      aria-label="Synthesizing career architecture"
      zIndex={50}
      className={cn(jetbrainsMono.className, className)}
      contentClassName="relative items-center justify-center overflow-hidden px-6 py-10 sm:px-10"
    >
      <ViewportScanningBeam reducedMotion={reducedMotion} />

      <JsonParticleFlow particles={particles} reducedMotion={reducedMotion} />

      <div className="relative z-[3] flex w-full max-w-4xl flex-col items-center justify-center">
        <div className="relative w-full max-w-[min(100%,32rem)] min-h-[min(32rem,58vh)]">
          <article
            aria-hidden="true"
            className="absolute inset-0 z-0 min-h-[min(32rem,58vh)] rounded-[2px] shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
            style={{ backgroundColor: PAPER }}
          />

          <BlueprintSkeleton />

          <motion.div
            className="relative z-[2] min-h-[min(32rem,58vh)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: reducedMotion ? 1 : [0, 0.12, 0.38, 0.78] }}
            transition={{
              duration: reducedMotion ? 0.2 : 2.4,
              ease: "easeOut",
            }}
          >
            <PrimeResume resume={resume} className="min-h-[min(32rem,58vh)]" />
          </motion.div>
        </div>

        <motion.div
          className="mt-10 flex max-w-lg flex-col items-center gap-3 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <p
            className="text-sm font-semibold uppercase tracking-[0.2em] sm:text-base"
            style={{ color: MINT }}
          >
            SYNTHESIZING CAREER ARCHITECTURE...
          </p>

          <motion.div
            className="flex items-center gap-1.5"
            aria-hidden="true"
            animate={reducedMotion ? undefined : { opacity: [0.4, 1, 0.4] }}
            transition={{
              duration: 1.35,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {[0, 1, 2].map((dot) => (
              <span
                key={dot}
                className="h-1 w-1 rounded-full"
                style={{ backgroundColor: MINT }}
              />
            ))}
          </motion.div>

          <p
            className="text-[11px] font-normal tracking-[0.08em] sm:text-xs"
            style={{ color: MUTED }}
          >
            Neural mapping complete. Opening dashboard…
          </p>
        </motion.div>
      </div>
    </GlossyFullscreenShell>
  );
}

export default SynthesisTransition;
