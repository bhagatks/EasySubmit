import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
import { captureJob, type CaptureJobInput } from "@/lib/extension/capture-job";
import {
  buildTailorInputFromSave,
  runPipelineTailor,
} from "@/lib/extension/pipeline-tailor";
import { mergeJobEntryMetadata, recordPipelineTailorError } from "@/lib/extension/pipeline-metadata";
import { setPipelineDebugStep } from "@/lib/extension/pipeline-debug-progress";
import { findPipelineStepFailure } from "@/lib/job-tracker/pipeline-tracker-view";
import { parsePipelineDebugProgress, PIPELINE_DEBUG_METADATA_KEY } from "@/src/shared/extension/pipeline-debug-types";
import type { ApplyPipelinePhase } from "@/lib/extension/pipeline-types";
import { isOneClickPlatform } from "@/lib/extension/pipeline-types";
import { getExtensionUserPrefs } from "@/lib/extension/user-prefs";
import { hasJobResumeTailor } from "@/lib/profile/job-resume-tailor";
import { prisma } from "@/lib/prisma";
import { logEnhance } from "@/src/lib/ai/engine/enhance-logger";
import { TAILOR_PIPELINE } from "@/src/lib/ai/engine/enhance-pipeline";
import { isApplyJobUrl } from "@/src/shared/extension/apply-gate";
import {
  FEATURE_FLAG_KEYS,
  isFeatureEnabled,
} from "@/src/lib/services/feature-flags-service";

export type { ApplyPipelinePhase } from "@/lib/extension/pipeline-types";
export { ONE_CLICK_APPLY_PLATFORMS } from "@/lib/extension/pipeline-types";

export type RunApplyPipelineInput = CaptureJobInput;
export { captureJob };

export type RunApplyPipelineResult =
  | {
      success: true;
      id: string;
      status: JobTrackerStatus;
      phases: ApplyPipelinePhase[];
      pendingPhase: ApplyPipelinePhase | null;
      hasTailoredResume?: boolean;
      sourceProfileId?: string | null;
      pipelineWarning?: string;
    }
  | {
      success: false;
      error: string;
      code?: string;
      /** Job row may still exist at CAPTURED when tailor fails after save. */
      id?: string;
      saved?: boolean;
      status?: JobTrackerStatus;
    };

const TAILOR_COMPLETE_STATUSES: JobTrackerStatus[] = ["RESUME_READY", "READY_TO_APPLY"];

async function entryHasApplyJobUrl(userId: string, entryId: string): Promise<boolean> {
  const row = await prisma.jobTrackerEntry.findFirst({
    where: { id: entryId, userId },
    select: { canonicalUrl: true },
  });
  return isApplyJobUrl(row?.canonicalUrl);
}

async function findExistingTailoredState(
  userId: string,
  entryId: string,
): Promise<{ status: JobTrackerStatus; hasTailoredResume: true } | null> {
  const row = await prisma.jobTrackerEntry.findFirst({
    where: { id: entryId, userId },
    select: { status: true },
  });

  if (!row || !TAILOR_COMPLETE_STATUSES.includes(row.status)) {
    return null;
  }

  const tailored = await hasJobResumeTailor(userId, entryId);
  if (!tailored) return null;

  return { status: row.status, hasTailoredResume: true };
}

/** Server-side Stage 2 → 3: resume ready jobs enter apply assist without extension stub. */
export async function advancePipelineAfterAutofill(
  userId: string,
  entryId: string,
): Promise<void> {
  const row = await prisma.jobTrackerEntry.findFirst({
    where: { id: entryId, userId },
    select: { metadata: true },
  });
  const metadata =
    row?.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : null;
  const debugProgress = metadata
    ? parsePipelineDebugProgress(metadata[PIPELINE_DEBUG_METADATA_KEY])
    : null;
  const failure = findPipelineStepFailure(debugProgress);
  if (failure) {
    logEnhance("pipeline", "apply.advance_blocked", {
      step: TAILOR_PIPELINE.APPLY_TAILOR_RESULT,
      userId,
      entryId,
      failedStepId: failure.stepId,
      failedStage: failure.stage,
      detail: failure.detail,
    });
    return;
  }

  if (!(await entryHasApplyJobUrl(userId, entryId))) {
    logEnhance("pipeline", "apply.advance_blocked", {
      step: TAILOR_PIPELINE.APPLY_TAILOR_RESULT,
      userId,
      entryId,
      reason: "missing_apply_url",
      detail: "No job posting URL — resume ready only",
    });
    await setPipelineDebugStep(userId, entryId, "status_ready", {
      status: "skipped",
      detail: "No job posting URL — stopped at resume ready",
    });
    return;
  }

  const { updateJobTrackerStatus } = await import("@/lib/extension/job-service");
  await updateJobTrackerStatus(userId, entryId, "READY_TO_APPLY");
  await setPipelineDebugStep(userId, entryId, "status_ready", {
    status: "done",
    detail: "READY_TO_APPLY — pipeline complete",
  });
}

