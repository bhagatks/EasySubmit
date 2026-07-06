import {
  MAX_JOB_DESCRIPTION_CHARS,
  type SaveJobTrackerInput,
} from "@/lib/extension/job-service";
import { resolveJobTrackerPlatform } from "@/src/shared/ats-platform-detection";
import {
  buildDashboardManualPlaceholderUrl,
  canApplyCapture,
  canDashboardManualJobSave,
  isApplyJobUrl,
} from "@/src/shared/extension/apply-gate";
import { resolveJobIdentity } from "@/src/shared/extension/job-identity";

function pickClientCaptureMetadata(
  metadata: SaveJobTrackerInput["metadata"],
): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  const out: Record<string, unknown> = {};

  if (typeof metadata.confidence === "number" && Number.isFinite(metadata.confidence)) {
    out.confidence = metadata.confidence;
  }
  if (typeof metadata.scrapePath === "string") {
    out.scrapePath = metadata.scrapePath.trim().slice(0, 200);
  }
  if (Array.isArray(metadata.enrichmentsApplied)) {
    out.enrichmentsApplied = metadata.enrichmentsApplied
      .filter((value): value is string => typeof value === "string")
      .slice(0, 32)
      .map((value) => value.trim().slice(0, 80));
  }
  if (metadata.captureMode === "manual" || metadata.captureMode === "auto") {
    out.captureMode = metadata.captureMode;
  }
  if (metadata.captureMode === "url_import") {
    out.captureMode = metadata.captureMode;
  }
  if (metadata.captureSource === "dashboard") {
    out.captureSource = "dashboard";
  }
  if (metadata.applyUrlMissing === true) {
    out.applyUrlMissing = true;
  }

  return out;
}

export type NormalizedSaveJobInput = Omit<SaveJobTrackerInput, "title" | "company"> & {
  title: string;
  company: string | null;
  identitySources: {
    title: string;
    company: string | null;
  };
};

/** Layer B — URL + description required for extension capture; dashboard may omit apply URL. */
export function normalizeSaveJobInput(
  input: SaveJobTrackerInput,
): NormalizedSaveJobInput | { error: string } {
  const rawUrl = input.url?.trim() ?? "";
  const description = (input.description?.trim() ?? "").slice(0, MAX_JOB_DESCRIPTION_CHARS);
  const existingMeta = pickClientCaptureMetadata(input.metadata);
  const isDashboardManual = existingMeta.captureSource === "dashboard";

  if (isDashboardManual && !isApplyJobUrl(rawUrl)) {
    if (!canDashboardManualJobSave({ url: rawUrl, title: input.title, description })) {
      return { error: "role title and job description (min 120 chars) are required" };
    }
    const explicitTitle = input.title?.trim() ?? "";
    if (explicitTitle.length < 2) {
      return { error: "role title is required for manual capture" };
    }
  } else if (!canApplyCapture({ url: rawUrl, description })) {
    return { error: "url and job description (min 120 chars) are required" };
  }

  const url =
    isApplyJobUrl(rawUrl) ? rawUrl : isDashboardManual ? buildDashboardManualPlaceholderUrl() : rawUrl;

  const captureMode = existingMeta.captureMode;
  if (captureMode === "manual" && !isDashboardManual) {
    const explicitTitle = input.title?.trim() ?? "";
    if (explicitTitle.length < 2) {
      return { error: "role title is required for manual capture" };
    }
  }

  const identity = resolveJobIdentity({
    url,
    title: input.title,
    company: input.company,
    description,
  });

  const title = input.title?.trim() || identity.title;
  const company = input.company?.trim() || identity.company;

  return {
    url,
    title,
    company: company || null,
    location: input.location?.trim() || null,
    salaryText: input.salaryText?.trim() || null,
    description,
    platform: isApplyJobUrl(url)
      ? resolveJobTrackerPlatform(url, input.platform)
      : "dashboard_manual",
    sourceProfileId: input.sourceProfileId?.trim() || null,
    metadata: {
      ...existingMeta,
      identitySources: {
        title: identity.titleSource,
        company: identity.companySource,
      },
    },
    identitySources: {
      title: identity.titleSource,
      company: identity.companySource,
    },
  };
}
