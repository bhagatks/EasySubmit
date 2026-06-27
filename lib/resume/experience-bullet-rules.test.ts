import { describe, expect, it } from "vitest";
import {
  MAX_BULLETS_PER_ROLE,
  auditExperienceBulletCounts,
  buildExperienceBulletBudgetPrompt,
  countExperienceBullets,
  resolveExperienceBulletBudget,
} from "@/lib/resume/experience-bullet-rules";

describe("experience-bullet-rules", () => {
  it("resolves recency budgets for 1-page resumes", () => {
    expect(resolveExperienceBulletBudget(0, 1)).toMatchObject({
      tier: "recent",
      min: 3,
      targetMin: 4,
      targetMax: 5,
      max: 5,
    });
    expect(resolveExperienceBulletBudget(1, 1)).toMatchObject({
      tier: "mid",
      min: 2,
      max: 3,
    });
    expect(resolveExperienceBulletBudget(2, 1)).toMatchObject({
      tier: "older",
      min: 1,
      max: 2,
    });
  });

  it("allows higher recent cap on 2-page resumes", () => {
    expect(resolveExperienceBulletBudget(0, 2).max).toBe(MAX_BULLETS_PER_ROLE);
    expect(resolveExperienceBulletBudget(1, 2).max).toBe(4);
  });

  it("counts newline and array bullets", () => {
    expect(countExperienceBullets("Led team\nBuilt API")).toBe(2);
    expect(countExperienceBullets(["- Led team", "Built API"])).toBe(2);
  });

  it("audits below-min on recent role and above-max on older role", () => {
    const issues = auditExperienceBulletCounts(
      [
        { bullets: "One\nTwo" },
        { bullets: "A\nB\nC\nD" },
        { bullets: "A\nB\nC" },
      ],
      1,
    );

    expect(issues.some((i) => i.kind === "below_min" && i.tier === "recent")).toBe(true);
    expect(issues.some((i) => i.kind === "above_recommended_max" && i.tier === "older")).toBe(
      true,
    );
  });

  it("builds AI prompt block with recency tiers", () => {
    const prompt = buildExperienceBulletBudgetPrompt(2, 4);
    expect(prompt).toContain("Most recent role");
    expect(prompt).toContain("Older roles");
    expect(prompt).toContain("up to 4 roles");
  });
});
