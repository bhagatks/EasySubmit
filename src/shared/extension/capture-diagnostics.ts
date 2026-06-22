import {
  CAPTURE_FIELD_CONFIG,
  assessCaptureCompleteness,
  type AssessCaptureInput,
  type CaptureFieldId,
  type CaptureFieldTier,
} from "./capture-fields";

export const JOB_CAPTURE_LOG_PREFIX = "[JobCapture]";

export type CaptureFieldDiagnostic = {
  field: CaptureFieldId;
  label: string;
  tier: CaptureFieldTier;
  present: boolean;
  /** Where the value came from, e.g. `dom:data-ph-at-id=job-company-name`. */
  source: string | null;
  /** Why capture failed for this field — for engineering logs. */
  gapReason: string | null;
};

export type CaptureDiagnostics = {
  capturedAt: string;
  url: string;
  platform: string | null;
  adapter: string | null;
  scrapePath: string | null;
  confidence: number | null;
  fields: CaptureFieldDiagnostic[];
  missingRequired: string[];
  missingCritical: string[];
  missingOptional: string[];
  enrichmentsApplied: string[];
  /** True when save succeeded despite gaps — customer flow not blocked. */
  nonBlocking: true;
};

export type BuildCaptureDiagnosticsInput = AssessCaptureInput & {
  adapter?: string | null;
  scrapePath?: string | null;
  enrichmentsApplied?: string[];
  fieldSources?: Partial<Record<CaptureFieldId, string>>;
};

function defaultGapReason(field: CaptureFieldId, tier: CaptureFieldTier, present: boolean): string | null {
  if (present) return null;
  if (field === "description") {
    return "description below minimum length or DOM selectors missed";
  }
  if (field === "company") {
    return "company DOM selectors missed; host/og:title fallbacks did not resolve";
  }
  if (tier === "optional") {
    return "optional field not present on page at capture time";
  }
  return `${field} not resolved during scrape`;
}

function inferFieldSource(
  field: CaptureFieldId,
  present: boolean,
  fieldSources?: Partial<Record<CaptureFieldId, string>>,
): string | null {
  if (fieldSources?.[field]) return fieldSources[field] ?? null;
  if (!present) return null;
  if (field === "url") return "input:url";
  if (field === "title") return "scrape:title";
  if (field === "platform") return "scrape:platform";
  return "scrape:dom-or-fallback";
}

export function buildCaptureDiagnostics(input: BuildCaptureDiagnosticsInput): CaptureDiagnostics {
  const completeness = assessCaptureCompleteness(input);
  const enrichmentsApplied = input.enrichmentsApplied ?? [];

  const fields: CaptureFieldDiagnostic[] = (
    Object.keys(CAPTURE_FIELD_CONFIG) as CaptureFieldId[]
  ).map((field) => {
    const config = CAPTURE_FIELD_CONFIG[field];
    const present =
      field === "url"
        ? Boolean(input.url?.trim())
        : field === "title"
          ? Boolean(input.title?.trim())
          : field === "description"
            ? (input.description?.trim().length ?? 0) >= 120
            : field === "company"
              ? Boolean(input.company?.trim())
              : field === "location"
                ? Boolean(input.location?.trim())
                : field === "salaryText"
                  ? Boolean(input.salaryText?.trim())
                  : Boolean(input.platform?.trim());

    return {
      field,
      label: config.label,
      tier: config.tier,
      present,
      source: inferFieldSource(field, present, input.fieldSources),
      gapReason: defaultGapReason(field, config.tier, present),
    };
  });

  const missingRequired = fields
    .filter((field) => field.tier === "required" && !field.present)
    .map((field) => field.label);
  const missingCritical = fields
    .filter((field) => field.tier === "critical" && !field.present)
    .map((field) => field.label);
  const missingOptional = fields
    .filter((field) => field.tier === "optional" && !field.present)
    .map((field) => field.label);

  return {
    capturedAt: new Date().toISOString(),
    url: input.url?.trim() ?? "",
    platform: input.platform?.trim() || null,
    adapter: input.adapter?.trim() || input.platform?.trim() || null,
    scrapePath: input.scrapePath?.trim() || null,
    confidence:
      typeof input.metadata?.confidence === "number" && Number.isFinite(input.metadata.confidence)
        ? input.metadata.confidence
        : null,
    fields,
    missingRequired,
    missingCritical,
    missingOptional,
    enrichmentsApplied,
    nonBlocking: true,
  };
}

export function logCaptureDiagnostics(
  diagnostics: CaptureDiagnostics,
  context?: { userId?: string; entryId?: string; phase?: "extension-save" | "server-save" | "assess" },
): void {
  const hasGap =
    diagnostics.missingRequired.length > 0 ||
    diagnostics.missingCritical.length > 0 ||
    diagnostics.missingOptional.length > 0;

  const payload = {
    ts: diagnostics.capturedAt,
    phase: context?.phase ?? "assess",
    userId: context?.userId ?? null,
    entryId: context?.entryId ?? null,
    url: diagnostics.url,
    platform: diagnostics.platform,
    adapter: diagnostics.adapter,
    scrapePath: diagnostics.scrapePath,
    confidence: diagnostics.confidence,
    missingRequired: diagnostics.missingRequired,
    missingCritical: diagnostics.missingCritical,
    missingOptional: diagnostics.missingOptional,
    enrichmentsApplied: diagnostics.enrichmentsApplied,
    nonBlocking: diagnostics.nonBlocking,
    fields: diagnostics.fields.filter((field) => !field.present),
  };

  if (hasGap) {
    console.warn(JOB_CAPTURE_LOG_PREFIX, payload);
  } else {
    console.info(JOB_CAPTURE_LOG_PREFIX, payload);
  }
}
