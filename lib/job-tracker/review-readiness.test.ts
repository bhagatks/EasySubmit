import { describe, expect, it } from "vitest";
import {
  canExportReviewDocument,
  canOpenLatexEditor,
  isResumeReviewReady,
} from "@/lib/job-tracker/review-readiness";

describe("isResumeReviewReady", () => {
  it("requires tailored resume and post-tailor status", () => {
    expect(isResumeReviewReady(true, "RESUME_READY")).toBe(true);
    expect(isResumeReviewReady(true, "READY_TO_APPLY")).toBe(true);
    expect(isResumeReviewReady(true, "APPLIED")).toBe(true);
    expect(isResumeReviewReady(true, "INTERVIEW")).toBe(true);
    expect(isResumeReviewReady(true, "OFFER")).toBe(true);
  });

  it("blocks when tailor missing or status too early", () => {
    expect(isResumeReviewReady(false, "RESUME_READY")).toBe(false);
    expect(isResumeReviewReady(true, "CAPTURED")).toBe(false);
    expect(isResumeReviewReady(true, "TAILORING")).toBe(false);
  });
});

describe("canExportReviewDocument", () => {
  it("allows resume export when ready and has content", () => {
    expect(
      canExportReviewDocument({
        kind: "resume",
        hasTailoredResume: true,
        status: "RESUME_READY",
        resumeHasContent: true,
        coverLetter: null,
      }),
    ).toBe(true);
  });

  it("blocks resume export without content", () => {
    expect(
      canExportReviewDocument({
        kind: "resume",
        hasTailoredResume: true,
        status: "RESUME_READY",
        resumeHasContent: false,
        coverLetter: null,
      }),
    ).toBe(false);
  });

  it("allows cover export when body exists regardless of tailor status", () => {
    expect(
      canExportReviewDocument({
        kind: "cover",
        hasTailoredResume: false,
        status: "CAPTURED",
        resumeHasContent: false,
        coverLetter: "Dear team,\n\nI am interested.",
      }),
    ).toBe(true);
  });

  it("blocks cover export for whitespace-only body", () => {
    expect(
      canExportReviewDocument({
        kind: "cover",
        hasTailoredResume: true,
        status: "RESUME_READY",
        resumeHasContent: true,
        coverLetter: "   \n  ",
      }),
    ).toBe(false);
  });
});

describe("canOpenLatexEditor", () => {
  it("gates resume LaTeX on review readiness", () => {
    expect(
      canOpenLatexEditor({
        kind: "resume",
        hasTailoredResume: true,
        status: "READY_TO_APPLY",
      }),
    ).toBe(true);
    expect(
      canOpenLatexEditor({
        kind: "resume",
        hasTailoredResume: false,
        status: "READY_TO_APPLY",
      }),
    ).toBe(false);
  });

  it("always allows cover LaTeX editor", () => {
    expect(
      canOpenLatexEditor({
        kind: "cover",
        hasTailoredResume: false,
        status: "CAPTURED",
      }),
    ).toBe(true);
  });
});
