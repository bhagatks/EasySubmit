import { describe, expect, it } from "vitest";
import {
  buildPlatformStrategyInstructionBlock,
  PLATFORM_STRATEGY_MARKERS,
} from "@/lib/job-tracker/ats/platform-strategy-instructions";
import type { PlatformStrategy } from "@/lib/job-tracker/ats/platform-rules";

const STRATEGIES: PlatformStrategy[] = ["keyword_search", "ai_match", "parse_first", "human_review"];

describe("strategy instruction block isolation", () => {
  it("keyword_search emphasizes acronym expansion and skill repetition, not readability", () => {
    const block = buildPlatformStrategyInstructionBlock("keyword_search");
    expect(block).toMatch(/acronym and spelled-out/i);
    expect(block).toMatch(/Repeat the top 3–5 must-have skills/i);
    expect(block).toMatch(/Aggressive exact-keyword coverage/i);
    expect(block).not.toMatch(/readability/i);
    expect(block).not.toMatch(/scannable/i);
  });

  it("human_review emphasizes readability and quantified impact, not frequency", () => {
    const block = buildPlatformStrategyInstructionBlock("human_review");
    expect(block).toMatch(/readability and quantified impact/i);
    expect(block).toMatch(/scannable/i);
    expect(block).toMatch(/Recruiters read the resume directly/i);
    expect(block).not.toMatch(/Repeat the top 3–5/i);
    expect(block).not.toMatch(/acronym and spelled-out/i);
    expect(block).not.toMatch(/Aggressive exact-keyword coverage/i);
  });

  it("parse_first emphasizes structure and standard titles", () => {
    const block = buildPlatformStrategyInstructionBlock("parse_first");
    expect(block).toMatch(/standard industry titles/i);
    expect(block).toMatch(/strict MM\/YYYY dates/i);
    expect(block).toMatch(/canonical form/i);
    expect(block).toMatch(/Parse fidelity dominates/i);
    expect(block).not.toMatch(/keyword density/i);
    expect(block).not.toMatch(/readability and quantified impact/i);
  });

  it("ai_match emphasizes taxonomy breadth and requirement mirroring", () => {
    const block = buildPlatformStrategyInstructionBlock("ai_match");
    expect(block).toMatch(/skills-taxonomy breadth/i);
    expect(block).toMatch(/Explicitly mirror stated/i);
    expect(block).toMatch(/Prefer breadth/i);
    expect(block).not.toMatch(/scannable/i);
    expect(block).not.toMatch(/standard industry titles/i);
    expect(block).not.toMatch(/Aggressive exact-keyword/i);
  });

  it.each(STRATEGIES)("all strategies include resume spec immutability reminder: %s", (strategy) => {
    const block = buildPlatformStrategyInstructionBlock(strategy);
    expect(block).toContain("Do not violate resume spec");
  });

  it("each strategy has a unique marker line", () => {
    const markers = Object.values(PLATFORM_STRATEGY_MARKERS);
    const uniqueMarkers = new Set(markers);
    expect(uniqueMarkers.size).toBe(markers.length);
  });

  it.each(STRATEGIES)("marker for %s is present in instruction block", (strategy) => {
    const block = buildPlatformStrategyInstructionBlock(strategy);
    const marker = PLATFORM_STRATEGY_MARKERS[strategy];
    expect(block).toContain(marker);
    expect(block.startsWith(marker)).toBe(true);
  });

  it("instruction blocks are formatted with bullet points", () => {
    for (const strategy of STRATEGIES) {
      const block = buildPlatformStrategyInstructionBlock(strategy);
      const lines = block.split("\n");
      // First line is marker, rest should be bullets
      expect(lines.length).toBeGreaterThan(1);
      for (let i = 1; i < lines.length; i++) {
        expect(lines[i]).toMatch(/^- /);
      }
    }
  });

  it("no strategy block mentions keyword stuffing except keyword_search", () => {
    for (const strategy of ["ai_match", "parse_first", "human_review"] as const) {
      const block = buildPlatformStrategyInstructionBlock(strategy);
      expect(block).not.toMatch(/keyword stuffing/i);
    }
  });

  it("parse_first and human_review blocks prioritize different concerns", () => {
    const parseBlock = buildPlatformStrategyInstructionBlock("parse_first");
    const humanBlock = buildPlatformStrategyInstructionBlock("human_review");

    // parse_first cares about dates and titles
    expect(parseBlock).toMatch(/dates/i);
    expect(parseBlock).toMatch(/titles/i);

    // human_review cares about bullets and summary
    expect(humanBlock).toMatch(/bullet/i);
    expect(humanBlock).toMatch(/summary/i);

    // They should emphasize different things
    expect(parseBlock).not.toMatch(/quantified impact/i);
    expect(humanBlock).not.toMatch(/MM\/YYYY dates/i);
  });

  it("ai_match block does not mention keyword frequency like keyword_search does", () => {
    const aiMatchBlock = buildPlatformStrategyInstructionBlock("ai_match");
    const keywordBlock = buildPlatformStrategyInstructionBlock("keyword_search");

    expect(keywordBlock).toMatch(/Repeat/i);
    expect(aiMatchBlock).not.toMatch(/Repeat the top 3–5/i);
  });
});
