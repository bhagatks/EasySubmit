export type CaptureFieldId =
  | "url"
  | "title"
  | "description"
  | "company"
  | "location"
  | "salaryText"
  | "platform";

export type CaptureFieldTier = "required" | "critical" | "optional";

export type CaptureFieldConfig = {
  label: string;
  tier: CaptureFieldTier;
};

/** Required = save prerequisites. Critical = product defect if missing. Optional = enrich only. */
export const CAPTURE_FIELD_CONFIG: Record<CaptureFieldId, CaptureFieldConfig> = {
  url: { label: "URL", tier: "required" },
  title: { label: "Title", tier: "required" },
  description: { label: "Job description", tier: "required" },
  company: { label: "Company", tier: "critical" },
  location: { label: "Location", tier: "optional" },
  salaryText: { label: "Salary", tier: "optional" },
  platform: { label: "Platform", tier: "optional" },
};

export type CaptureCompletenessLevel = "complete" | "partial" | "gap";

export type CaptureCompleteness = {
  level: CaptureCompletenessLevel;
  /** Required or critical fields that are missing — non-blocking defects. */
  missingBlockingQuality: string[];
  /** Optional fields missing — logged only. */
  missingOptional: string[];
  /** @deprecated use missingBlockingQuality + missingOptional */
  missing: string[];
  confidence: number | null;
};

export type AssessCaptureInput = {
  url?: string | null;
  title: string;
  company: string | null;
  location: string | null;
  salaryText: string | null;
  description: string | null;
  platform: string | null;
  metadata: Record<string, unknown> | null;
};

const JD_COMPLETE_MIN_CHARS = 400;
const JD_PRESENT_MIN_CHARS = 120;

function readConfidence(metadata: Record<string, unknown> | null): number | null {
  if (!metadata || typeof metadata.confidence !== "number") return null;
  if (!Number.isFinite(metadata.confidence)) return null;
  return metadata.confidence;
}

/** Adapters use 0–100; some legacy paths used 0–1. Normalize for display. */
export function formatScrapeConfidencePercent(confidence: number): number {
  if (!Number.isFinite(confidence)) return 0;
  if (confidence > 1) return Math.round(Math.min(100, confidence));
  return Math.round(confidence * 100);
}

function isPresent(value: string | null | undefined, minLen = 1): boolean {
  return (value?.trim().length ?? 0) >= minLen;
}

function fieldPresent(field: CaptureFieldId, input: AssessCaptureInput): boolean {
  switch (field) {
    case "url":
      return isPresent(input.url);
    case "title":
      return isPresent(input.title);
    case "description":
      return (input.description?.trim().length ?? 0) >= JD_PRESENT_MIN_CHARS;
    case "company":
      return isPresent(input.company);
    case "location":
      return isPresent(input.location);
    case "salaryText":
      return isPresent(input.salaryText);
    case "platform":
      return isPresent(input.platform);
  }
}

/** Assess captured job fields — gaps are defects, not save blockers. */
export function assessCaptureCompleteness(input: AssessCaptureInput): CaptureCompleteness {
  const missingBlockingQuality: string[] = [];
  const missingOptional: string[] = [];

  for (const [fieldId, config] of Object.entries(CAPTURE_FIELD_CONFIG) as Array<
    [CaptureFieldId, CaptureFieldConfig]
  >) {
    if (fieldPresent(fieldId, input)) continue;
    if (config.tier === "optional") {
      missingOptional.push(config.label);
    } else {
      missingBlockingQuality.push(config.label);
    }
  }

  const jdLength = input.description?.trim().length ?? 0;
  let level: CaptureCompletenessLevel = "complete";

  if (missingBlockingQuality.length > 0) {
    level = "gap";
  } else if (missingOptional.length > 0 || jdLength < JD_COMPLETE_MIN_CHARS) {
    level = "partial";
  }

  return {
    level,
    missingBlockingQuality,
    missingOptional,
    missing: [...missingBlockingQuality, ...missingOptional],
    confidence: readConfidence(input.metadata),
  };
}

export function captureCompletenessLabel(level: CaptureCompletenessLevel): string {
  switch (level) {
    case "complete":
      return "Capture looks complete";
    case "partial":
      return "Capture is usable — some optional fields missing";
    case "gap":
      return "Capture gap — saved, but key fields need attention";
  }
}

export type EntryIssueInput = AssessCaptureInput;

function readMetadataError(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;
  const lastError = metadata.lastError;
  if (typeof lastError === "string" && lastError.trim()) return lastError.trim();
  const pipelineError = metadata.pipelineError;
  if (typeof pipelineError === "string" && pipelineError.trim()) return pipelineError.trim();
  return null;
}

/**
 * User-visible tracker issue — pipeline failures or capture gaps (non-blocking).
 * Optional field gaps are not surfaced here (see capture diagnostics logs).
 */
export function entryIssueMessage(input: EntryIssueInput): string | null {
  const metadataError = readMetadataError(input.metadata);
  if (metadataError) return metadataError;

  const completeness = assessCaptureCompleteness(input);
  if (completeness.missingBlockingQuality.length === 0) {
    return null;
  }

  return `Capture gap: ${completeness.missingBlockingQuality.join(", ")}`;
}
