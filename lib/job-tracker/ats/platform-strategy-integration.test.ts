import { describe, expect, it } from "vitest";
import { buildPlatformStrategyInstructionBlock } from "@/lib/job-tracker/ats/platform-strategy-instructions";
import { getPlatformRules, resolvePlatformStrategy } from "@/lib/job-tracker/ats/platform-rules";
import { buildEnhanceUserPrompt } from "@/src/lib/ai/engine/brain";
import type { CandidateContext } from "@/src/lib/ai/engine/candidate-context";
import type { ResumeEnhanceBrief } from "@/lib/job-tracker/enhance/enhance-brief";

describe("platform strategy integration", () => {
  const createMockBrief = (strategy: string, platform: string): Partial<ResumeEnhanceBrief> => ({
    platform: {
      id: platform as any,
      label: getPlatformRules(platform as any).label,
      strategy: strategy as any,
      strategyInstructions: buildPlatformStrategyInstructionBlock(strategy as any),
      tip: getPlatformRules(platform as any).tip,
    },
    readiness: { topActions: [], total: 85 },
    summaryIdentity: { identity: "Software Engineer", jdTargetRole: "Senior Engineer", isCrossDomain: false },
    jd: undefined,
    skills: { list: ["Python", "AWS", "TypeScript"] },
  });

  const mockCandidateContext: CandidateContext = {
    targetRole: "Senior Software Engineer",
    jobDescription: "Python AWS Docker Kubernetes",
    resumeBody: { professionalSummary: "Senior engineer with 7 years experience.", skillsText: "Python AWS" },
    senioritySignal: "senior",
    yearsExperienceEstimate: 7,
    pageBudget: { pages: 1, maxRolesDetailed: 3, maxSkills: 20, summarySentencesMax: 4 },
  };

  it("strategy instructions are injected into both generate and optimize AI prompts", () => {
    const brief = createMockBrief("human_review", "greenhouse");
    const generatePrompt = buildEnhanceUserPrompt(
      mockCandidateContext,
      "generate",
      undefined,
      undefined,
      brief as ResumeEnhanceBrief,
    );
    const optimizePrompt = buildEnhanceUserPrompt(
      mockCandidateContext,
      "optimize",
      undefined,
      undefined,
      brief as ResumeEnhanceBrief,
    );

    expect(generatePrompt).toContain("PLATFORM STRATEGY: HUMAN REVIEW");
    expect(optimizePrompt).toContain("PLATFORM STRATEGY: HUMAN REVIEW");
    expect(generatePrompt).toContain("readability and quantified impact");
    expect(optimizePrompt).toContain("readability and quantified impact");
  });

  it("keyword_search strategy differs from human_review in prompt content", () => {
    const keywordBrief = createMockBrief("keyword_search", "taleo");
    const humanBrief = createMockBrief("human_review", "greenhouse");

    const keywordPrompt = buildEnhanceUserPrompt(
      mockCandidateContext,
      "optimize",
      undefined,
      undefined,
      keywordBrief as ResumeEnhanceBrief,
    );
    const humanPrompt = buildEnhanceUserPrompt(
      mockCandidateContext,
      "optimize",
      undefined,
      undefined,
      humanBrief as ResumeEnhanceBrief,
    );

    expect(keywordPrompt).toContain("PLATFORM STRATEGY: KEYWORD SEARCH");
    expect(keywordPrompt).toContain("Aggressive exact-keyword coverage");
    expect(keywordPrompt).toContain("acronym and spelled-out");

    expect(humanPrompt).toContain("PLATFORM STRATEGY: HUMAN REVIEW");
    expect(humanPrompt).toContain("readability and quantified impact");
    expect(humanPrompt).not.toContain("Aggressive exact-keyword coverage");
  });

  it("ai_match strategy emphasizes skills taxonomy breadth", () => {
    const brief = createMockBrief("ai_match", "ashby");
    const prompt = buildEnhanceUserPrompt(
      mockCandidateContext,
      "optimize",
      undefined,
      undefined,
      brief as ResumeEnhanceBrief,
    );

    expect(prompt).toContain("PLATFORM STRATEGY: AI MATCH");
    expect(prompt).toContain("skills-taxonomy breadth");
    expect(prompt).toContain("Explicitly mirror stated");
  });

  it("parse_first strategy emphasizes structural parsing and standard titles", () => {
    const brief = createMockBrief("parse_first", "workday");
    const prompt = buildEnhanceUserPrompt(
      mockCandidateContext,
      "optimize",
      undefined,
      undefined,
      brief as ResumeEnhanceBrief,
    );

    expect(prompt).toContain("PLATFORM STRATEGY: PARSE FIRST");
    expect(prompt).toContain("Parse fidelity dominates");
    expect(prompt).toContain("standard industry titles");
    expect(prompt).toContain("strict MM/YYYY dates");
  });

  it("all strategy blocks include resume spec immutability reminder", () => {
    for (const strategy of ["keyword_search", "ai_match", "parse_first", "human_review"] as const) {
      const block = buildPlatformStrategyInstructionBlock(strategy);
      expect(block).toContain("Do not violate resume spec");
    }
  });

  it("platform rules align with strategy assignments", () => {
    const platforms: Array<[string, any]> = [
      ["taleo", "keyword_search"],
      ["jobvite", "keyword_search"],
      ["ashby", "ai_match"],
      ["icims", "ai_match"],
      ["workday", "parse_first"],
      ["greenhouse", "human_review"],
      ["lever", "human_review"],
    ];

    for (const [platform, expectedStrategy] of platforms) {
      const rules = getPlatformRules(platform as any);
      expect(rules.strategy).toBe(expectedStrategy);
    }
  });

  it("strategy resolution handles unknown platform fallback", () => {
    expect(resolvePlatformStrategy("unknown")).toBe("keyword_search");
    const unknownRules = getPlatformRules("unknown");
    expect(unknownRules.strategy).toBe("keyword_search");
  });
});
