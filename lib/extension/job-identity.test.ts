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
});
