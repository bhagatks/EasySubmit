import type { SaveJobTrackerInput } from "@/lib/extension/job-service";
import {
  APPLY_JD_MIN_CHARS,
  canManualCaptureSave,
  manualCaptureBlockReason,
} from "@/src/shared/extension/apply-gate";

export type DashboardManualJobDraft = {
  url: string;
  title: string;
  company: string;
  description: string;
  sourceProfileId: string;
};

export type DashboardManualJobProfileOption = {
  id: string;
  label: string;
  isDefault: boolean;
};

export type DashboardManualJobValidation =
  | { ok: true; input: SaveJobTrackerInput }
  | { ok: false; error: string };

export const DASHBOARD_MANUAL_JOB_TITLE = "Add job to Job Tracker";

export const DASHBOARD_MANUAL_JOB_SUBTITLE =
  "Save the role here and tailor a job-specific resume. Your base resume profiles are not changed.";

export function resolveDashboardManualJobProfileId(
  profiles: DashboardManualJobProfileOption[],
  selectedProfileId: string | null | undefined,
): string | null {
  if (profiles.length === 0) return null;

  const explicit = selectedProfileId?.trim();
  if (explicit) {
    const match = profiles.find((profile) => profile.id === explicit);
    if (match) return match.id;
  }

  return profiles.find((profile) => profile.isDefault)?.id ?? profiles[0]?.id ?? null;
}

export function buildDashboardManualJobInput(
  draft: DashboardManualJobDraft,
): DashboardManualJobValidation {
  const url = draft.url.trim();
  const title = draft.title.trim();
  const company = draft.company.trim();
  const description = draft.description.trim();
  const sourceProfileId = draft.sourceProfileId.trim();

  const blockReason = manualCaptureBlockReason({ url, title, description });
  if (blockReason) {
    return { ok: false, error: blockReason };
  }

  if (!canManualCaptureSave({ url, title, description })) {
    return { ok: false, error: "Add job details to continue." };
  }

  if (!sourceProfileId) {
    return { ok: false, error: "Select a resume profile to tailor from." };
  }

  return {
    ok: true,
    input: {
      url,
      title,
      company: company || null,
      description,
      platform: "dashboard_manual",
      sourceProfileId,
      metadata: {
        captureMode: "manual",
        captureSource: "dashboard",
        sourceProfileId,
      },
    },
  };
}

export function dashboardManualJobDescriptionHint(length: number): string {
  return `${length}/${APPLY_JD_MIN_CHARS} characters`;
}
