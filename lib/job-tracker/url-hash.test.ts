import { describe, expect, it } from "vitest";
import { canonicalizeJobUrl, hashJobUrl } from "@/lib/job-tracker/url-hash";

describe("canonicalizeJobUrl", () => {
  it("strips utm params and trailing slash", () => {
    const canonical = canonicalizeJobUrl(
      "https://boards.greenhouse.io/acme/jobs/123?utm_source=linkedin/",
    );
    expect(canonical).toBe("https://boards.greenhouse.io/acme/jobs/123");
  });

  it("hashes canonical urls consistently", () => {
    const url = "https://www.linkedin.com/jobs/view/12345";
    expect(hashJobUrl(canonicalizeJobUrl(url))).toHaveLength(64);
  });

  it("strips Workday apply-step suffix for deduplication", () => {
    const posting = canonicalizeJobUrl(
      "https://cvshealth.wd1.myworkdayjobs.com/CVS/job/TX/Role_R123",
    );
    const applyStep = canonicalizeJobUrl(
      "https://cvshealth.wd1.myworkdayjobs.com/CVS/job/TX/Role_R123/apply",
    );
    expect(posting).toBe(applyStep);
  });
});
