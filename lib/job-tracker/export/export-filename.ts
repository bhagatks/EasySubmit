import type { ReviewDocumentKind } from "@/lib/job-tracker/review-readiness";
import type { ReviewExportFormat } from "@/lib/job-tracker/review-readiness";

/** Per-segment and total caps when building download filenames. */
export const EXPORT_FILENAME_LIMITS = {
  firstName: 24,
  company: 32,
  role: 48,
  totalBasename: 120,
} as const;

function slugPart(
  value: string | null | undefined,
  fallback: string,
  maxLen: number,
): string {
  const base = (value?.trim() || fallback)
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, maxLen);
  return base || fallback.slice(0, maxLen);
}

function buildBasename(input: {
  firstName: string;
  docKind: "resume" | "cover_letter";
  company: string;
  role: string;
}): string {
  const limits = EXPORT_FILENAME_LIMITS;
  const first = slugPart(input.firstName, "Applicant", limits.firstName);
  let company = slugPart(input.company, "Company", limits.company);
  let role = slugPart(input.role, "Role", limits.role);
  const docKind = input.docKind;

  let base = `${first}_${docKind}_${company}_${role}`;

  while (base.length > limits.totalBasename && role.length > 4) {
    role = role.slice(0, -1).replace(/_+$/, "");
    base = `${first}_${docKind}_${company}_${role}`;
  }
  while (base.length > limits.totalBasename && company.length > 4) {
    company = company.slice(0, -1).replace(/_+$/, "");
    base = `${first}_${docKind}_${company}_${role}`;
  }

  if (base.length > limits.totalBasename) {
    base = base.slice(0, limits.totalBasename).replace(/_+$/, "");
  }

  return base;
}

export function reviewExportFilename(input: {
  firstName?: string | null;
  company: string | null;
  jobTitle: string;
  kind: ReviewDocumentKind;
  format: ReviewExportFormat;
}): string {
  const docKind = input.kind === "resume" ? "resume" : "cover_letter";
  const basename = buildBasename({
    firstName: input.firstName ?? "",
    docKind,
    company: input.company ?? "",
    role: input.jobTitle,
  });
  const ext = input.format === "pdf" ? "pdf" : "docx";
  return `${basename}.${ext}`;
}
