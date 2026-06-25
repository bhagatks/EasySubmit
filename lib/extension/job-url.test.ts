import { describe, expect, it } from "vitest";
import { canonicalizeJobUrl, jobUrlsMatch } from "@/src/shared/extension/job-url";

describe("shared job-url canonicalize", () => {
  it("matches Workday URLs across source tracking params", () => {
    const a =
      "https://irhythmtech.wd5.myworkdayjobs.com/iRhythm/job/Remote---US/Role_JR1346?source=LinkedIn";
    const b =
      "https://irhythmtech.wd5.myworkdayjobs.com/iRhythm/job/Remote---US/Role_JR1346";
    expect(jobUrlsMatch(a, b)).toBe(true);
    expect(canonicalizeJobUrl(a)).toBe(canonicalizeJobUrl(b));
  });
});
