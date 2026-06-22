import { describe, expect, it } from "vitest";
import { attachReviewDocumentsToDetail } from "@/lib/job-tracker/review-documents-map";
import type { JobTrackerDetail } from "@/lib/job-tracker/types";

function minimalEntry(): JobTrackerDetail {
  return {
    id: "job-1",
    title: "Engineer",
    company: "Acme",
    location: null,
    salaryText: null,
    status: "RESUME_READY",
    platform: null,
    canonicalUrl: "https://example.com/job",
    savedAt: "2026-01-01T00:00:00.000Z",
    appliedAt: null,
    description: null,
    notes: null,
    metadata: null,
    updatedAt: "2026-01-02T00:00:00.000Z",
    hasTailoredResume: true,
    sourceProfileId: null,
    sourceProfileName: null,
    tailoredResumePreview: null,
  };
}

describe("attachReviewDocumentsToDetail", () => {
  it("maps tailor document fields onto entry", () => {
    const updated = attachReviewDocumentsToDetail(
      minimalEntry(),
      {
        coverLetter: "Dear team",
        resumeLatex: "\\begin{document}\\end{document}",
        coverLetterLatex: null,
        updatedAt: new Date("2026-06-22T10:00:00.000Z"),
      },
      null,
    );

    expect(updated.reviewDocuments).toEqual({
      coverLetter: "Dear team",
      resumeLatex: "\\begin{document}\\end{document}",
      coverLetterLatex: null,
      documentsUpdatedAt: "2026-06-22T10:00:00.000Z",
    });
    expect(updated.previewError).toBeNull();
  });

  it("nulls documents when tailor missing and surfaces preview error", () => {
    const updated = attachReviewDocumentsToDetail(
      minimalEntry(),
      null,
      "Merge failed",
    );

    expect(updated.reviewDocuments?.coverLetter).toBeNull();
    expect(updated.previewError).toBe("Merge failed");
    expect(updated.reviewDocuments?.documentsUpdatedAt).toBe("2026-01-02T00:00:00.000Z");
  });
});
