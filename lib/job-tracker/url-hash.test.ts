import { describe, expect, it } from "vitest";
import { canonicalizeJobUrl, hashJobUrl } from "@/lib/job-tracker/url-hash";

const I_RHYTHM_WITH_SOURCE =
  "https://irhythmtech.wd5.myworkdayjobs.com/iRhythm/job/Remote---US/Sr-Manager--Software-Engineering_JR1346?source=LinkedIn";

const I_RHYTHM_CLEAN =
  "https://irhythmtech.wd5.myworkdayjobs.com/iRhythm/job/Remote---US/Sr-Manager--Software-Engineering_JR1346";

describe("canonicalizeJobUrl", () => {
  it("strips utm params and trailing slash", () => {
    const canonical = canonicalizeJobUrl(
      "https://boards.greenhouse.io/acme/jobs/123?utm_source=linkedin/",
    );
    expect(canonical).toBe("https://boards.greenhouse.io/acme/jobs/123");
  });

  it("strips Workday source=LinkedIn so delete/status lookup matches saved row", () => {
    expect(canonicalizeJobUrl(I_RHYTHM_WITH_SOURCE)).toBe(I_RHYTHM_CLEAN);
    expect(hashJobUrl(canonicalizeJobUrl(I_RHYTHM_WITH_SOURCE))).toBe(
      hashJobUrl(canonicalizeJobUrl(I_RHYTHM_CLEAN)),
    );
  });

  it("strips gh_src but keeps gh_jid for embedded Greenhouse postings", () => {
    const withTracking =
      "https://www.suvoda.com/careers/job-openings?gh_jid=8521135002&gh_src=abc";
    expect(canonicalizeJobUrl(withTracking)).toBe(
      "https://www.suvoda.com/careers/job-openings?gh_jid=8521135002",
    );
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
