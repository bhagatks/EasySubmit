"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";
import { LogoIcon } from "@/components/ui/logo";
import { BrandWordmark } from "@/components/ui/brand-wordmark";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ONBOARDING_PHASES,
  type OnboardingPhaseId,
} from "@/lib/onboarding/phases";
import { useOnboardingStore } from "@/src/stores/onboarding-store";

const contentVariants = {
  enter: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? 32 : -32,
    filter: "blur(4px)",
  }),
  center: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? -24 : 24,
    filter: "blur(4px)",
  }),
};

const stepTransition = {
  duration: 0.4,
  ease: [0.25, 0.46, 0.45, 0.94] as const,
};

function PhaseStep({
  id,
  label,
  activePhase,
}: {
  id: OnboardingPhaseId;
  label: string;
  activePhase: OnboardingPhaseId;
}) {
  const isComplete = id < activePhase;
  const isActive = id === activePhase;

  return (
    <li className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <motion.div
          layout
          className={[
            "relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-xl border text-sm font-semibold transition-colors",
            isComplete
              ? "border-primary/40 bg-primary/20 text-primary"
              : isActive
                ? "border-primary bg-primary text-primary-foreground shadow-glow"
                : "border-white/10 bg-white/[0.04] text-muted-foreground",
          ].join(" ")}
        >
          {isComplete ? <Check className="h-4 w-4" aria-hidden="true" /> : id}
        </motion.div>
        {id < ONBOARDING_PHASES.length && (
          <div
            aria-hidden="true"
            className={[
              "my-1 w-px flex-1 min-h-[2rem]",
              isComplete ? "bg-primary/50" : "bg-white/10",
            ].join(" ")}
          />
        )}
      </div>
      <div className="pb-8 pt-1.5">
        <p
          className={[
            "font-display text-sm font-semibold tracking-tight",
            isActive ? "text-foreground" : isComplete ? "text-foreground/80" : "text-muted-foreground",
          ].join(" ")}
        >
          {label}
        </p>
        {isActive && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1 text-xs text-muted-foreground"
          >
            In progress
          </motion.p>
        )}
      </div>
    </li>
  );
}

function ProgressPanel({ activePhase }: { activePhase: OnboardingPhaseId }) {
  return (
    <aside className="flex flex-col">
      <div className="mb-6 flex items-center gap-3">
        <LogoIcon className="h-9 w-9 shrink-0" aria-hidden="true" />
        <div>
          <Link
            href="/"
            className="font-display text-base font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80"
          >
            <BrandWordmark
              nameClassName="text-foreground"
              suffixClassName="text-mint"
            />
          </Link>
          <p className="text-xs text-muted-foreground">Career Navigator</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-surface/60 p-6 backdrop-blur-xl">
        <p className="font-display text-lg font-semibold tracking-tight text-foreground">
          Your setup
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Four quick phases to personalize your job search.
        </p>

        <ol className="mt-6">
          {ONBOARDING_PHASES.map((phase) => (
            <PhaseStep
              key={phase.id}
              id={phase.id}
              label={phase.label}
              activePhase={activePhase}
            />
          ))}
        </ol>

        <div className="mt-6 border-t border-white/10 pt-4">
          <SignOutButton variant="ghost" mono />
        </div>
      </div>
    </aside>
  );
}

interface OnboardingStepTransitionProps {
  stepKey: number | string;
  direction?: number;
  children: React.ReactNode;
}

/** Fade + slide wrapper for wizard step content. Used inside the flow shell. */
export function OnboardingStepTransition({
  stepKey,
  direction = 1,
  children,
}: OnboardingStepTransitionProps) {
  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={stepKey}
        custom={direction}
        variants={contentVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={stepTransition}
        className="flex w-full flex-1 flex-col"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function OnboardingFlowShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isMapping = useOnboardingStore((s) => s.isMapping);
  const onboardingStep = session?.user?.onboardingStep ?? 0;
  const onMappingRoute = pathname?.includes("/step-4") ?? false;
  const isFullScreenWorkbench =
    pathname === "/onboarding" ||
    pathname?.includes("/onboarding/refinery") ||
    pathname?.includes("/onboarding/workbench") ||
    false;
  const activePhase: OnboardingPhaseId = onMappingRoute || isMapping || onboardingStep >= 4
    ? 4
    : (Math.min(Math.max(onboardingStep, 1), 3) as OnboardingPhaseId);

  if (isFullScreenWorkbench) {
    return (
      <div className="relative min-h-screen bg-background font-sans">
        {children}
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[oklch(0.16_0.04_268)] font-sans">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_100%_0%,oklch(0.62_0.21_265_/_0.08),transparent_55%)]"
      />
      <div aria-hidden="true" className="bg-grid absolute inset-0 opacity-[0.25]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-5 p-4 lg:grid lg:grid-cols-[minmax(280px,340px)_1fr] lg:gap-8 lg:p-8">
        {/* Progress — top on mobile, left on desktop */}
        <div className="order-1 lg:sticky lg:top-8 lg:self-start">
          <ProgressPanel activePhase={activePhase} />
        </div>

        {/* Step content — bottom on mobile, right on desktop */}
        <main className="order-2 flex min-h-[min(640px,calc(100vh-2rem))] flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-surface/60 shadow-elevated backdrop-blur-xl">
          {children}
        </main>
      </div>
    </div>
  );
}
