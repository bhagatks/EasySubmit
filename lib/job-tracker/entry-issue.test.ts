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
        url: "https://boards.greenhouse.io/acme/jobs/12345",
        title: "Engineer",
        company: null,
        location: null,
        salaryText: null,
        description: "x".repeat(500),
        platform: "greenhouse",
        metadata: null,
      }),
    ).toBe("Capture gap: Company");
  });

  it("clears company gap when host resolves for embedded Greenhouse careers URLs", () => {
    expect(
      entryIssueMessage({
        url: "https://www.suvoda.com/careers/job-openings?gh_jid=8521135002",
        title: "Software Engineer",
        company: null,
        location: null,
        salaryText: null,
        description: "x".repeat(500),
        platform: "greenhouse",
        metadata: null,
      }),
    ).toBeNull();
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
