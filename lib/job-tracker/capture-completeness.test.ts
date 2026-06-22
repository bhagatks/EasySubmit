import { describe, expect, it } from "vitest";
import {
  assessCaptureCompleteness,
  formatScrapeConfidencePercent,
} from "@/lib/job-tracker/capture-completeness";

describe("formatScrapeConfidencePercent", () => {
  it("treats 0–1 scale as fractional", () => {
    expect(formatScrapeConfidencePercent(0.93)).toBe(93);
  });

  it("treats 0–100 adapter scores as already percent", () => {
    expect(formatScrapeConfidencePercent(93)).toBe(93);
  });
});

describe("assessCaptureCompleteness", () => {
  it("marks gap when required or critical fields are missing", () => {
    const result = assessCaptureCompleteness({
      url: "https://jobs.example.com/job/123",
      title: "Engineer",
      company: null,
      location: null,
      salaryText: null,
      description: "Short",
      platform: "generic",
      metadata: null,
    });

    expect(result.level).toBe("gap");
    expect(result.missingBlockingQuality).toEqual(
      expect.arrayContaining(["Company", "Job description"]),
    );
    expect(result.missingOptional).toEqual(
      expect.arrayContaining(["Location", "Salary"]),
    );
  });

  it("marks partial when only optional fields are missing", () => {
    const result = assessCaptureCompleteness({
      url: "https://jobs.example.com/job/123",
      title: "Engineer",
      company: "Acme",
      location: null,
      salaryText: null,
      description: "x".repeat(500),
      platform: "workday",
      metadata: { confidence: 0.9 },
    });

    expect(result.level).toBe("partial");
    expect(result.missingBlockingQuality).toHaveLength(0);
    expect(result.missingOptional.length).toBeGreaterThan(0);
  });

  it("marks complete when required, critical, and optional fields are present", () => {
    const result = assessCaptureCompleteness({
      url: "https://jobs.example.com/job/123",
      title: "Engineer",
      company: "Acme",
      location: "Remote",
      salaryText: "$120k",
      description: "x".repeat(500),
      platform: "workday",
      metadata: { confidence: 0.9 },
    });

    expect(result.level).toBe("complete");
    expect(result.missingBlockingQuality).toHaveLength(0);
    expect(result.missingOptional).toHaveLength(0);
  });
});
