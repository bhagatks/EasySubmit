export const APPLY_JD_MIN_CHARS = 120;
export const MANUAL_CAPTURE_TITLE_MIN_CHARS = 2;
export const DASHBOARD_MANUAL_PLACEHOLDER_URL_PREFIX = "easysubmit://dashboard-manual/";

export type ApplyCaptureInput = {
  url?: string | null;
  description?: string | null;
};

export type ManualCaptureInput = ApplyCaptureInput & {
  title?: string | null;
};

/** True when the URL can open a live job posting (http/https, not a dashboard placeholder). */
export function isApplyJobUrl(url: string | null | undefined): boolean {
  const trimmed = url?.trim() ?? "";
  if (!trimmed || trimmed.startsWith(DASHBOARD_MANUAL_PLACEHOLDER_URL_PREFIX)) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function buildDashboardManualPlaceholderUrl(): string {
  return `${DASHBOARD_MANUAL_PLACEHOLDER_URL_PREFIX}${crypto.randomUUID()}`;
}

export function canApplyCapture(input: ApplyCaptureInput): boolean {
  const descriptionLength = input.description?.trim().length ?? 0;
  return isApplyJobUrl(input.url) && descriptionLength >= APPLY_JD_MIN_CHARS;
}

export function canManualCaptureSave(input: ManualCaptureInput): boolean {
  const title = input.title?.trim() ?? "";
  return canApplyCapture(input) && title.length >= MANUAL_CAPTURE_TITLE_MIN_CHARS;
}

/** Dashboard Add job — URL optional; title + description required for resume tailoring. */
export function canDashboardManualJobSave(input: ManualCaptureInput): boolean {
  const title = input.title?.trim() ?? "";
  const descriptionLength = input.description?.trim().length ?? 0;
  return title.length >= MANUAL_CAPTURE_TITLE_MIN_CHARS && descriptionLength >= APPLY_JD_MIN_CHARS;
}

export function applyCaptureBlockReason(input: ApplyCaptureInput): string | null {
  if (canApplyCapture(input)) return null;
  const descriptionLength = input.description?.trim().length ?? 0;
  if (!isApplyJobUrl(input.url)) return "Add a job URL to continue.";
  if (descriptionLength < APPLY_JD_MIN_CHARS) {
    return `Add a job description (at least ${APPLY_JD_MIN_CHARS} characters).`;
  }
  return "Add job details to continue.";
}

export function manualCaptureBlockReason(input: ManualCaptureInput): string | null {
  const base = applyCaptureBlockReason(input);
  if (base) return base;
  const title = input.title?.trim() ?? "";
  if (title.length < MANUAL_CAPTURE_TITLE_MIN_CHARS) {
    return "Add a role title to continue.";
  }
  return null;
}

export function dashboardManualJobBlockReason(input: ManualCaptureInput): string | null {
  const url = input.url?.trim() ?? "";
  if (url && !isApplyJobUrl(url)) {
    return "Enter a valid job posting URL, or leave it blank and fill in the fields below.";
  }
  const descriptionLength = input.description?.trim().length ?? 0;
  if (descriptionLength < APPLY_JD_MIN_CHARS) {
    return `Add a job description (at least ${APPLY_JD_MIN_CHARS} characters).`;
  }
  const title = input.title?.trim() ?? "";
  if (title.length < MANUAL_CAPTURE_TITLE_MIN_CHARS) {
    return "Add a role title to continue.";
  }
  return null;
}
