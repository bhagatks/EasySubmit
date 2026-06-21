"use client";

import { useEffect, useRef, useState } from "react";
import { logEnhance } from "@/src/lib/ai/engine/enhance-logger";
import {
  measureEnhanceWorkload,
  resolveEnhanceProgressMessage,
  resolveEnhanceProgressRatio,
  type EnhanceProgressEstimate,
  type EnhanceProgressMessage,
} from "@/src/lib/ai/engine/enhance-progress";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";

const TICK_MS = 2_500;

export type EnhanceProgressState = {
  estimate: EnhanceProgressEstimate;
  message: EnhanceProgressMessage;
  progressRatio: number;
  elapsedMs: number;
};

type UseEnhanceProgressOptions = {
  isLoading: boolean;
  form: HubRefineryForm;
  jobDescription: string;
  rawResumeText?: string | null;
  traceId?: string | null;
};

export function useEnhanceProgress({
  isLoading,
  form,
  jobDescription,
  rawResumeText,
  traceId,
}: UseEnhanceProgressOptions): EnhanceProgressState | null {
  const startedAtRef = useRef<number | null>(null);
  const lastPhaseRef = useRef<string | null>(null);
  const [state, setState] = useState<EnhanceProgressState | null>(null);

  useEffect(() => {
    if (!isLoading) {
      startedAtRef.current = null;
      lastPhaseRef.current = null;
      setState(null);
      return;
    }

    const estimate = measureEnhanceWorkload({
      form,
      jobDescription,
      rawResumeText,
    });

    startedAtRef.current = performance.now();

    logEnhance("client", "progress.start", {
      traceId: traceId ?? undefined,
      tier: estimate.tier,
      estimatedMs: estimate.estimatedMs,
      estimatedLabel: estimate.estimatedLabel,
      passCount: estimate.passCount,
      totalInputChars: estimate.totalInputChars,
      jobDescriptionChars: estimate.jobDescriptionChars,
    });

    const tick = () => {
      const startedAt = startedAtRef.current;
      if (startedAt === null) return;

      const elapsedMs = Math.round(performance.now() - startedAt);
      const message = resolveEnhanceProgressMessage({
        tier: estimate.tier,
        estimatedMs: estimate.estimatedMs,
        elapsedMs,
        passCount: estimate.passCount,
      });

      if (lastPhaseRef.current !== message.phase) {
        lastPhaseRef.current = message.phase;
        logEnhance("client", "progress.update", {
          traceId: traceId ?? undefined,
          phase: message.phase,
          elapsedMs,
          estimatedMs: estimate.estimatedMs,
          headline: message.headline,
        });
      }

      setState({
        estimate,
        message,
        elapsedMs,
        progressRatio: resolveEnhanceProgressRatio(elapsedMs, estimate.estimatedMs),
      });
    };

    tick();
    const intervalId = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(intervalId);
  }, [form, isLoading, jobDescription, rawResumeText, traceId]);

  return isLoading ? state : null;
}
