import { describe, expect, it } from "vitest";
import { buildPlatformStrategyInstructionBlock } from "@/lib/job-tracker/ats/platform-strategy-instructions";
import {
  getPlatformRules,
  resolvePlatformStrategy,
  type AtsPlatform,
  type PlatformStrategy,
} from "@/lib/job-tracker/ats/platform-rules";
import { computeResumeReadiness } from "@/lib/job-tracker/ats/resume-readiness-score";
import { buildEnhanceUserPrompt } from "@/src/lib/ai/engine/brain";
import type { CandidateContext } from "@/src/lib/ai/engine/candidate-context";
import { buildAtsOptimizationSpec } from "@/lib/job-tracker/ats/build-ats-optimization-spec";
import type { PrimeResumeData } from "@/components/onboarding/PrimeResume";

const readinessStub = {
  total: 85,
  grade: "B" as const,
  pillars: {
    completeness: { label: "Completeness", score: 22, maxScore: 25 as const, details: [] },
    keywords: { label: "Keyword Match", score: 20, maxScore: 25 as const, details: [] },
    bulletQuality: { label: "Bullet Quality", score: 21, maxScore: 25 as const, details: [] },
    atsCompliance: { label: "ATS Compliance", score: 22, maxScore: 25 as const, details: [] },
  },
  topActions: [],
};

function specForStrategy(strategy: PlatformStrategy, platform: AtsPlatform) {
  return buildAtsOptimizationSpec({
    mode: "jd_full",
    targetRole: "Senior Software Engineer",
    platform: {
      id: platform,
      label: getPlatformRules(platform).label,
      strategy,
      strategyInstructions: buildPlatformStrategyInstructionBlock(strategy),
      tip: getPlatformRules(platform).tip,
    },
    readiness: readinessStub,
    jobDescription: "Python AWS Docker Kubernetes",
  });
}

describe("platform strategy integration", () => {
  const mockCandidateContext: CandidateContext = {
    targetRole: "Senior Software Engineer",
    jobDescription: "Python AWS Docker Kubernetes",
    resumeBody: {
      professionalSummary: "Senior engineer with 7 years experience.",
      skillsText: "Python AWS",
      experience: [],
      education: [],
      certifications: [],
      projects: [],
      languages: [],
      customSections: [],
      pageLengthPreference: "auto",
    },
    senioritySignal: "senior",
    yearsExperienceEstimate: 7,
    pageBudget: { pages: 1, maxRolesDetailed: 3, maxSkills: 20, summarySentencesMax: 4 },
  };

  it("strategy instructions are injected into max-ATS prompt", () => {
    const spec = specForStrategy("human_review", "greenhouse");
    const prompt = buildEnhanceUserPrompt(mockCandidateContext, spec);

    expect(prompt).toContain("PLATFORM STRATEGY: HUMAN REVIEW");
    expect(prompt).toContain("readability and quantified impact");
    expect(prompt).toContain("ATS OPTIMIZATION SPEC");
  });

  it("keyword_search strategy differs from human_review in prompt content", () => {
    const keywordPrompt = buildEnhanceUserPrompt(
      mockCandidateContext,
      specForStrategy("keyword_search", "taleo"),
    );
    const humanPrompt = buildEnhanceUserPrompt(
      mockCandidateContext,
      specForStrategy("human_review", "greenhouse"),
    );

    expect(keywordPrompt).toContain("PLATFORM STRATEGY: KEYWORD SEARCH");
    expect(keywordPrompt).toContain("Aggressive exact-keyword coverage");
    expect(keywordPrompt).toContain("acronym and spelled-out");

    expect(humanPrompt).toContain("PLATFORM STRATEGY: HUMAN REVIEW");
    expect(humanPrompt).toContain("readability and quantified impact");
    expect(humanPrompt).not.toContain("Aggressive exact-keyword coverage");
  });

  it("ai_match strategy emphasizes skills taxonomy breadth", () => {
    const prompt = buildEnhanceUserPrompt(
      mockCandidateContext,
      specForStrategy("ai_match", "ashby"),
    );

    expect(prompt).toContain("PLATFORM STRATEGY: AI MATCH");
    expect(prompt).toContain("skills-taxonomy breadth");
    expect(prompt).toContain("Explicitly mirror stated");
  });

  it("parse_first strategy emphasizes structural parsing and standard titles", () => {
    const prompt = buildEnhanceUserPrompt(
      mockCandidateContext,
      specForStrategy("parse_first", "workday"),
    );

    expect(prompt).toContain("PLATFORM STRATEGY: PARSE FIRST");
    expect(prompt).toContain("Parse fidelity dominates");
    expect(prompt).toContain("standard industry titles");
    expect(prompt).toContain("strict MM/YYYY dates");
  });

  it("all strategy blocks include resume spec immutability reminder", () => {
    for (const strategy of [
      "keyword_search",
      "ai_match",
      "parse_first",
      "human_review",
    ] as const) {
      const block = buildPlatformStrategyInstructionBlock(strategy);
      expect(block).toContain("Do not violate resume spec");
    }
  });

  it("platform rules align with strategy assignments", () => {
    const platforms: Array<[AtsPlatform, PlatformStrategy]> = [
      ["taleo", "keyword_search"],
      ["jobvite", "keyword_search"],
      ["ashby", "ai_match"],
      ["icims", "ai_match"],
      ["workday", "parse_first"],
      ["greenhouse", "human_review"],
      ["lever", "human_review"],
    ];

    for (const [platform, expectedStrategy] of platforms) {
      const rules = getPlatformRules(platform);
      expect(rules.strategy).toBe(expectedStrategy);
    }
  });

  it("strategy resolution handles unknown platform fallback", () => {
    expect(resolvePlatformStrategy("unknown")).toBe("keyword_search");
    const unknownRules = getPlatformRules("unknown");
    expect(unknownRules.strategy).toBe("keyword_search");
  });

  it("readiness scoring applies platform-specific ATS compliance warnings", () => {
    const data: PrimeResumeData = {
      fullName: "Jane Smith",
      email: "jane@example.com",
      phone: "555-0100",
      summary: "Short.",
      skills: ["Python"],
      experience: [
        {
          title: "Engineer",
          company: "Acme",
          bullets: ["Built systems"],
        },
      ],
      education: [{ school: "State U", degree: "BS", field: "CS" }],
    };
    const jobDescription = "x".repeat(150);

    const greenhouse = computeResumeReadiness(
      data,
      "Software Engineer",
      jobDescription,
      undefined,
      "greenhouse",
    );
    const unknown = computeResumeReadiness(
      data,
      "Software Engineer",
      jobDescription,
      undefined,
      "unknown",
    );

    expect(greenhouse.pillars.atsCompliance.details).not.toEqual(
      unknown.pillars.atsCompliance.details,
    );
  });
});
