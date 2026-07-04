import { describe, expect, it } from "vitest";
import { segmentJobDescription } from "@/lib/job-tracker/jd/jd-segmenter";

describe("segmentJobDescription", () => {
  it("detects Workday Job Description header into responsibilities", () => {
    const jd = [
      "Job Description",
      "Note: Fidelity will not provide immigration sponsorship.",
      "In this leadership role, you will drive data architecture strategy.",
      "",
      "Qualifications",
      "- 10+ years experience",
    ].join("\n");
    const result = segmentJobDescription(jd);
    expect(result.responsibilities).toMatch(/leadership role/i);
    expect(result.requirements).toContain("10+ years");
  });
});
