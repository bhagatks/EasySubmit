import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
import {
  saveJobTrackerEntry,
  type SaveJobTrackerInput,
} from "@/lib/extension/job-service";
import {
  buildTailorInputFromSave,
  runPipelineTailor,
} from "@/lib/extension/pipeline-tailor";
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

/** Workday one-click pipeline: capture → tailor → autofill stub → READY_TO_APPLY. */
export async function runApplyPipeline(
  userId: string,
  input: RunApplyPipelineInput,
): Promise<RunApplyPipelineResult> {
  const [prefs, autoApplyEnabled] = await Promise.all([
    getExtensionUserPrefs(userId),
    isFeatureEnabled(FEATURE_FLAG_KEYS.extensionAutoApply),
  ]);
  const platform = input.platform?.trim() || null;
  const oneClick = autoApplyEnabled && prefs.oneClickApply && isOneClickPlatform(platform);

  if (prefs.oneClickApply && autoApplyEnabled && platform && !isOneClickPlatform(platform)) {
    const saved = await saveJobTrackerEntry(userId, input);
    return {
      success: true,
      id: saved.id,
      status: saved.status,
      phases: ["capture"],
      pendingPhase: null,
    };
  }

  const saved = await saveJobTrackerEntry(userId, input);
  const phases: ApplyPipelinePhase[] = ["capture"];

  if (!oneClick) {
    return {
      success: true,
      id: saved.id,
      status: saved.status,
      phases,
      pendingPhase: null,
    };
  }

  const existingTailored = await findExistingTailoredState(userId, saved.id);
  if (existingTailored) {
    return {
      success: true,
      id: saved.id,
      status: existingTailored.status,
      phases: ["capture", "tailor"],
      pendingPhase: existingTailored.status === "RESUME_READY" ? "autofill" : null,
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

  return {
    success: true,
    id: saved.id,
    status: "RESUME_READY",
    phases: tailor.phases,
    pendingPhase: "autofill",
    hasTailoredResume: true,
    sourceProfileId: tailor.sourceProfileId,
  };
}

export async function advancePipelineAfterAutofill(
  userId: string,
  entryId: string,
): Promise<void> {
  const { updateJobTrackerStatus } = await import("@/lib/extension/job-service");
  await updateJobTrackerStatus(userId, entryId, "READY_TO_APPLY");
}
