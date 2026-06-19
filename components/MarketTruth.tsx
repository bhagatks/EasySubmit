"use client";

import { JetBrains_Mono } from "next/font/google";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { BrandWordmark } from "@/components/ui/brand-wordmark";
import { cn } from "@/lib/utils";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-market-truth",
  display: "swap",
});

const MONO = "var(--font-market-truth), ui-monospace, monospace";
const BRAND_BG = "oklch(0.16 0.04 268)";
const PRIMARY = "oklch(0.62 0.21 265)";
const FOREGROUND = "oklch(0.97 0.01 250)";
const STAT_RED = "oklch(0.62 0.26 25)";
const ACCENT = "oklch(0.82 0.16 165)";

const JSON_STREAM_LINES = [
  `{"ats_vendor":"workday","bot_rank":847,"human_review":false}`,
  `{"parse_error":"section_boundary","field":"experience[2].title"}`,
  `{"keyword_gap":["stakeholder","cross-functional","P&L"]}`,
  `{"fortune500_filter":true,"auto_reject":true,"score":0.12}`,
  `{"resume_id":"cuid_8f2a","visibility":"buried","queue_depth":12403}`,
  `{"senior_leader_survival_rate":0.03,"source":"market_intel"}`,
  `{"ocr_confidence":0.41,"layout":"multi_column","ats_safe":false}`,
  `{"skill_vector":[0.02,0.91,0.14],"match_threshold":0.72}`,
  `{"application_status":"REJECTED","reason":"keyword_miss"}`,
  `{"parser":"taleo","date_format":"MM/YYYY","normalized":null}`,
  `{"invisible_candidates":0.97,"interview_rate":0.03}`,
  `{"ranking_bot":"greenhouse","latency_ms":42,"decision":"no"}`,
] as const;

const PHASE_DURATION_MS = 2000;
const TOTAL_DURATION_MS = 7000;

const SLAM_TRANSITION = {
  type: "spring" as const,
  stiffness: 680,
  damping: 28,
  mass: 0.75,
};

const SHAKE_TRANSITION = {
  duration: 0.22,
  ease: [0.36, 0.07, 0.19, 0.97] as const,
};

type PhaseId = 1 | 2 | 3 | 4;

type MarketTruthProps = {
  className?: string;
  /** Fires once after the 7s sequence completes (not called when `loop` is true). */
  onComplete?: () => void;
  /** When false, holds on phase 1 until set true. */
  play?: boolean;
  /** Restart the 7s sequence when it ends. */
  loop?: boolean;
  /** Product line shown after the brand in phase 4. */
  tagline?: string;
};

