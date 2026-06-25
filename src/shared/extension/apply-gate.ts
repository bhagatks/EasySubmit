export const APPLY_JD_MIN_CHARS = 120;

export type ApplyCaptureInput = {
  url?: string | null;
  description?: string | null;
};

export function canApplyCapture(input: ApplyCaptureInput): boolean {
  const url = input.url?.trim() ?? "";
  const descriptionLength = input.description?.trim().length ?? 0;
  return url.length > 0 && descriptionLength >= APPLY_JD_MIN_CHARS;
}

export function applyCaptureBlockReason(input: ApplyCaptureInput): string | null {
  if (canApplyCapture(input)) return null;
  const url = input.url?.trim() ?? "";
  const descriptionLength = input.description?.trim().length ?? 0;
  if (!url) return "Add a job URL to continue.";
  if (descriptionLength < APPLY_JD_MIN_CHARS) {
    return `Add a job description (at least ${APPLY_JD_MIN_CHARS} characters).`;
  }
  return "Add job details to continue.";
}
