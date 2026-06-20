"use client";

import type { ReactNode } from "react";
import { getWorkbenchPhase, workbenchPhaseHeader } from "@/lib/onboarding/workbenchPhases";
import { cn } from "@/lib/utils";

const PRIMARY = "oklch(0.62 0.21 265)";
const MUTED = "oklch(0.45 0.02 268)";

type WorkbenchPhaseIntroProps = {
  phaseId: 1 | 2 | 3;
  icon: ReactNode;
  monoClass: string;
  /** Optional override for the sentence after the em dash */
  subtitle?: string;
  actions?: ReactNode;
  /** Full-width block below the title row (e.g. expanded raw text) */
  footer?: ReactNode;
  className?: string;
};

export function WorkbenchPhaseIntro({
  phaseId,
  icon,
  monoClass,
  subtitle,
  actions,
  footer,
  className,
}: WorkbenchPhaseIntroProps) {
  const line =
    subtitle?.trim() ||
    getWorkbenchPhase(phaseId)?.description ||
    "";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p
          className={cn(
            monoClass,
            "min-w-0 flex-1 text-[11px] font-medium uppercase leading-snug tracking-[0.14em] sm:tracking-[0.16em]",
          )}
          style={{ color: PRIMARY }}
        >
          <span className="mr-1.5 inline-flex shrink-0 align-text-bottom">{icon}</span>
          {workbenchPhaseHeader(phaseId)}
          {line ? (
            <span className="font-normal normal-case tracking-normal" style={{ color: MUTED }}>
              {" — "}
              {line}
            </span>
          ) : null}
        </p>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {footer}
    </div>
  );
}
