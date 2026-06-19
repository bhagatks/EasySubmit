"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { completeStep } from "@/app/actions/onboarding";
import { LogoIcon } from "@/components/ui/logo";
import { useOnboardingStore } from "@/stores/onboardingStore";

const SCAN_DURATION_MS = 3000;
const VERIFY_HOLD_MS = 700;
const electric = (alpha = 1) => `oklch(0.62 0.21 265 / ${alpha})`;

const BUCKETS = [
  { id: "experience", label: "Experience", left: "12%" },
  { id: "skills", label: "Skills", left: "42%" },
  { id: "contact", label: "Contact", left: "72%" },
] as const;

const DATA_SNIPPETS = Array.from({ length: 12 }, (_, index) => ({
  id: index,
  bucketIndex: index % BUCKETS.length,
  startX: 18 + ((index * 11) % 48),
  startY: 14 + ((index * 7) % 36),
  size: 3 + (index % 3),
  delay: (index * 0.24) % 2.4,
  duration: 0.85 + (index % 3) * 0.12,
}));

function HorizontalScanBeam() {
  const transition = {
    duration: SCAN_DURATION_MS / 1000,
    ease: "easeInOut" as const,
    repeat: Infinity,
  };

  return (
    <>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-4 z-20 w-16 -translate-x-1/2 rounded-full"
        style={{
          background: `linear-gradient(90deg, transparent, ${electric(0.22)}, transparent)`,
        }}
        initial={{ left: "0%" }}
        animate={{ left: "100%" }}
        transition={transition}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 z-30 w-px -translate-x-1/2"
        style={{
          background: `linear-gradient(180deg, transparent, ${electric()}, transparent)`,
          boxShadow: `0 0 10px 1px ${electric(0.9)}, 0 0 28px 4px ${electric(0.35)}`,
        }}
        initial={{ left: "0%" }}
        animate={{ left: "100%" }}
        transition={transition}
      />
    </>
  );
}

function DataSnippets({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <>
      {DATA_SNIPPETS.map((snippet) => {
        const bucket = BUCKETS[snippet.bucketIndex];
        return (
          <motion.div
            key={snippet.id}
            aria-hidden="true"
            className="pointer-events-none absolute z-40 rounded-sm"
            style={{
              width: snippet.size,
              height: snippet.size,
              left: `${snippet.startX}%`,
              top: `${snippet.startY}%`,
              background: electric(),
              boxShadow: `0 0 8px ${electric(0.65)}`,
            }}
            animate={{
              left: bucket.left,
              top: "86%",
              opacity: [0, 1, 1, 0.35],
              scale: [0.5, 1, 0.85, 0.25],
            }}
            transition={{
              duration: snippet.duration,
              delay: snippet.delay,
              repeat: Infinity,
              repeatDelay: 0.65,
              ease: "easeInOut",
            }}
          />
        );
      })}
    </>
  );
}

