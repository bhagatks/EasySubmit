import type { SaveJobTrackerInput } from "@/lib/extension/job-service";
import {
  APPLY_JD_MIN_CHARS,
  canDashboardManualJobSave,
  dashboardManualJobBlockReason,
  isApplyJobUrl,
} from "@/src/shared/extension/apply-gate";

export type DashboardManualJobDraft = {
  url: string;
  title: string;
  company: string;
  description: string;
  sourceProfileId: string;
  /** Set when fields were populated from URL import. */
  importSource?: "url" | "manual";
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
  "Paste a job URL to import details and unlock Apply assist. Or enter the role and description below — without a posting URL you can tailor a resume, but Apply stays unavailable.";

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

  const blockReason = dashboardManualJobBlockReason({ url, title, description });
  if (blockReason) {
    return { ok: false, error: blockReason };
  }

  if (!canDashboardManualJobSave({ url, title, description })) {
    return { ok: false, error: "Add job details to continue." };
  }

  const hasApplyUrl = isApplyJobUrl(url);

  if (!sourceProfileId) {
    return { ok: false, error: "Select a resume profile to tailor from." };
  }

  return {
    ok: true,
    input: {
      url: hasApplyUrl ? url : "",
      title,
      company: company || null,
      description,
      platform: "dashboard_manual",
      sourceProfileId,
      metadata: {
        captureMode: draft.importSource === "url" ? "url_import" : "manual",
        captureSource: "dashboard",
        sourceProfileId,
        applyUrlMissing: !hasApplyUrl,
      },
    },
  };
}

export function dashboardManualJobDescriptionHint(length: number): string {
  return `${length}/${APPLY_JD_MIN_CHARS} characters`;
}
