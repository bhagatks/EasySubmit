"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { fetchEnhanceWithAiConfig } from "@/app/actions/config";
import {
  checkEnhanceWithAiPreflight,
  enhanceResumeProfile,
  type EnhanceResumeProfileFailure,
} from "@/app/actions/ai/enhance-resume";
import { updateAiSourcePreference } from "@/app/actions/ai/enhance-resume";
import {
  EnhanceWithAiButton,
  EnhanceWithAiDialog,
  type EnhanceDialogProgress,
} from "@/components/resume/EnhanceWithAiFlow";
import { useEnhanceProgress } from "@/components/resume/useEnhanceProgress";
import { AppAlertDialog } from "@/components/ui/app-alert-dialog";
import { Button } from "@/components/ui/button";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { studioSkillsFromForm } from "@/lib/profile/studio-form-db";
import {
  buildSectionExpansionState,
} from "@/src/lib/ai/engine/post-process";
import {
  createEnhanceTraceId,
  logEnhance,
  logEnhanceErrorAlert,
  summarizeEnhanceRequest,
  summarizeEnhanceResult,
} from "@/src/lib/ai/engine/enhance-logger";
import { ENHANCE_PIPELINE } from "@/src/lib/ai/engine/enhance-pipeline";
import {
  measureEnhanceWorkload,
  resolveEnhanceClientTimeoutMs,
} from "@/src/lib/ai/engine/enhance-progress";
import {
  isEnhanceTimeoutError,
  raceWithEnhanceTimeout,
} from "@/src/lib/ai/engine/enhance-timeout";
import { DEFAULT_ENHANCE_WITH_AI_TIMEOUT_MS } from "@/src/lib/services/enhance-with-ai-config";
import type { StudioEditorSectionId } from "@/lib/resume/studio-editor-sections";
import {
  useRegisterStudioHeaderCenter,
} from "@/components/resume/StudioHeaderCenter";

export type EnhanceFlowApplyResult = {
  form: HubRefineryForm;
  skills: string[];
  sectionExpansion: Record<string, boolean>;
};

type EnhanceFlowErrorCode = EnhanceResumeProfileFailure["code"] | "timeout";

type UseResumeEnhanceFlowOptions = {
  form: HubRefineryForm;
  targetRole: string;
  profileId?: string;
  rawResumeText?: string | null;
  forceSystem?: boolean;
  variant?: "dashboard" | "onboarding";
  onApply: (result: EnhanceFlowApplyResult) => void;
  registerHeader?: boolean;
  /** When false, hides the header button and skips enhance UI wiring. */
  enabled?: boolean;
};

function formatTimeoutSeconds(timeoutMs: number): string {
  return `${Math.round(timeoutMs / 1000)}s`;
}

