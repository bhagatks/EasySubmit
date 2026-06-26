import type { ScrapedJobMetadata } from "@/src/shared/extension/types";

export type JobDetailDraft = {
  title: string;
  company: string;
  location: string;
  salaryText: string;
  platform: string;
  description: string;
  qualifications: string;
  responsibilities: string;
  incentives: string;
};

export type JobDetailDraftSource = {
  title: string;
  company: string | null;
  location: string | null;
  salaryText: string | null;
  description: string | null;
  platform: string | null;
  jsonLdFields?: ScrapedJobMetadata["jsonLdFields"];
};

export function buildJobDetailDraft(source: JobDetailDraftSource): JobDetailDraft {
  return {
    title: source.title,
    company: source.company ?? "",
    location: source.location ?? "",
    salaryText: source.salaryText ?? "",
    platform: source.platform?.trim() || "generic",
    description: source.description ?? "",
    qualifications: source.jsonLdFields?.qualifications ?? "",
    responsibilities: source.jsonLdFields?.responsibilities ?? "",
    incentives: source.jsonLdFields?.incentives ?? "",
  };
}

export function normalizeJobDetailDraft(draft: JobDetailDraft): JobDetailDraft {
  return {
    title: draft.title.trim(),
    company: draft.company.trim(),
    location: draft.location.trim(),
    salaryText: draft.salaryText.trim(),
    platform: draft.platform.trim() || "generic",
    description: draft.description.trim(),
    qualifications: draft.qualifications.trim(),
    responsibilities: draft.responsibilities.trim(),
    incentives: draft.incentives.trim(),
  };
}

export function jobDetailDraftsEqual(a: JobDetailDraft, b: JobDetailDraft): boolean {
  const left = normalizeJobDetailDraft(a);
  const right = normalizeJobDetailDraft(b);
  return (
    left.title === right.title &&
    left.company === right.company &&
    left.location === right.location &&
    left.salaryText === right.salaryText &&
    left.platform === right.platform &&
    left.description === right.description &&
    left.qualifications === right.qualifications &&
    left.responsibilities === right.responsibilities &&
    left.incentives === right.incentives
  );
}

export function applyJobDetailDraftToMetadata(
  metadata: ScrapedJobMetadata,
  draft: JobDetailDraft,
): ScrapedJobMetadata {
  const normalized = normalizeJobDetailDraft(draft);
  const jsonLdFields = {
    ...(normalized.qualifications ? { qualifications: normalized.qualifications } : {}),
    ...(normalized.responsibilities ? { responsibilities: normalized.responsibilities } : {}),
    ...(normalized.incentives ? { incentives: normalized.incentives } : {}),
  };

  return {
    ...metadata,
    title: normalized.title || metadata.title,
    company: normalized.company || null,
    location: normalized.location || null,
    salaryText: normalized.salaryText || null,
    description: normalized.description || null,
    platform: (normalized.platform || metadata.platform || "generic") as ScrapedJobMetadata["platform"],
    jsonLdFields: Object.keys(jsonLdFields).length > 0 ? jsonLdFields : undefined,
  };
}

export type JobDetailFieldsPayload = {
  title: string;
  company: string | null;
  location: string | null;
  salaryText: string | null;
  description: string | null;
  platform: string | null;
  jsonLdFields: ScrapedJobMetadata["jsonLdFields"];
};

export function jobDetailDraftToFieldsPayload(draft: JobDetailDraft): JobDetailFieldsPayload {
  const normalized = normalizeJobDetailDraft(draft);
  const jsonLdFields = {
    ...(normalized.qualifications ? { qualifications: normalized.qualifications } : {}),
    ...(normalized.responsibilities ? { responsibilities: normalized.responsibilities } : {}),
    ...(normalized.incentives ? { incentives: normalized.incentives } : {}),
  };

  return {
    title: normalized.title,
    company: normalized.company || null,
    location: normalized.location || null,
    salaryText: normalized.salaryText || null,
    description: normalized.description || null,
    platform: normalized.platform || null,
    // Always include jsonLdFields — empty object signals "clear all" to the service layer
    jsonLdFields: Object.keys(jsonLdFields).length > 0 ? jsonLdFields : {},
  };
}

export function readJsonLdFieldsFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): ScrapedJobMetadata["jsonLdFields"] | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const raw = metadata.jsonLdFields;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const record = raw as Record<string, unknown>;
  const jsonLdFields = {
    ...(typeof record.qualifications === "string"
      ? { qualifications: record.qualifications }
      : {}),
    ...(typeof record.responsibilities === "string"
      ? { responsibilities: record.responsibilities }
      : {}),
    ...(typeof record.incentives === "string" ? { incentives: record.incentives } : {}),
  };
  return Object.keys(jsonLdFields).length > 0 ? jsonLdFields : undefined;
}

export function buildJobDetailDraftFromTrackerEntry(entry: {
  title: string;
  company: string | null;
  location: string | null;
  salaryText: string | null;
  description: string | null;
  platform: string | null;
  metadata: Record<string, unknown> | null;
}): JobDetailDraft {
  return buildJobDetailDraft({
    title: entry.title,
    company: entry.company,
    location: entry.location,
    salaryText: entry.salaryText,
    description: entry.description,
    platform: entry.platform,
    jsonLdFields: readJsonLdFieldsFromMetadata(entry.metadata),
  });
}
