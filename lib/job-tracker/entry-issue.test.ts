import { describe, expect, it } from "vitest";
import { entryIssueMessage } from "@/lib/job-tracker/entry-issue";

describe("entry-issue", () => {
  it("returns null for complete capture", () => {
    expect(
      entryIssueMessage({
        url: "https://jobs.example.com/job/1",
        title: "Engineer",
        company: "Acme",
        location: "Remote",
        salaryText: "$100k",
        description: "x".repeat(500),
        platform: "workday",
        metadata: null,
      }),
    ).toBeNull();
  });

  it("surfaces capture gaps for critical fields without optional noise", () => {
    expect(
      entryIssueMessage({
        url: "https://jobs.example.com/job/1",
        title: "Engineer",
        company: null,
        location: null,
        salaryText: null,
        description: "x".repeat(500),
        platform: "workday",
        metadata: null,
      }),
    ).toBe("Capture gap: Company");
  });

  it("surfaces metadata errors before capture gaps", () => {
    expect(
      entryIssueMessage({
        url: "https://jobs.example.com/job/1",
        title: "Engineer",
        company: "Acme",
        location: null,
        salaryText: null,
        description: "x".repeat(500),
        platform: "workday",
        metadata: { lastError: "Tailor failed" },
      }),
    ).toBe("Tailor failed");
  });
});