function BucketRow({ fillLevels }: { fillLevels: number[] }) {
  return (
    <div className="relative mt-2 flex justify-between gap-3 px-4 pb-4 pt-6">
      {BUCKETS.map((bucket, index) => {
        const fill = fillLevels[index] ?? 0;
        const isLit = fill > 0;

        return (
          <motion.div
            key={bucket.id}
            className="flex flex-1 flex-col items-center gap-1.5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + index * 0.08 }}
          >
            <motion.div
              className={[
                "relative h-14 w-full overflow-hidden rounded-lg border bg-white/[0.03] transition-colors duration-300",
                isLit
                  ? "border-[oklch(0.62_0.21_265_/_0.55)] shadow-[0_0_20px_-4px_oklch(0.62_0.21_265_/_0.5)]"
                  : "border-white/10",
              ].join(" ")}
              animate={
                isLit
                  ? {
                      boxShadow: [
                        "0 0 0px oklch(0.62 0.21 265 / 0)",
                        "0 0 24px -2px oklch(0.62 0.21 265 / 0.45)",
                        "0 0 16px -4px oklch(0.62 0.21 265 / 0.35)",
                      ],
                    }
                  : undefined
              }
              transition={{ duration: 0.5 }}
            >
              <motion.div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0"
                style={{ background: electric(0.35) }}
                animate={{ height: `${fill}%` }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              />
              <div className="absolute inset-0 border-t border-white/10" />
            </motion.div>
            <span
              className={[
                "font-dm text-[10px] font-medium uppercase tracking-wider transition-colors",
                isLit ? "text-[oklch(0.72_0.18_265)]" : "text-muted-foreground",
              ].join(" ")}
            >
              {bucket.label}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

function ScanningView({ fillLevels }: { fillLevels: number[] }) {
  return (
    <motion.div
      key="scanning"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col items-center gap-6"
    >
      <div className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-black/40">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `linear-gradient(${electric(0.1)} 1px, transparent 1px), linear-gradient(90deg, ${electric(0.1)} 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
          }}
        />

        <div className="relative mx-auto mt-8 h-40 w-[78%] max-w-sm overflow-hidden rounded-lg border border-white/10 bg-surface/50 p-5 shadow-inner">
          <div className="space-y-2.5 opacity-25">
            <div className="h-2.5 w-2/3 rounded bg-white/25" />
            <div className="h-2 w-full rounded bg-white/15" />
            <div className="h-2 w-5/6 rounded bg-white/15" />
            <div className="h-2 w-full rounded bg-white/15" />
            <div className="mt-4 h-2 w-1/2 rounded bg-white/15" />
            <div className="h-2 w-3/4 rounded bg-white/15" />
          </div>
          <DataSnippets active />
        </div>

        <div className="relative h-40 md:h-44">
          <HorizontalScanBeam />
        </div>

        <BucketRow fillLevels={fillLevels} />
      </div>

      <p className="font-dm text-sm font-medium text-[oklch(0.72_0.18_265)]">
        Mapping resume intelligence…
      </p>
    </motion.div>
  );
}

function VerifiedSeal() {
  return (
    <motion.div
      key="verified"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center py-6 text-center"
    >
      <div className="relative flex items-center justify-center">
        <motion.div
          aria-hidden="true"
          className="absolute h-44 w-44 rounded-full"
          style={{
            background: `radial-gradient(circle, ${electric(0.28)} 0%, transparent 70%)`,
          }}
          initial={{ opacity: 0, scale: 0.55 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        />
        <motion.div
          className="relative grid h-28 w-28 place-items-center rounded-full border-2 bg-surface/80 shadow-elevated backdrop-blur-sm"
          style={{ borderColor: electric(0.5) }}
          initial={{ opacity: 0, scale: 0.45, rotate: -12 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 18 }}
        >
          <LogoIcon className="h-16 w-16" aria-hidden="true" />
        </motion.div>
      </div>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.35 }}
        className="mt-6 font-display text-xl font-semibold tracking-tight text-foreground"
      >
        Verified
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.35 }}
        className="mt-2 font-dm text-sm text-muted-foreground"
      >
        Profile intelligence ready — entering your dashboard…
      </motion.p>
    </motion.div>
  );
}

export default function Step4Mapping() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const setIsMapping = useOnboardingStore((s) => s.setIsMapping);
  const [isVerified, setIsVerified] = useState(false);
  const [fillLevels, setFillLevels] = useState([0, 0, 0]);

  useEffect(() => {
    setIsMapping(true);
    return () => setIsMapping(false);
  }, [setIsMapping]);

  useEffect(() => {
    const fillTimers = DATA_SNIPPETS.map((snippet) =>
      window.setTimeout(() => {
        setFillLevels((previous) => {
          const next = [...previous];
          next[snippet.bucketIndex] = Math.min(
            100,
            next[snippet.bucketIndex] + 22,
          );
          return next;
        });
      }, snippet.delay * 1000 + snippet.duration * 500),
    );

    const verifyTimer = window.setTimeout(() => {
      setIsVerified(true);
    }, SCAN_DURATION_MS);

    return () => {
      fillTimers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(verifyTimer);
    };
  }, []);

  useEffect(() => {
    if (!isVerified) return;

    let cancelled = false;

    const finish = async () => {
      await new Promise((resolve) => window.setTimeout(resolve, VERIFY_HOLD_MS));
      if (cancelled) return;

      try {
        const result = await completeStep(4, {});
        await updateSession({ onboardingStep: result.onboardingStep });
        if (!cancelled) {
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("Step4Mapping completeStep failed:", error);
      }
    };

    void finish();

    return () => {
      cancelled = true;
    };
  }, [isVerified, router, updateSession]);

  return (
    <div className="flex w-full flex-col font-dm">
      <AnimatePresence mode="wait">
        {!isVerified ? (
          <motion.div
            key="heading-scanning"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              AI Resume Mapping
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Extracting experience, skills, and contact from your resume…
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mt-8">
        <AnimatePresence mode="wait">
          {isVerified ? (
            <VerifiedSeal />
          ) : (
            <ScanningView fillLevels={fillLevels} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
