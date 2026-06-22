import type { JobTrackerStatus } from "@/lib/generated/prisma/client";

const RESUME_READY_STATUSES: JobTrackerStatus[] = [
  "RESUME_READY",
  "READY_TO_APPLY",
  "APPLIED",
  "INTERVIEW",
  "OFFER",
];

export function isResumeReviewReady(
  hasTailoredResume: boolean,
  status: JobTrackerStatus,
): boolean {
  return hasTailoredResume && RESUME_READY_STATUSES.includes(status);
}

export type ReviewDocumentKind = "resume" | "cover";

export type ReviewExportFormat = "pdf" | "word";

export function canExportReviewDocument(input: {
  kind: ReviewDocumentKind;
  hasTailoredResume: boolean;
  status: JobTrackerStatus;
  resumeHasContent: boolean;
  coverLetter: string | null;
}): boolean {
  if (input.kind === "resume") {
    return (
      isResumeReviewReady(input.hasTailoredResume, input.status) && input.resumeHasContent
    );
  }
  return Boolean(input.coverLetter?.trim());
}

export function canOpenLatexEditor(input: {
  kind: ReviewDocumentKind;
  hasTailoredResume: boolean;
  status: JobTrackerStatus;
}): boolean {
  if (input.kind === "resume") {
    return isResumeReviewReady(input.hasTailoredResume, input.status);
  }
  return true;
}
