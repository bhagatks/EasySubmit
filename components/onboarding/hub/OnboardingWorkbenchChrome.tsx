"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { LogoIcon } from "@/components/ui/logo";
import {
  SystemStatusBreadcrumb,
  type SystemStatusBreadcrumbProps,
} from "@/components/onboarding/hub/SystemStatusBreadcrumb";
import {
  getWorkbenchPhase,
  workbenchPhaseHeader,
  WORKBENCH_PHASE_COUNT,
} from "@/lib/onboarding/workbenchPhases";
import { cn } from "@/lib/utils";

const PRIMARY = "oklch(0.62 0.21 265)";

type OnboardingWorkbenchHeaderProps = {
  phase: number;
  monoClass: string;
  actions?: ReactNode;
  className?: string;
};

export function OnboardingWorkbenchHeader({
  phase,
  monoClass,
  actions,
  className,
}: OnboardingWorkbenchHeaderProps) {
  const phaseDef = getWorkbenchPhase(phase);
  const title = workbenchPhaseHeader(phase);
  const description = phaseDef?.description?.trim() ?? "";

  return (
    <header
      className={cn(
        "flex shrink-0 items-center gap-3 border-b border-white/10 px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3",
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-2">
        <LogoIcon className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" aria-hidden="true" />
        <span className="hidden font-display text-base font-semibold tracking-tight sm:inline">
          <span className="text-white">EasySubmit</span>
          <span className="text-mint">.ai</span>
        </span>
      </div>

      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <p
          className={cn(
            monoClass,
            "shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] sm:text-[11px]",
          )}
          style={{ color: PRIMARY }}
        >
          {title}
        </p>
        {description ? (
          <p
            className="hidden min-w-0 truncate text-xs text-[oklch(0.65_0.02_268)] md:block lg:max-w-[28rem]"
            title={description}
          >
            {description}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1 sm:gap-1.5">
        {actions}
        <SignOutButton variant="pill" label="Sign Out" />
      </div>
    </header>
  );
}

function PhaseProgressBar({ phase }: { phase: number }) {
  const progress = (phase / WORKBENCH_PHASE_COUNT) * 100;

  return (
    <div
      className="h-1 w-full shrink-0 overflow-hidden bg-white/10"
      role="progressbar"
      aria-valuenow={phase}
      aria-valuemin={1}
      aria-valuemax={WORKBENCH_PHASE_COUNT}
      aria-label={`Onboarding progress: phase ${phase} of ${WORKBENCH_PHASE_COUNT}`}
    >
      <motion.div
        className="h-full"
        style={{ backgroundColor: PRIMARY }}
        initial={false}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      />
    </div>
  );
}

type OnboardingWorkbenchChromeProps = {
  phase: number;
  monoClass: string;
  headerActions?: ReactNode;
} & Pick<
  SystemStatusBreadcrumbProps,
  "isSynthesizing" | "minNavigablePhase" | "isPhaseComplete" | "onNavigate"
>;

/** Unified onboarding chrome: brand header → progress → phase tabs. */
export function OnboardingWorkbenchChrome({
  phase,
  monoClass,
  headerActions,
  isSynthesizing,
  minNavigablePhase,
  isPhaseComplete,
  onNavigate,
}: OnboardingWorkbenchChromeProps) {
  return (
    <div className="shrink-0 border-b border-white/10">
      <OnboardingWorkbenchHeader
        phase={phase}
        monoClass={monoClass}
        actions={headerActions}
      />
      <PhaseProgressBar phase={phase} />
      <SystemStatusBreadcrumb
        currentStep={phase}
        isSynthesizing={isSynthesizing}
        minNavigablePhase={minNavigablePhase}
        isPhaseComplete={isPhaseComplete}
        onNavigate={onNavigate}
        className="border-t border-white/[0.06]"
      />
    </div>
  );
}
