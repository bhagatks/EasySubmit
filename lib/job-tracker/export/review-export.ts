import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import {
  buildCoverLetterHtml,
  buildCoverLetterPlainText,
  type CoverLetterContext,
} from "@/lib/job-tracker/cover-letter";
import { reviewExportFilename } from "@/lib/job-tracker/export/export-filename";
import { buildTextPdfFromString } from "@/lib/job-tracker/export/simple-pdf";
import { resumeHasExportableContent } from "@/lib/job-tracker/export/resume-plain-text";
import { buildResumeDocx } from "@/lib/job-tracker/export/resume-docx";
import { buildResumePdf } from "@/lib/job-tracker/export/resume-pdf";
import { buildWordBlobFromHtml } from "@/lib/job-tracker/export/word-html";
import {
  canExportReviewDocument,
  type ReviewDocumentKind,
  type ReviewExportFormat,
} from "@/lib/job-tracker/review-readiness";

export type ReviewExportInput = {
  kind: ReviewDocumentKind;
  format: ReviewExportFormat;
  company: string | null;
  jobTitle: string;
  hasTailoredResume: boolean;
  status: import("@/lib/generated/prisma/client").JobTrackerStatus;
  form?: HubRefineryForm;
  targetTitle?: string;
  coverContext?: CoverLetterContext;
};

export type ReviewExportResult =
  | {
      success: true;
      filename: string;
      mimeType: string;
      bytes: Uint8Array;
    }
  | { success: false; error: string; code?: "not_ready" | "invalid_kind" };

export async function buildReviewExport(
  input: ReviewExportInput,
): Promise<ReviewExportResult> {
  const coverLetter = input.coverContext?.body ?? null;
  const resumeHasContent =
    input.form && input.targetTitle
      ? resumeHasExportableContent(input.form, input.targetTitle)
      : false;

  if (
    !canExportReviewDocument({
      kind: input.kind,
      hasTailoredResume: input.hasTailoredResume,
      status: input.status,
      resumeHasContent,
      coverLetter,
    })
  ) {
    return {
      success: false,
      error:
        input.kind === "cover"
          ? "Add a cover letter before exporting."
          : "Resume is not ready to export yet.",
      code: "not_ready",
    };
  }

  const filename = reviewExportFilename({
    company: input.company,
    jobTitle: input.jobTitle,
    kind: input.kind,
    format: input.format,
  });

  // ── Resume exports ──────────────────────────────────────────────────────────
  if (input.kind === "resume") {
    if (!input.form || !input.targetTitle) {
      return { success: false, error: "Resume data missing.", code: "not_ready" };
    }

    if (input.format === "pdf") {
      const bytes = await buildResumePdf(input.form, input.targetTitle);
      return { success: true, filename, mimeType: "application/pdf", bytes };
    }

    // Word — real docx with heading styles, real bullets, tab-stop dates
    const bytes = await buildResumeDocx(input.form, input.targetTitle);
    return {
      success: true,
      filename,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      bytes,
    };
  }

  // ── Cover letter exports ────────────────────────────────────────────────────
  if (!input.coverContext) {
    return { success: false, error: "Cover letter data missing.", code: "not_ready" };
  }

  const plain = buildCoverLetterPlainText(input.coverContext);

  if (input.format === "pdf") {
    return {
      success: true,
      filename,
      mimeType: "application/pdf",
      bytes: buildTextPdfFromString(plain, `Cover — ${input.jobTitle}`),
    };
  }

  const html = buildCoverLetterHtml(input.coverContext, { includeToolbarSpacer: false });
  const bodyHtml =
    html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1]?.trim() ?? `<pre>${plain}</pre>`;
  return {
    success: true,
    filename,
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    bytes: buildWordBlobFromHtml(`Cover — ${input.jobTitle}`, bodyHtml),
  };
}