function JsonDataStream() {
  const columns = [
    { offset: 0, duration: 28, reverse: false },
    { offset: 6, duration: 34, reverse: true },
    { offset: 12, duration: 31, reverse: false },
  ] as const;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden opacity-[0.05]"
      aria-hidden
    >
      <div className="flex h-full gap-8 px-4 sm:gap-12 sm:px-8">
        {columns.map((column, columnIndex) => {
          const lines = [...JSON_STREAM_LINES, ...JSON_STREAM_LINES];
          return (
            <motion.div
              key={columnIndex}
              className="min-w-0 flex-1 whitespace-pre-wrap break-all text-[9px] leading-[1.65] sm:text-[10px]"
              style={{ color: ACCENT, fontFamily: MONO }}
              initial={{ y: column.reverse ? "-50%" : "0%" }}
              animate={{ y: column.reverse ? "0%" : "-50%" }}
              transition={{
                duration: column.duration,
                repeat: Infinity,
                ease: "linear",
                delay: column.offset * 0.15,
              }}
            >
              {lines.map((line, lineIndex) => (
                <p key={`${columnIndex}-${lineIndex}`} className="mb-4">
                  {line}
                </p>
              ))}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function CrtScanlineOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[30]"
      aria-hidden
      style={{
        background: [
          "repeating-linear-gradient(0deg, oklch(0 0 0 / 0.18) 0px, oklch(0 0 0 / 0.18) 1px, transparent 1px, transparent 3px)",
          "radial-gradient(ellipse 85% 75% at 50% 50%, transparent 45%, oklch(0 0 0 / 0.35) 100%)",
        ].join(", "),
        mixBlendMode: "multiply",
      }}
    />
  );
}

function CameraShake({
  phase,
  children,
}: {
  phase: PhaseId;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      key={`shake-${phase}`}
      className="flex h-full w-full flex-col items-center justify-center px-6 text-center sm:px-10 xl:px-16"
      initial={{ x: 0, y: 0 }}
      animate={{
        x: [0, -7, 9, -5, 4, 0],
        y: [0, 5, -6, 3, -2, 0],
      }}
      transition={SHAKE_TRANSITION}
    >
      {children}
    </motion.div>
  );
}

function GlitchStat({ children }: { children: string }) {
  return (
    <span className="relative inline-block leading-none">
      <span className="relative z-10">{children}</span>
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20"
        style={{ color: "oklch(0.72 0.18 200)" }}
        animate={{
          x: [-3, 4, -2, 3, 0],
          opacity: [0.85, 0.35, 0.9, 0.4, 0.75],
        }}
        transition={{ duration: 0.18, repeat: Infinity, repeatType: "mirror" }}
      >
        {children}
      </motion.span>
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{ color: STAT_RED }}
        animate={{
          x: [3, -4, 2, -3, 0],
          opacity: [0.7, 0.3, 0.85, 0.35, 0.65],
        }}
        transition={{
          duration: 0.14,
          repeat: Infinity,
          repeatType: "mirror",
          delay: 0.04,
        }}
      >
        {children}
      </motion.span>
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[5] mix-blend-screen"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, oklch(1 0 0 / 0.04) 2px, oklch(1 0 0 / 0.04) 4px)",
        }}
        animate={{ opacity: [0.2, 0.55, 0.25, 0.5] }}
        transition={{ duration: 0.12, repeat: Infinity }}
      />
    </span>
  );
}

function PhaseStat({
  value,
  subtext,
  valueColor,
  glitch = false,
}: {
  value: string;
  subtext: string;
  valueColor: string;
  glitch?: boolean;
}) {
  return (
    <>
      <motion.p
        className="text-[clamp(4.5rem,22vw,11rem)] font-bold leading-[0.88] tracking-tighter"
        style={{ color: valueColor, fontFamily: MONO }}
        initial={{ opacity: 0, scale: 1.14, y: -28, filter: "blur(6px)" }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 0.92, y: 12, filter: "blur(4px)" }}
        transition={SLAM_TRANSITION}
      >
        {glitch ? <GlitchStat>{value}</GlitchStat> : value}
      </motion.p>
      <motion.p
        className="mt-5 max-w-2xl text-[clamp(0.65rem,1.8vw,0.8rem)] font-semibold uppercase leading-snug tracking-[0.16em] text-[oklch(0.78_0.02_250)] sm:mt-6"
        style={{ fontFamily: MONO }}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ ...SLAM_TRANSITION, delay: 0.05 }}
      >
        {subtext}
      </motion.p>
    </>
  );
}

function PhaseCopy({ headline }: { headline: string }) {
  return (
    <motion.p
      className="max-w-3xl text-[clamp(1.35rem,4.2vw,2.75rem)] font-bold uppercase leading-[1.08] tracking-[0.06em] text-[oklch(0.94_0.02_250)]"
      style={{ fontFamily: MONO }}
      initial={{ opacity: 0, scale: 1.1, y: -24, filter: "blur(5px)" }}
      animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.94, y: 16, filter: "blur(3px)" }}
      transition={SLAM_TRANSITION}
    >
      {headline}
    </motion.p>
  );
}

function PhaseReveal({
  statement,
  tagline,
}: {
  statement: string;
  tagline: string;
}) {
  return (
    <motion.div
      className="flex max-w-3xl flex-col items-center gap-5 sm:gap-6"
      initial={{ opacity: 0, scale: 1.08 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.14, ease: "easeOut" }}
    >
      <motion.p
        className="text-[clamp(1.5rem,4.8vw,3.25rem)] font-bold uppercase leading-[1.05] tracking-[0.05em]"
        style={{ color: FOREGROUND, fontFamily: MONO }}
        initial={{ opacity: 0, y: 32, scale: 1.12 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={SLAM_TRANSITION}
      >
        {statement}
      </motion.p>
      <motion.p
        className="max-w-xl text-[clamp(0.7rem,1.6vw,0.85rem)] font-medium uppercase leading-relaxed tracking-[0.12em] text-[oklch(0.98_0.01_250_/_0.72)]"
        style={{ fontFamily: MONO }}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SLAM_TRANSITION, delay: 0.35 }}
      >
        <BrandWordmark className="normal-case tracking-tight" />
        {" "}
        {tagline}
      </motion.p>
    </motion.div>
  );
}