export function useResumeEnhanceFlow({
  form,
  targetRole,
  profileId,
  rawResumeText,
  forceSystem = false,
  variant = "dashboard",
  onApply,
  registerHeader = false,
  enabled = true,
}: UseResumeEnhanceFlowOptions) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPreflightChecking, setIsPreflightChecking] = useState(false);
  const [requiresByokOnly, setRequiresByokOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<EnhanceFlowErrorCode | undefined>(
    undefined,
  );
  const [warning, setWarning] = useState<string | null>(null);
  const [timeoutMs, setTimeoutMs] = useState(DEFAULT_ENHANCE_WITH_AI_TIMEOUT_MS);
  const [activeTraceId, setActiveTraceId] = useState<string | null>(null);
  const [activeJobDescription, setActiveJobDescription] = useState("");
  const [isSwitchingToSystem, setIsSwitchingToSystem] = useState(false);
  const pendingJobDescriptionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    void fetchEnhanceWithAiConfig()
      .then((config) => {
        if (cancelled) return;
        setTimeoutMs(config.enhanceWithAiTimeoutMs);
        logEnhance("client", "config.loaded", {
          step: ENHANCE_PIPELINE.CLIENT_CONFIG,
          enhanceWithAiTimeoutMs: config.enhanceWithAiTimeoutMs,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        logEnhance("client", "config.load_failed", {
          step: ENHANCE_PIPELINE.CLIENT_CONFIG,
          message: err instanceof Error ? err.message : String(err),
          fallbackTimeoutMs: DEFAULT_ENHANCE_WITH_AI_TIMEOUT_MS,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const mergedForm = useMemo(
    (): HubRefineryForm => ({
      ...form,
      skillsText: form.skillsText,
    }),
    [form],
  );

  const enhanceProgress = useEnhanceProgress({
    isLoading,
    form: mergedForm,
    jobDescription: activeJobDescription,
    rawResumeText,
    traceId: activeTraceId,
  });

  const dialogProgress = useMemo((): EnhanceDialogProgress | null => {
    if (!enhanceProgress) return null;
    return {
      headline: enhanceProgress.message.headline,
      detail: enhanceProgress.message.detail,
      tier: enhanceProgress.estimate.tier,
      progressRatio: enhanceProgress.progressRatio,
      estimatedLabel: enhanceProgress.estimate.estimatedLabel,
    };
  }, [enhanceProgress]);

  const runEnhance = useCallback(
    async (jobDescription: string) => {
      const traceId = createEnhanceTraceId();
      const startedAt = performance.now();
      const workload = measureEnhanceWorkload({
        form: mergedForm,
        jobDescription,
        rawResumeText,
      });
      const effectiveTimeoutMs = resolveEnhanceClientTimeoutMs(timeoutMs, workload);

      logEnhance("client", "submit.start", {
        step: ENHANCE_PIPELINE.CLIENT_SUBMIT,
        timeoutMs: effectiveTimeoutMs,
        configTimeoutMs: timeoutMs,
        workloadTier: workload.tier,
        estimatedMs: workload.estimatedMs,
        ...summarizeEnhanceRequest({
          traceId,
          profileId,
          form: mergedForm,
          targetRole,
          jobDescription,
          rawResumeText,
          forceSystem,
          variant,
        }),
      });

      setActiveTraceId(traceId);
      setActiveJobDescription(jobDescription);
      pendingJobDescriptionRef.current = jobDescription;
      setIsLoading(true);
      setError(null);
      setErrorCode(undefined);
      setWarning(null);

      let result: Awaited<ReturnType<typeof enhanceResumeProfile>>;
      try {
        logEnhance("client", "submit.dispatch", {
          traceId,
          step: ENHANCE_PIPELINE.CLIENT_DISPATCH,
          timeoutMs: effectiveTimeoutMs,
          configTimeoutMs: timeoutMs,
          estimatedMs: workload.estimatedMs,
        });

        result = await raceWithEnhanceTimeout(
          enhanceResumeProfile({
            profileId,
            form: mergedForm,
            targetRole,
            jobDescription: jobDescription || undefined,
            rawResumeText,
            forceSystem,
            traceId,
            variant,
          }),
          effectiveTimeoutMs,
          traceId,
        );
      } catch (err) {
        if (isEnhanceTimeoutError(err)) {
          const durationMs = Math.round(performance.now() - startedAt);
          logEnhance("client", "submit.timeout", {
            traceId,
            step: ENHANCE_PIPELINE.CLIENT_TIMEOUT,
            durationMs,
            timeoutMs: err.timeoutMs,
            diagnosis: {
              serverLogsLocation: "terminal running npm run dev (not browser console)",
              serverSearch: `traceId "${traceId}" with scope server or engine`,
            },
          });
          setIsLoading(false);
          setActiveTraceId(null);
          setActiveJobDescription("");
          setDialogOpen(false);
          const timeoutMessage =
            `Enhancement timed out after ${formatTimeoutSeconds(err.timeoutMs)} (traceId: ${traceId}). ` +
            "Server logs are in the terminal running npm run dev — not in this browser console.";
          setError(timeoutMessage);
          setErrorCode("timeout");
          logEnhanceErrorAlert({
            traceId,
            code: "timeout",
            message: timeoutMessage,
            timeoutMs: err.timeoutMs,
          });
          return;
        }

        logEnhance("client", "submit.throw", {
          traceId,
          step: ENHANCE_PIPELINE.CLIENT_THROW,
          durationMs: Math.round(performance.now() - startedAt),
          message: err instanceof Error ? err.message : String(err),
        });
        setIsLoading(false);
        setActiveTraceId(null);
        setActiveJobDescription("");
        setDialogOpen(false);
        const throwMessage =
          "Enhancement request failed unexpectedly. Check the console for details.";
        setError(throwMessage);
        setErrorCode("provider_error");
        logEnhanceErrorAlert({
          traceId,
          code: "provider_error",
          message: throwMessage,
        });
        return;
      }

      setIsLoading(false);
      setActiveTraceId(null);
      setActiveJobDescription("");

      if (!result.success) {
        logEnhance("client", "submit.failed", {
          traceId,
          step: ENHANCE_PIPELINE.CLIENT_RESPONSE_FAIL,
          durationMs: Math.round(performance.now() - startedAt),
          code: result.code,
          error: result.error,
        });
        setDialogOpen(false);
        setError(result.error);
        setErrorCode(result.code);
        logEnhanceErrorAlert({
          traceId,
          code: result.code ?? "unknown",
          message: result.error,
        });
        return;
      }

      logEnhance("client", "submit.success", {
        traceId,
        step: ENHANCE_PIPELINE.CLIENT_RESPONSE_OK,
        ...summarizeEnhanceResult({
          changedSections: result.changedSections,
          aiMode: result.aiMode,
          quota: result.quota,
          durationMs: Math.round(performance.now() - startedAt),
        }),
      });

      const skills = studioSkillsFromForm(result.form);
      const allSections: StudioEditorSectionId[] = [
        ...(variant === "dashboard" ? (["profileRole"] as const) : []),
        "header",
        "professionalSummary",
        "skills",
        "professionalExperience",
        "education",
        "certifications",
        "projects",
        "languages",
      ];

      logEnhance("client", "apply.start", {
        traceId,
        step: ENHANCE_PIPELINE.CLIENT_APPLY,
        changedSections: result.changedSections,
        expandedSectionCount: result.changedSections.length,
      });

      onApply({
        form: { ...result.form, skillsText: skills.join(", ") },
        skills,
        sectionExpansion: buildSectionExpansionState(
          result.changedSections,
          allSections,
        ),
      });

      if (result.partialEnhance && result.warning) {
        setWarning(result.warning);
      }

      logEnhance("client", "dialog.close", {
        traceId,
        step: ENHANCE_PIPELINE.CLIENT_APPLY,
        reason: "success",
      });
      pendingJobDescriptionRef.current = null;
      setDialogOpen(false);
    },
    [
      forceSystem,
      mergedForm,
      onApply,
      profileId,
      rawResumeText,
      targetRole,
      timeoutMs,
      variant,
    ],
  );

  const handleDialogOpenChange = useCallback((open: boolean) => {
    logEnhance("client", open ? "dialog.open" : "dialog.close", {
      reason: open ? "user_opened" : "user_dismissed",
    });
    setDialogOpen(open);
  }, []);

  const handleOpenDialog = useCallback(() => {
    if (isLoading || isPreflightChecking) return;

    logEnhance("client", "button.click", {
      variant,
      targetRole,
      profileId: profileId ?? null,
      isLoading,
      timeoutMs,
    });

    setIsPreflightChecking(true);
    setRequiresByokOnly(false);

    void checkEnhanceWithAiPreflight({ variant, forceSystem })
      .then((preflight) => {
        if (!preflight.ok) {
          logEnhance("client", "preflight.blocked", {
            step: ENHANCE_PIPELINE.CLIENT_CONFIG,
            code: preflight.code,
            error: preflight.error,
          });
          setError(preflight.error);
          setErrorCode(preflight.code);
          setRequiresByokOnly(Boolean(preflight.requiresByokOnly));
          return;
        }

        logEnhance("client", "preflight.ok", {
          step: ENHANCE_PIPELINE.CLIENT_CONFIG,
          systemAiEnabled: preflight.systemAiEnabled,
        });
        setDialogOpen(true);
      })
      .catch((err) => {
        logEnhance("client", "preflight.error", {
          step: ENHANCE_PIPELINE.CLIENT_CONFIG,
          message: err instanceof Error ? err.message : String(err),
        });
        setError("Could not verify Enhance with AI availability. Try again.");
        setErrorCode("provider_error");
      })
      .finally(() => {
        setIsPreflightChecking(false);
      });
  }, [forceSystem, isLoading, isPreflightChecking, profileId, targetRole, timeoutMs, variant]);

  const handleSwitchToSystem = useCallback(async () => {
    if (isSwitchingToSystem || isLoading) return;

    const pendingJob = pendingJobDescriptionRef.current;
    logEnhance("client", "error.switch_to_system", { hasPendingJob: Boolean(pendingJob) });
    setIsSwitchingToSystem(true);

    try {
      const preferenceResult = await updateAiSourcePreference("system");
      if (!preferenceResult.success) {
        setError(preferenceResult.error);
        setErrorCode("provider_error");
        return;
      }

      setError(null);
      setErrorCode(undefined);
      setRequiresByokOnly(false);

      const preflight = await checkEnhanceWithAiPreflight({
        variant,
        forceSystem: true,
      });

      if (!preflight.ok) {
        logEnhance("client", "error.switch_to_system.preflight_blocked", {
          code: preflight.code,
          error: preflight.error,
        });
        setError(preflight.error);
        setErrorCode(preflight.code);
        setRequiresByokOnly(Boolean(preflight.requiresByokOnly));
        return;
      }

      logEnhance("client", "error.switch_to_system.done", {
        hasPendingJob: Boolean(pendingJob),
      });

      setDialogOpen(true);

      if (pendingJob !== null) {
        await runEnhance(pendingJob);
      }
    } catch (err) {
      logEnhance("client", "error.switch_to_system.failed", {
        message: err instanceof Error ? err.message : String(err),
      });
      setError("Could not switch to EasySubmit AI. Try again.");
      setErrorCode("provider_error");
    } finally {
      setIsSwitchingToSystem(false);
    }
  }, [isLoading, isSwitchingToSystem, runEnhance, variant]);

  const handleRetryEnhance = useCallback(() => {
    const pendingJob = pendingJobDescriptionRef.current;
    setError(null);
    setErrorCode(undefined);

    if (pendingJob !== null) {
      setDialogOpen(true);
      void runEnhance(pendingJob);
      return;
    }

    void handleOpenDialog();
  }, [handleOpenDialog, runEnhance]);

  const showAddApiKeyAction =
    variant !== "onboarding" &&
    (errorCode === "no_system_key" ||
      errorCode === "quota_enhancement" ||
      errorCode === "quota_calls" ||
      errorCode === "capacity_exhausted" ||
      errorCode === "insufficient_quota" ||
      errorCode === "provider_error");

  const showRetryAction =
    variant === "onboarding" &&
    (errorCode === "capacity_exhausted" ||
      errorCode === "rate_limited" ||
      errorCode === "timeout" ||
      errorCode === "provider_error" ||
      errorCode === "insufficient_quota");

  const headerButton = useMemo(
    () => (
      <EnhanceWithAiButton
        variant={variant}
        isLoading={isLoading || isPreflightChecking || isSwitchingToSystem}
        onClick={handleOpenDialog}
      />
    ),
    [handleOpenDialog, isLoading, isPreflightChecking, isSwitchingToSystem, variant],
  );

  useRegisterStudioHeaderCenter(enabled && registerHeader ? headerButton : null);

  const errorTitle =
    errorCode === "feature_disabled"
      ? "Enhance with AI unavailable"
      : errorCode === "timeout"
      ? "Enhancement timed out"
      : errorCode === "capacity_exhausted"
        ? "EasySubmit AI at capacity"
      : errorCode === "insufficient_quota"
        ? "AI quota reached"
        : errorCode === "rate_limited"
          ? "Rate limit reached"
          : errorCode === "no_customer_key"
            ? "API key required"
            : "Enhancement failed";

  const errorDescription =
    error && variant === "onboarding" ? (
      <>
        {error}
        <span className="mt-2 block text-xs leading-relaxed text-muted-foreground">
          You are still in onboarding — add your own API key later from Dashboard → AI Keys. Use{" "}
          <strong className="font-medium text-foreground">Switch to EasySubmit AI</strong> or{" "}
          <strong className="font-medium text-foreground">Try again</strong> to stay on Studio.
        </span>
      </>
    ) : (
      error
    );

  const flowUi = (
    <>
      <EnhanceWithAiDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        onSubmit={(jd) => void runEnhance(jd)}
        isLoading={isLoading}
        progress={dialogProgress}
      />

      <AppAlertDialog
        open={Boolean(error)}
        onOpenChange={(open) => {
          if (!open && !isSwitchingToSystem) {
            logEnhance("client", "error.dismiss", { errorCode });
            setError(null);
          }
        }}
        busy={isSwitchingToSystem}
        title={errorTitle}
        description={errorDescription}
        footer={
          <>
            {(errorCode === "no_customer_key" || errorCode === "provider_error") &&
            !requiresByokOnly ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={isSwitchingToSystem}
                onClick={() => void handleSwitchToSystem()}
              >
                {isSwitchingToSystem ? "Switching…" : "Switch to EasySubmit AI"}
              </Button>
            ) : null}
            {showAddApiKeyAction ? (
              <Button type="button" className="rounded-xl" asChild>
                <Link href="/dashboard/keys">Add or update API key</Link>
              </Button>
            ) : null}
            {showRetryAction ? (
              <Button
                type="button"
                className="rounded-xl"
                disabled={isSwitchingToSystem || isLoading}
                onClick={handleRetryEnhance}
              >
                Try again
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl"
              onClick={() => setError(null)}
            >
              Close
            </Button>
          </>
        }
      />

      <AppAlertDialog
        open={Boolean(warning)}
        onOpenChange={(open) => {
          if (!open) setWarning(null);
        }}
        title="Partial enhancement saved"
        description={warning ?? ""}
        footer={
          <Button
            type="button"
            className="rounded-xl"
            onClick={() => setWarning(null)}
          >
            Continue
          </Button>
        }
      />
    </>
  );

  return {
    headerButton: enabled ? headerButton : null,
    flowUi: enabled ? flowUi : null,
    openDialog: enabled ? handleOpenDialog : () => {},
    isLoading: enabled ? isLoading || isPreflightChecking || isSwitchingToSystem : false,
    timeoutMs,
  };
}
