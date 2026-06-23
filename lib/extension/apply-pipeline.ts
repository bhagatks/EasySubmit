import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
import {
  saveJobTrackerEntry,
  type SaveJobTrackerInput,
} from "@/lib/extension/job-service";
import {
  buildTailorInputFromSave,
  runPipelineTailor,
} from "@/lib/extension/pipeline-tailor";
import { mergeJobEntryMetadata } from "@/lib/extension/pipeline-metadata";
import type { ApplyPipelinePhase } from "@/lib/extension/pipeline-types";
import { isOneClickPlatform } from "@/lib/extension/pipeline-types";
import { getExtensionUserPrefs } from "@/lib/extension/user-prefs";
import { hasJobResumeTailor } from "@/lib/profile/job-resume-tailor";
import { prisma } from "@/lib/prisma";
import {
  FEATURE_FLAG_KEYS,
  isFeatureEnabled,
} from "@/src/lib/services/feature-flags-service";

export type { ApplyPipelinePhase } from "@/lib/extension/pipeline-types";
export { ONE_CLICK_APPLY_PLATFORMS } from "@/lib/extension/pipeline-types";

export type RunApplyPipelineInput = SaveJobTrackerInput & {
  platform?: string | null;
  sourceProfileId?: string | null;
};

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

const TAILOR_COMPLETE_STATUSES: JobTrackerStatus[] = ["RESUME_READY", "READY_TO_APPLY", "APPLIED"];

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

/** Server-side Stage 1b → 2: resume ready jobs enter apply assist without extension stub. */
export async function advancePipelineAfterAutofill(
  userId: string,
  entryId: string,
): Promise<void> {
  const { updateJobTrackerStatus } = await import("@/lib/extension/job-service");
  await updateJobTrackerStatus(userId, entryId, "READY_TO_APPLY");
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

  const saved = await saveJobTrackerEntry(userId, input);
  const phases: ApplyPipelinePhase[] = ["capture"];

  if (!prefs.customizeResume) {
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
