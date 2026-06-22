import type { JobTrackerDetail } from "@/lib/job-tracker/types";

export function attachReviewDocumentsToDetail(
  entry: JobTrackerDetail,
  tailor: {
    coverLetter: string | null;
    resumeLatex: string | null;
    coverLetterLatex: string | null;
    updatedAt?: Date;
  } | null,
  previewError?: string | null,
): JobTrackerDetail {
  return {
    ...entry,
    reviewDocuments: {
      coverLetter: tailor?.coverLetter ?? null,
      resumeLatex: tailor?.resumeLatex ?? null,
      coverLetterLatex: tailor?.coverLetterLatex ?? null,
      documentsUpdatedAt: tailor?.updatedAt?.toISOString() ?? entry.updatedAt,
    },
    previewError: previewError ?? null,
  };
}
