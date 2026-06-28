import { describe, expect, it } from "vitest";
import {
  computePlatformScores,
  type PlatformScoreInput,
} from "@/lib/job-tracker/ats/platform-score";

const BASE_INPUT: PlatformScoreInput = {
  formattingScore: 90,
  exactKeywordScore: 75,
  fuzzyKeywordScore: 80,
  semanticKeywordScore: 85,
  sectionsScore: 88,
  experienceScore: 70,
  educationScore: 95,
  quantificationRate: 60,
};

describe("computePlatformScores", () => {
  it("returns a score for each ATS profile", () => {
    const results = computePlatformScores(BASE_INPUT);
    expect(results).toHaveLength(6);
    expect(results.map((r) => r.id)).toEqual(
      expect.arrayContaining(["workday", "greenhouse", "lever", "icims", "taleo", "successfactors"]),
    );
  });

  it("assigns grades and pass/fail from platform thresholds", () => {
    const high = computePlatformScores({
      ...BASE_INPUT,
      exactKeywordScore: 95,
      semanticKeywordScore: 95,
      experienceScore: 95,
    });
    expect(high.every((r) => r.score >= 50)).toBe(true);
    expect(high.some((r) => r.grade === "Excellent" || r.grade === "Good")).toBe(true);
  });

  it("uses exact keyword strategy for Workday", () => {
    const exactHeavy = computePlatformScores({
      ...BASE_INPUT,
      exactKeywordScore: 95,
      semanticKeywordScore: 20,
    });
    const workday = exactHeavy.find((r) => r.id === "workday");
    expect(workday?.breakdown.keywords).toBe(95);
  });
});
