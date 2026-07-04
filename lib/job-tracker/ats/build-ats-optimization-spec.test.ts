import { describe, expect, it } from "vitest";
import {
  buildAtsOptimizationSpec,
  collectPillarChecklist,
  formatAtsOptimizationSpecBlock,
  resolveAtsOptimizationMode,
} from "@/lib/job-tracker/ats/build-ats-optimization-spec";
import {
  resolveEnhanceContextRequirement,
} from "@/lib/job-tracker/enhance/max-ats-helpers";
import { buildPlatformStrategyInstructionBlock } from "@/lib/job-tracker/ats/platform-strategy-instructions";
import type { ResumeReadinessResult } from "@/lib/job-tracker/ats/resume-readiness-score";

const readinessStub: ResumeReadinessResult = {
  total: 67,
  grade: "C",
  pillars: {
    completeness: {
      label: "Completeness",
      score: 20,
      maxScore: 25,
      details: ["Skills section has only 9 items — aim for 15–20."],
    },
    keywords: {
      label: "Keyword Match",
      score: 9,
      maxScore: 25,
      details: ["Missing keywords from the job description: COBOL, SDLC."],
    },
    bulletQuality: {
      label: "Bullet Quality",
      score: 18,
      maxScore: 25,
      details: ["Only 20% of bullets include a measurable result — aim for 70%+."],
    },
    atsCompliance: {
      label: "ATS Compliance",
      score: 20,
      maxScore: 25,
      details: ["No parser warnings detected. ✓"],
    },
  },
  topActions: [],
};

describe("buildAtsOptimizationSpec", () => {
  it("resolveAtsOptimizationMode picks jd_full when JD is long enough", () => {
    expect(
      resolveAtsOptimizationMode({
        hasFullJd: true,
        targetRole: "Director",
        companyName: "Fidelity",
      }),
    ).toBe("jd_full");
  });

  it("resolveAtsOptimizationMode picks role_company without full JD", () => {
    expect(
      resolveAtsOptimizationMode({
        hasFullJd: false,
        targetRole: "Director",
        companyName: "Fidelity",
      }),
    ).toBe("role_company");
  });

  it("collectPillarChecklist skips checkmarked details", () => {
    const items = collectPillarChecklist(readinessStub);
    expect(items.some((i) => i.includes("COBOL"))).toBe(true);
    expect(items.some((i) => i.includes("✓"))).toBe(false);
  });

  it("formatAtsOptimizationSpecBlock includes platform strategy and score gaps", () => {
    const block = formatAtsOptimizationSpecBlock(
      buildAtsOptimizationSpec({
        mode: "jd_full",
        targetRole: "Director, AI/ML",
        companyName: "Fidelity",
        platform: {
          id: "workday",
          label: "Workday",
          strategy: "parse_first",
          strategyInstructions: buildPlatformStrategyInstructionBlock("parse_first"),
          tip: "Workday tip",
        },
        readiness: readinessStub,
        keywordGap: {
          coveragePercent: 36,
          exactCoveragePercent: 36,
          topMissing: ["COBOL", "SDLC"],
          matched: [],
          totalKeywords: 25,
        },
      }),
    );

    expect(block).toContain("ATS OPTIMIZATION SPEC");
    expect(block).toContain("67/100");
    expect(block).toContain("PLATFORM STRATEGY: PARSE FIRST");
    expect(block).toContain("COBOL");
    expect(block).toContain("Missing keywords");
  });
});

describe("resolveEnhanceContextRequirement", () => {
  it("accepts full JD", () => {
    const jd = "x".repeat(120);
    expect(
      resolveEnhanceContextRequirement({
        jobDescription: jd,
        targetRole: "Engineer",
        companyName: null,
      }),
    ).toEqual({ ok: true, jobDescription: jd });
  });

  it("accepts role + company without full JD", () => {
    expect(
      resolveEnhanceContextRequirement({
        jobDescription: "short",
        targetRole: "Engineer",
        companyName: "Acme",
      }),
    ).toEqual({ ok: true, jobDescription: "short" });
  });

  it("rejects when context is insufficient", () => {
    expect(
      resolveEnhanceContextRequirement({
        jobDescription: "short",
        targetRole: "Engineer",
        companyName: "",
      }).ok,
    ).toBe(false);
  });
});