/** 7-second cinematic market-truth sequence — Fortune 500 stats → visibility statement. */
export function MarketTruth({
  className,
  onComplete,
  play = true,
  loop = false,
  tagline = "parses, ranks, and ships ATS-safe resumes — so bots see you.",
}: MarketTruthProps) {
  const [phase, setPhase] = useState<PhaseId>(1);
  const [cycleKey, setCycleKey] = useState(0);

  useEffect(() => {
    if (!play) return;

    setPhase(1);

    const timers = [
      window.setTimeout(() => setPhase(2), PHASE_DURATION_MS),
      window.setTimeout(() => setPhase(3), PHASE_DURATION_MS * 2),
      window.setTimeout(() => setPhase(4), PHASE_DURATION_MS * 3),
      window.setTimeout(() => {
        if (loop) {
          setCycleKey((key) => key + 1);
        } else {
          onComplete?.();
        }
      }, TOTAL_DURATION_MS),
    ];

    return () => timers.forEach(clearTimeout);
  }, [cycleKey, loop, onComplete, play]);

  return (
    <div
      className={cn(
        "relative h-full min-h-[280px] w-full overflow-hidden",
        jetbrainsMono.variable,
        className,
      )}
      aria-live="polite"
      aria-label="Market statistics presentation"
    >
      <motion.div
        className="absolute inset-0 z-0"
        animate={{
          backgroundColor: phase === 4 ? PRIMARY : BRAND_BG,
        }}
        transition={{
          duration: phase === 4 ? 0.14 : 0,
          ease: "easeOut",
        }}
      />

      <JsonDataStream />

      <motion.div
        className="pointer-events-none absolute inset-0 z-[2]"
        aria-hidden
        animate={{ opacity: phase === 4 ? 0 : 1 }}
        transition={{ duration: 0.14, ease: "easeOut" }}
        style={{
          background:
            "radial-gradient(ellipse 75% 55% at 40% 45%, oklch(0.62 0.21 265 / 0.14), transparent 65%)",
        }}
      />

      <div className="relative z-10 h-full w-full">
        <AnimatePresence mode="wait">
          {phase === 1 && (
            <motion.div
              key="phase-1"
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.06 }}
            >
              <CameraShake phase={1}>
                <PhaseStat
                  value="97.8%"
                  subtext="OF FORTUNE 500 COMPANIES USE AUTOMATED RANKING BOTS."
                  valueColor={STAT_RED}
                  glitch
                />
              </CameraShake>
            </motion.div>
          )}

          {phase === 2 && (
            <motion.div
              key="phase-2"
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.06 }}
            >
              <CameraShake phase={2}>
                <PhaseStat
                  value="3%"
                  subtext="ONLY 3% OF SENIOR LEADER RESUMES SURVIVE TO A HUMAN INTERVIEW."
                  valueColor={FOREGROUND}
                />
              </CameraShake>
            </motion.div>
          )}

          {phase === 3 && (
            <motion.div
              key="phase-3"
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.06 }}
            >
              <CameraShake phase={3}>
                <PhaseCopy headline="THE OTHER 97%? BURIED BY PARSING ERRORS AND KEYWORD GAPS." />
              </CameraShake>
            </motion.div>
          )}

          {phase === 4 && (
            <motion.div
              key="phase-4"
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.08 }}
            >
              <CameraShake phase={4}>
                <PhaseReveal
                  statement="YOU AREN'T BEING REJECTED. YOU'RE INVISIBLE."
                  tagline={tagline}
                />
              </CameraShake>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <CrtScanlineOverlay />
    </div>
  );
}
