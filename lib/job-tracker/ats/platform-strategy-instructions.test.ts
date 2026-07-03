import { describe, expect, it } from "vitest";
import { buildEnhanceUserPrompt } from "@/src/lib/ai/engine/brain";
import type { CandidateContext } from "@/src/lib/ai/engine/candidate-context";
import {
  buildPlatformStrategyInstructionBlock,
  PLATFORM_STRATEGY_MARKERS,
} from "@/lib/job-tracker/ats/platform-strategy-instructions";
import type { PlatformStrategy } from "@/lib/job-tracker/ats/platform-rules";

const STRATEGIES: PlatformStrategy[] = [
  "keyword_search",
  "ai_match",
  "parse_first",
  "human_review",
];

describe("platform-strategy-instructions", () => {
  it.each(STRATEGIES)("buildPlatformStrategyInstructionBlock(%s) includes strategy marker", (strategy) => {
    const block = buildPlatformStrategyInstructionBlock(strategy);
    expect(block).toContain(PLATFORM_STRATEGY_MARKERS[strategy]);
    expect(block).toContain("Do not violate resume spec");
  });

  it("keyword_search emphasizes acronym expansion and skill repetition", () => {
    const block = buildPlatformStrategyInstructionBlock("keyword_search");
    expect(block).toMatch(/acronym and spelled-out/i);
    expect(block).toMatch(/Repeat the top 3–5 must-have skills/i);
  });

  it("human_review does not instruct keyword stuffing", () => {
    const block = buildPlatformStrategyInstructionBlock("human_review");
    expect(block).toMatch(/readability and quantified impact/i);
    expect(block).not.toMatch(/Repeat the top 3–5 must-have skills/i);
    expect(block).not.toMatch(/Aggressive exact-keyword coverage/i);
  });
});

describe("buildEnhanceUserPrompt platform strategy injection", () => {
  const ctx: CandidateContext = {
    targetRole: "Senior Software Engineer",
    jobDescription: "Python AWS Docker ".repeat(20),
    resumeBody: { professionalSummary: "Engineer.", skillsText: "Python", experience: [] },
    rawResumeSnippet: undefined,
    senioritySignal: "senior",
    yearsExperienceEstimate: 8,
    pageBudget: {
      pages: 1,
      maxRolesDetailed: 3,
      maxSkills: 20,
      summarySentencesMax: 4,
    },
  };

  it.each(STRATEGIES)("includes %s block in optimize pass prompt", (strategy) => {
    const instructions = buildPlatformStrategyInstructionBlock(strategy);
    const prompt = buildEnhanceUserPrompt(ctx, "optimize", undefined, undefined, {
      platform: {
        id: "greenhouse",
        label: "Greenhouse",
        strategy,
        strategyInstructions: instructions,
        tip: "tip",
      },
      readiness: { topActions: [] },
    } as never);

    expect(prompt).toContain(PLATFORM_STRATEGY_MARKERS[strategy]);
  });
});
