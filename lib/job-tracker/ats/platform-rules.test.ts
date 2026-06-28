import { describe, expect, it } from "vitest";
import {
  detectPlatform,
  getPlatformRules,
} from "@/lib/job-tracker/ats/platform-rules";

describe("platform-rules", () => {
  it("detectPlatform resolves from job URL", () => {
    expect(detectPlatform("https://company.myworkdayjobs.com/en-US/job/123", null)).toBe(
      "workday",
    );
    expect(detectPlatform("https://boards.greenhouse.io/acme/jobs/1", null)).toBe("greenhouse");
    expect(detectPlatform("https://example.com/jobs/1", null)).toBe("unknown");
  });

  it("detectPlatform falls back to platform field", () => {
    expect(detectPlatform("https://example.com", "Greenhouse")).toBe("greenhouse");
    expect(detectPlatform("https://example.com", "LinkedIn")).toBe("unknown");
  });

  it("getPlatformRules returns rule metadata", () => {
    const rules = getPlatformRules("workday");
    expect(rules.label).toBe("Workday");
    expect(rules.preferredFormat).toBe("word");
    expect(rules.exactKeywordMatch).toBe(true);
    expect(rules.tip).toMatch(/Workday/i);
  });
});
