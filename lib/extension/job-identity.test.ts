import { describe, expect, it } from "vitest";
import { resolveJobIdentity } from "@/src/shared/extension/job-identity";

describe("resolveJobIdentity", () => {
  it("prefers scraped title", () => {
    const identity = resolveJobIdentity({
      url: "https://jobs.example.com/job/123",
      title: "Software Engineer",
      company: "Acme",
      description: "x".repeat(200),
    });
    expect(identity.title).toBe("Software Engineer");
    expect(identity.titleSource).toBe("scrape");
  });

  it("falls back to url slug", () => {
    const identity = resolveJobIdentity({
      url: "https://acme.myworkdayjobs.com/job/senior-engineer",
      title: "",
      company: null,
      description: "x".repeat(200),
    });
    expect(identity.title.toLowerCase()).toContain("senior");
    expect(identity.titleSource).toBe("url_slug");
  });

  it("resolves Workday company from career site path when scrape missed company", () => {
    const identity = resolveJobIdentity({
      url: "https://irhythmtech.wd5.myworkdayjobs.com/iRhythm/job/Remote---US/Sr-Manager--Software-Engineering_JR1346",
      title: "Sr Manager, Software Engineering",
      company: null,
      description: "x".repeat(200),
    });
    expect(identity.company).toBe("iRhythm");
    expect(identity.companySource).toBe("workday_url");
  });

  it("ignores generic navigation titles like Jobs", () => {
    const identity = resolveJobIdentity({
      url: "https://www.linkedin.com/jobs/view/12345",
      title: "Jobs",
      company: "Acme",
      description: "Software Engineer\n".repeat(20),
    });
    expect(identity.title).not.toBe("Jobs");
    expect(identity.titleSource).not.toBe("scrape");
  });
});
