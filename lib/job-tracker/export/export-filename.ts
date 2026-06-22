import type { ReviewDocumentKind } from "@/lib/job-tracker/review-readiness";
import type { ReviewExportFormat } from "@/lib/job-tracker/review-readiness";

function slugPart(value: string | null | undefined, fallback: string): string {
  const base = (value?.trim() || fallback)
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 48);
  return base || fallback;
}

export function reviewExportFilename(input: {
  company: string | null;
  jobTitle: string;
  kind: ReviewDocumentKind;
  format: ReviewExportFormat;
}): string {
  const company = slugPart(input.company, "Company");
  const role = slugPart(input.jobTitle, "Role");
  const doc = input.kind === "resume" ? "resume" : "cover_letter";
  const ext = input.format === "pdf" ? "pdf" : "doc";
  return `${company}_${role}_${doc}.${ext}`;
}
