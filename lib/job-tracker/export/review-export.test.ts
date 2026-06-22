import { describe, expect, it } from "vitest";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";
import { buildCoverLetterContext, buildCoverLetterPlainText } from "@/lib/job-tracker/cover-letter";
import { buildReviewExport } from "@/lib/job-tracker/export/review-export";

function sampleForm() {
  return {
    ...emptyHubRefineryForm(),
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    professionalSummary: "Algorithm designer.",
    experience: [
      {
        id: "1",
        hidden: false,
        title: "Engineer",
        company: "Acme",
        location: "",
        startMonth: "",
        startYear: "",
        endMonth: "",
        endYear: "",
        bullets: "- Built systems",
      },
    ],
  };
}

describe("buildReviewExport", () => {
  it("returns not_ready when resume export blocked", async () => {
    const result = await buildReviewExport({
      kind: "resume",
      format: "pdf",
      company: "Acme",
      jobTitle: "Engineer",
      hasTailoredResume: false,
      status: "CAPTURED",
      form: sampleForm(),
      targetTitle: "Senior Engineer",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("not_ready");
      expect(result.error).toMatch(/not ready/i);
    }
  });

  it("builds resume PDF when ready", async () => {
    const result = await buildReviewExport({
      kind: "resume",
      format: "pdf",
      company: "Acme Corp",
      jobTitle: "Engineer",
      hasTailoredResume: true,
      status: "RESUME_READY",
      form: sampleForm(),
      targetTitle: "Senior Engineer",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.filename).toMatch(/Acme_Corp_Engineer_resume\.pdf$/);
      expect(result.mimeType).toBe("application/pdf");
      expect(result.bytes.length).toBeGreaterThan(100);
      const header = new TextDecoder().decode(result.bytes.slice(0, 8));
      expect(header).toMatch(/^%PDF-1\./);
    }
  });

  it("builds resume Word doc as docx bytes", async () => {
    const result = await buildReviewExport({
      kind: "resume",
      format: "word",
      company: null,
      jobTitle: "Engineer",
      hasTailoredResume: true,
      status: "READY_TO_APPLY",
      form: sampleForm(),
      targetTitle: "Senior Engineer",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.filename).toMatch(/\.doc$/);
      expect(result.mimeType).toBe(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
      const header = new TextDecoder().decode(result.bytes.slice(0, 2));
      expect(header).toBe("PK");
    }
  });

  it("blocks cover export without body", async () => {
    const result = await buildReviewExport({
      kind: "cover",
      format: "pdf",
      company: "Acme",
      jobTitle: "Engineer",
      hasTailoredResume: true,
      status: "RESUME_READY",
      coverContext: buildCoverLetterContext({
        jobTitle: "Engineer",
        company: "Acme",
        body: "   ",
      }),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/cover letter/i);
    }
  });

  it("builds cover Word export with HTML body", async () => {
    const coverContext = buildCoverLetterContext({
      firstName: "Ada",
      lastName: "Lovelace",
      jobTitle: "Engineer",
      company: "Acme",
      body: "I am excited to apply.",
    });

    const result = await buildReviewExport({
      kind: "cover",
      format: "word",
      company: "Acme",
      jobTitle: "Engineer",
      hasTailoredResume: false,
      status: "CAPTURED",
      coverContext,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      const html = new TextDecoder().decode(result.bytes);
      expect(html).toContain("I am excited to apply.");
      expect(html).not.toContain("toolbar-spacer");
    }
  });

  it("builds cover PDF with letterhead text", async () => {
    const coverContext = buildCoverLetterContext({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      jobTitle: "Engineer",
      company: "Acme",
      body: "Dear hiring team,\n\nI am excited to apply.",
    });

    const result = await buildReviewExport({
      kind: "cover",
      format: "pdf",
      company: "Acme",
      jobTitle: "Engineer",
      hasTailoredResume: true,
      status: "RESUME_READY",
      coverContext,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      const pdfText = new TextDecoder().decode(result.bytes);
      expect(pdfText).toMatch(/%PDF-1\./);
      const plain = buildCoverLetterPlainText(coverContext);
      expect(plain).toContain("Ada Lovelace");
      expect(plain).toContain("Acme");
    }
  });

  it("blocks resume export when target title exists but form missing", async () => {
    const result = await buildReviewExport({
      kind: "resume",
      format: "pdf",
      company: "Acme",
      jobTitle: "Engineer",
      hasTailoredResume: true,
      status: "RESUME_READY",
      targetTitle: "Senior Engineer",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("not_ready");
      expect(result.error).toMatch(/not ready/i);
    }
  });
});