async function ensureApplyAssistStatus(
  userId: string,
  entryId: string,
  currentStatus: JobTrackerStatus,
): Promise<JobTrackerStatus> {
  if (currentStatus === "READY_TO_APPLY" || currentStatus === "APPLIED") {
    return currentStatus;
  }

  if (currentStatus === "RESUME_READY") {
    if (!(await entryHasApplyJobUrl(userId, entryId))) {
      return currentStatus;
    }
    await advancePipelineAfterAutofill(userId, entryId);
    await mergeJobEntryMetadata(userId, entryId, {
      pipelinePhases: ["capture", "tailor", "autofill"],
    });
    return "READY_TO_APPLY";
  }

  return currentStatus;
}

function shouldOfferAutofillPhase(
  autoApplyEnabled: boolean,
  autoApplyUserSwitch: boolean,
  platform: string | null,
): boolean {
  return autoApplyEnabled && autoApplyUserSwitch && isOneClickPlatform(platform);
}

/** Stage 1→2: tailor resume + advance to READY_TO_APPLY. Called fire-and-forget after capture. */
export async function tailorJobPipeline(
  userId: string,
  entryId: string,
  input: RunApplyPipelineInput,
): Promise<{ success: boolean; status: JobTrackerStatus; error?: string }> {
  try {
    const prefs = await getExtensionUserPrefs(userId);

    if (!prefs.customizeResume) {
      logEnhance("pipeline", "apply.skip_customize", {
        step: TAILOR_PIPELINE.APPLY_SKIP_CUSTOMIZE,
        userId,
        entryId,
        customizeResume: false,
      });
      const hasApplyUrl = isApplyJobUrl(input.url) || (await entryHasApplyJobUrl(userId, entryId));
      if (hasApplyUrl) {
        await advancePipelineAfterAutofill(userId, entryId);
      } else {
        await setPipelineDebugStep(userId, entryId, "status_ready", {
          status: "skipped",
          detail: "No job posting URL — stopped at captured",
        });
      }
      await mergeJobEntryMetadata(userId, entryId, {
        pipelinePhases: ["capture"],
        pipelineError: null,
        pipelineErrorCode: null,
      });
      for (const stepId of [
        "profile_load",
        "pre_validate",
        "pre_jd_skills",
        "pre_jd_brain",
        "ai_jd_extract",
        "pre_rules",
        "pre_resume_context",
        "pre_role_vocab",
        "pre_skills_merge",
        "pre_intelligence",
        "pre_keyword_gap",
        "pre_directive",
        "pre_plan",
        "ai_gates",
        "baseline",
        "ai_pass1",
        "ai_pass2",
        "post_process",
        "persist_overrides",
      ]) {
        await setPipelineDebugStep(userId, entryId, stepId, {
          status: "skipped",
          detail: "Customize resume is off",
        });
      }
      const status = hasApplyUrl ? "READY_TO_APPLY" : "CAPTURED";
      return { success: true, status };
    }

    const existingTailored = await findExistingTailoredState(userId, entryId);
    if (existingTailored) {
      logEnhance("pipeline", "apply.tailor_cached", {
        step: TAILOR_PIPELINE.APPLY_TAILOR_RESULT,
        userId,
        entryId,
        status: existingTailored.status,
        reused: true,
      });
      const status = await ensureApplyAssistStatus(userId, entryId, existingTailored.status);
      return { success: true, status };
    }

    logEnhance("pipeline", "apply.tailor_dispatch", {
      step: TAILOR_PIPELINE.APPLY_TAILOR_DISPATCH,
      userId,
      entryId,
      jobTitle: input.title,
    });

    await mergeJobEntryMetadata(userId, entryId, {
      tailorStartedAt: new Date().toISOString(),
      pipelineError: null,
      pipelineErrorCode: null,
    });

    const tailor = await runPipelineTailor(userId, buildTailorInputFromSave(entryId, input));
    if (!tailor.success) {
      logEnhance("pipeline", "apply.tailor_failed", {
        step: TAILOR_PIPELINE.APPLY_TAILOR_RESULT,
        userId,
        entryId,
        error: tailor.error,
        code: tailor.code,
      });
      return { success: false, status: "CAPTURED", error: tailor.error };
    }

    logEnhance("pipeline", "apply.tailor_ok", {
      step: TAILOR_PIPELINE.APPLY_TAILOR_RESULT,
      userId,
      entryId,
      sourceProfileId: tailor.sourceProfileId,
    });

    const hasApplyUrl = isApplyJobUrl(input.url) || (await entryHasApplyJobUrl(userId, entryId));
    if (hasApplyUrl) {
      await advancePipelineAfterAutofill(userId, entryId);
      await mergeJobEntryMetadata(userId, entryId, {
        pipelinePhases: ["capture", "tailor", "autofill"],
        pipelineError: null,
        pipelineErrorCode: null,
      });
      return { success: true, status: "READY_TO_APPLY" };
    }

    await setPipelineDebugStep(userId, entryId, "status_ready", {
      status: "skipped",
      detail: "No job posting URL — stopped at resume ready",
    });
    await mergeJobEntryMetadata(userId, entryId, {
      pipelinePhases: ["capture", "tailor"],
      pipelineError: null,
      pipelineErrorCode: null,
    });

    return { success: true, status: "RESUME_READY" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Resume optimization failed";
    logEnhance("pipeline", "apply.tailor_crashed", {
      step: TAILOR_PIPELINE.APPLY_TAILOR_RESULT,
      userId,
      entryId,
      error: message,
    });
    await recordPipelineTailorError(userId, entryId, message, "tailor_crashed");
    return { success: false, status: "CAPTURED", error: message };
  }
}

/**
 * Apply journey: capture → tailor (all platforms) → server auto-advance to READY_TO_APPLY.
 * Workday one-click may still run client autofill assist (`pendingPhase: autofill`) — adapters later.
 */
export async function runApplyPipeline(
  userId: string,
  input: RunApplyPipelineInput,
): Promise<RunApplyPipelineResult> {
  const [prefs, autoApplyEnabled] = await Promise.all([
    getExtensionUserPrefs(userId),
    isFeatureEnabled(FEATURE_FLAG_KEYS.extensionAutoApply),
  ]);
  const platform = input.platform?.trim() || null;
  const offerAutofill = shouldOfferAutofillPhase(
    autoApplyEnabled,
    prefs.autoApplyUserSwitch,
    platform,
  );

  const saved = await captureJob(userId, {
    ...input,
    startTracks: prefs.customizeResume,
  });
  const phases: ApplyPipelinePhase[] = ["capture"];

  logEnhance("pipeline", "apply.start", {
    step: TAILOR_PIPELINE.APPLY_START,
    userId,
    entryId: saved.id,
    customizeResume: prefs.customizeResume,
    platform,
  });

  if (!prefs.customizeResume) {
    logEnhance("pipeline", "apply.skip_customize", {
      step: TAILOR_PIPELINE.APPLY_SKIP_CUSTOMIZE,
      userId,
      entryId: saved.id,
    });
    await advancePipelineAfterAutofill(userId, saved.id);
    await mergeJobEntryMetadata(userId, saved.id, {
      pipelinePhases: ["capture"],
      pipelineError: null,
      pipelineErrorCode: null,
    });

    return {
      success: true,
      id: saved.id,
      status: "READY_TO_APPLY",
      phases,
      pendingPhase: offerAutofill ? "autofill" : null,
      sourceProfileId: input.sourceProfileId ?? null,
    };
  }

  const existingTailored = await findExistingTailoredState(userId, saved.id);
  if (existingTailored) {
    const status = await ensureApplyAssistStatus(userId, saved.id, existingTailored.status);
    return {
      success: true,
      id: saved.id,
      status,
      phases: ["capture", "tailor"],
      pendingPhase: offerAutofill && status === "READY_TO_APPLY" ? "autofill" : null,
      hasTailoredResume: true,
    };
  }

  const tailor = await runPipelineTailor(userId, buildTailorInputFromSave(saved.id, input));

  if (!tailor.success) {
    return {
      success: false,
      error: tailor.error,
      code: tailor.code,
      id: saved.id,
      saved: true,
      status: "CAPTURED",
    };
  }

  phases.push("tailor");

  await advancePipelineAfterAutofill(userId, saved.id);
  await mergeJobEntryMetadata(userId, saved.id, {
    pipelinePhases: ["capture", "tailor", "autofill"],
    pipelineError: null,
    pipelineErrorCode: null,
  });

  return {
    success: true,
    id: saved.id,
    status: "READY_TO_APPLY",
    phases,
    pendingPhase: offerAutofill ? "autofill" : null,
    hasTailoredResume: true,
    sourceProfileId: tailor.sourceProfileId,
  };
}
