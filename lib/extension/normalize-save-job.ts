import {
  MAX_JOB_DESCRIPTION_CHARS,
  type SaveJobTrackerInput,
} from "@/lib/extension/job-service";
import { resolveJobTrackerPlatform } from "@/src/shared/ats-platform-detection";
import { canApplyCapture } from "@/src/shared/extension/apply-gate";
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

/** Layer B — URL + description required; title/company derived when missing. */
export function normalizeSaveJobInput(
  input: SaveJobTrackerInput,
): NormalizedSaveJobInput | { error: string } {
  const url = input.url?.trim() ?? "";
  const description = (input.description?.trim() ?? "").slice(0, MAX_JOB_DESCRIPTION_CHARS);

  if (!canApplyCapture({ url, description })) {
    return { error: "url and job description (min 120 chars) are required" };
  }

  const existingMeta = pickClientCaptureMetadata(input.metadata);
  const captureMode = existingMeta.captureMode;
  if (captureMode === "manual") {
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
    platform: resolveJobTrackerPlatform(url, input.platform),
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
