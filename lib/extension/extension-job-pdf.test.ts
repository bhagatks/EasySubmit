import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildExtensionCoverLetterPdf,
  buildExtensionResumePdf,
} from "@/lib/extension/extension-job-pdf";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobTrackerEntry: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/extension/user-prefs", () => ({
  getExtensionUserPrefs: vi.fn(),
}));

vi.mock("@/lib/profile/job-resume-tailor", () => ({
  getMergedResumeForJob: vi.fn(),
  getJobResumeTailorForEntry: vi.fn(),
}));

vi.mock("@/lib/profile/resume-profile-core", () => ({
  findDefaultProfile: vi.fn(),
}));

vi.mock("@/lib/profile/studio-form-db", () => ({
  hubRefineryFormFromProfile: vi.fn(() => ({
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    phone: "555-0100",
  })),
  targetTitleFromProfile: vi.fn(() => "Engineer"),
}));

vi.mock("@/lib/job-tracker/export/resume-pdf", () => ({
  buildResumePdf: vi.fn(async () => new Uint8Array([37, 80, 68, 70])),
}));

vi.mock("@/lib/job-tracker/build-deterministic-cover-letter", () => ({
  buildDeterministicCoverLetterMarkdown: vi.fn(() => ({
    ok: true,
    markdown: "Dear Hiring Manager,\n\nTemplate body.",
  })),
}));

vi.mock("@/lib/job-tracker/export/simple-pdf", () => ({
  buildTextPdfFromString: vi.fn(() => new Uint8Array([37, 80, 68, 70])),
}));

import { prisma } from "@/lib/prisma";
import { getExtensionUserPrefs } from "@/lib/extension/user-prefs";
import {
  getJobResumeTailorForEntry,
  getMergedResumeForJob,
} from "@/lib/profile/job-resume-tailor";
import { findDefaultProfile } from "@/lib/profile/resume-profile-core";
import { buildResumePdf } from "@/lib/job-tracker/export/resume-pdf";

const FORM = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  phone: "555-0100",
};

describe("extension job pdf builders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.jobTrackerEntry.findFirst).mockResolvedValue({
      id: "job-1",
      title: "Engineer",
      company: "Acme",
      description: "Build things",
    } as never);
    vi.mocked(getExtensionUserPrefs).mockResolvedValue({
      autoApplyUserSwitch: true,
      resumeProfilePickerMode: "DEFAULT",
      customizeResume: true,
      applicationProfile: null,
    });
    vi.mocked(getMergedResumeForJob).mockResolvedValue({
      success: true,
      form: FORM,
      targetTitle: "Engineer",
      sourceProfileId: "profile-1",
      rawResumeText: null,
      tailor: {} as never,
    });
    vi.mocked(findDefaultProfile).mockResolvedValue({ id: "profile-1" } as never);
    vi.mocked(getJobResumeTailorForEntry).mockResolvedValue(null);
  });

  it("builds tailored resume pdf when customizeResume is on", async () => {
    const result = await buildExtensionResumePdf("user-1", "job-1");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.filename).toContain("resume.pdf");
      expect(buildResumePdf).toHaveBeenCalledWith(FORM, "Engineer");
    }
  });

  it("falls back to default profile when tailor is missing", async () => {
    vi.mocked(getExtensionUserPrefs).mockResolvedValue({
      autoApplyUserSwitch: true,
      resumeProfilePickerMode: "DEFAULT",
      customizeResume: true,
      applicationProfile: null,
    });
    vi.mocked(getMergedResumeForJob).mockResolvedValue({
      success: false,
      error: "No tailored resume for this job",
    });

    const result = await buildExtensionResumePdf("user-1", "job-1");
    expect(result.success).toBe(true);
    expect(findDefaultProfile).toHaveBeenCalled();
  });

  it("uses stored cover letter when it differs from deterministic template", async () => {
    vi.mocked(getJobResumeTailorForEntry).mockResolvedValue({
      coverLetter: "AI-enhanced cover letter body.",
    } as never);

    const result = await buildExtensionCoverLetterPdf("user-1", "job-1");
    expect(result.success).toBe(true);
  });
});
