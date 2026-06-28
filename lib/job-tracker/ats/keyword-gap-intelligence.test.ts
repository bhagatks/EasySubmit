import { describe, expect, it } from "vitest";
import { analyzeKeywordGapFromIntelligence } from "@/lib/job-tracker/ats/keyword-gap";
import type { PrimeResumeData } from "@/components/onboarding/PrimeResume";

const PROC_RESUME: PrimeResumeData = {
  fullName: "Bhagath Siddi",
  email: "test@example.com",
  skills: [
    "Procurement",
    "Strategic Alliances",
    "Risk Management",
    "Regulatory Compliance",
    "FDA Regulations",
    "Cloud & DevOps",
  ],
  summary: "Engineering Manager with 20 years leading platform organizations.",
  experience: [
    {
      title: "Head of Engineering",
      company: "7-Eleven",
      bullets: ["Led platform delivery."],
    },
  ],
};

describe("analyzeKeywordGapFromIntelligence phrase matching", () => {
  it("detects compound skills present in skills section", () => {
    const gap = analyzeKeywordGapFromIntelligence(
      PROC_RESUME,
      {
        tier1Keywords: [
          "strategic alliances",
          "risk management",
          "regulatory compliance",
          "fda regulations",
          "influence",
          "patient care",
        ],
        tier2Keywords: [],
        tier3Keywords: [],
      },
      "Director, Procurement",
      { experienceBlob: "Head of Engineering platform API mobile" },
    );

    expect(gap.topMissing).not.toContain("Strategic Alliances");
    expect(gap.topMissing).not.toContain("Risk Management");
    expect(gap.topMissing).not.toContain("Regulatory Compliance");
    expect(gap.topMissing).not.toContain("FDA Regulations");
    expect(gap.topMissing).not.toContain("influence");
    expect(gap.topMissing).not.toContain("Patient Care");
  });

  it("treats ISO 13485 as satisfying FDA Regulations in missing-keywords UI", () => {
    const gap = analyzeKeywordGapFromIntelligence(
      {
        ...PROC_RESUME,
        skills: [
          "Procurement",
          "Strategic Alliances",
          "Risk Management",
          "Regulatory Compliance",
          "ISO 13485",
          "Cloud & DevOps",
        ],
      },
      {
        tier1Keywords: ["fda regulations", "procurement", "iso 13485"],
        tier2Keywords: [],
        tier3Keywords: [],
      },
      "Director, Procurement",
      { experienceBlob: "Head of Engineering platform API mobile" },
    );

    expect(gap.topMissing).not.toContain("FDA Regulations");
  });
});
