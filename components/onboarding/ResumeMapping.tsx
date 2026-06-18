"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LogoIcon } from "@/components/ui/logo";
import { useOnboardingStore } from "@/stores/onboardingStore";

const SCAN_DURATION_MS = 4000;
const MESSAGE_INTERVAL_MS = 1200;

const STATUS_MESSAGES = [
  "Extracting Skills...",
  "Structuring Experience...",
  "Validating Contact Info...",
] as const;

const BUCKETS = [
  { id: "skills", label: "Skills", left: "12%" },
  { id: "experience", label: "Experience", left: "42%" },
  { id: "contact", label: "Contact", left: "72%" },
] as const;

const DATA_BITS = Array.from({ length: 15 }, (_, i) => ({
  id: i,
  bucketIndex: i % BUCKETS.length,
  startX: 20 + ((i * 17) % 55),
  startY: 12 + ((i * 11) % 28),
  size: 4 + (i % 3),
  delay: (i * 0.35) % 3.5,
  duration: 1.2 + (i % 4) * 0.15,
}));

function VerticalLaserScanner() {
  return (
    <>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 z-20 h-12 -translate-y-1/2 rounded-full bg-mint/20"
        initial={{ top: "0%" }}
        animate={{ top: "100%" }}
        transition={{
          duration: SCAN_DURATION_MS / 1000,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 z-30 h-px bg-gradient-to-r from-transparent via-mint to-transparent shadow-[0_0_10px_1px_oklch(0.82_0.16_165_/_0.9),0_0_28px_4px_oklch(0.82_0.16_165_/_0.35)]"
        initial={{ top: "0%" }}
        animate={{ top: "100%" }}
        transition={{
          duration: SCAN_DURATION_MS / 1000,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />
    </>
  );
}

function DataBitsToBuckets() {
  return (
    <>
      {DATA_BITS.map((bit) => {
        const bucket = BUCKETS[bit.bucketIndex];
        return (
          <motion.div
            key={bit.id}
            aria-hidden="true"
            className="pointer-events-none absolute z-40 rounded-sm bg-mint shadow-[0_0_8px_oklch(0.82_0.16_165_/_0.6)]"
            style={{
              width: bit.size,
              height: bit.size,
              left: `${bit.startX}%`,
              top: `${bit.startY}%`,
            }}
            animate={{
              left: bucket.left,
              top: "88%",
              opacity: [0, 1, 1, 0.4],
              scale: [0.6, 1, 0.8, 0.3],
            }}
            transition={{
              duration: bit.duration,
              delay: bit.delay,
              repeat: Infinity,
              repeatDelay: 0.8,
              ease: "easeInOut",
            }}
          />
        );
      })}
    </>
  );
}

function BucketRow() {
  return (
    <div className="relative mt-2 flex justify-between gap-3 px-4 pb-4 pt-6">
      {BUCKETS.map((bucket) => (
        <motion.div
          key={bucket.id}
          className="flex flex-1 flex-col items-center gap-1.5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="relative h-14 w-full overflow-hidden rounded-lg border border-mint/25 bg-mint/5">
            <motion.div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 bg-mint/30"
              initial={{ height: "0%" }}
              animate={{ height: ["0%", "35%", "55%", "70%"] }}
              transition={{
                duration: SCAN_DURATION_MS / 1000,
                ease: "easeOut",
                repeat: Infinity,
              }}
            />
            <div className="absolute inset-0 border-t border-mint/20" />
          </div>
          <span className="font-dm text-[10px] font-medium uppercase tracking-wider text-mint/80">
            {bucket.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function ScanningView({ messageIndex }: { messageIndex: number }) {
  return (
    <motion.div
      key="scanning"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col items-center gap-8"
    >
      <div className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-black/40">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(oklch(0.62 0.21 265 / 0.1) 1px, transparent 1px), linear-gradient(90deg, oklch(0.62 0.21 265 / 0.1) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        <div className="relative mx-auto mt-8 h-40 w-[78%] max-w-sm rounded-lg border border-white/10 bg-surface/50 p-5 shadow-inner">
          <div className="space-y-2.5 opacity-25">
            <div className="h-2.5 w-2/3 rounded bg-white/25" />
            <div className="h-2 w-full rounded bg-white/15" />
            <div className="h-2 w-5/6 rounded bg-white/15" />
            <div className="h-2 w-full rounded bg-white/15" />
            <div className="mt-4 h-2 w-1/2 rounded bg-white/15" />
            <div className="h-2 w-3/4 rounded bg-white/15" />
          </div>
          <DataBitsToBuckets />
        </div>

        <div className="relative h-44 md:h-48">
          <VerticalLaserScanner />
        </div>

        <BucketRow />
      </div>

      <div className="flex h-8 items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={STATUS_MESSAGES[messageIndex]}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="font-dm text-sm font-medium text-mint"
          >
            {STATUS_MESSAGES[messageIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function SuccessView() {
  return (
    <motion.div
      key="success"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center py-4 text-center"
    >
      <div className="relative flex items-center justify-center">
        <motion.div
          aria-hidden="true"
          className="absolute h-40 w-40 rounded-full bg-[radial-gradient(circle,oklch(0.82_0.16_165_/_0.35)_0%,transparent_70%)]"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.05,
          }}
        >
          <LogoIcon className="relative h-20 w-20" aria-hidden="true" />
        </motion.div>
      </div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="mt-6 font-display text-2xl font-semibold tracking-tight text-foreground md:text-3xl"
      >
        Success
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.35 }}
        className="mt-2 max-w-sm font-dm text-sm text-muted-foreground"
      >
        Your resume has been analyzed and structured — ready for tailored applications.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="mt-8"
      >
        <Button variant="hero" size="xl" asChild>
          <Link href="/dashboard">Enter Dashboard</Link>
        </Button>
      </motion.div>
    </motion.div>
  );
}

export default function ResumeMapping() {
  const setIsMapping = useOnboardingStore((s) => s.setIsMapping);
  const [isComplete, setIsComplete] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    setIsMapping(true);
    return () => setIsMapping(false);
  }, [setIsMapping]);

  useEffect(() => {
    const messageTimer = window.setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, MESSAGE_INTERVAL_MS);

    const completeTimer = window.setTimeout(
      () => setIsComplete(true),
      SCAN_DURATION_MS,
    );

    return () => {
      clearInterval(messageTimer);
      clearTimeout(completeTimer);
    };
  }, []);

  return (
    <div className="flex w-full flex-col font-dm">
      <AnimatePresence mode="wait">
        {!isComplete ? (
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
              Building your professional intelligence profile…
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mt-8">
        <AnimatePresence mode="wait">
          {isComplete ? <SuccessView /> : <ScanningView messageIndex={messageIndex} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
