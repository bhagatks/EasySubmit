import { describe, expect, it } from "vitest";
import { buildExperiencePromptContext } from "@/lib/job-tracker/enhance/build-experience-prompt-context";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";

function role(
  id: string,
  bullets: string,
): HubRefineryForm["experience"][number] {
  return {
    id,
    title: `Title ${id}`,
    company: `Co ${id}`,
    location: "",
    startMonth: "Jan",
    startYear: "2020",
    endMonth: "",
    endYear: "Present",
    bullets,
    hidden: false,
  };
}

describe("buildExperiencePromptContext", () => {
  it("preserves ids, titles, companies, and dates", () => {
    const experience = [
      role("e1", "Led migration to Python and AWS\nCut latency by 40%"),
      role("e2", "Managed team of 8 engineers"),
      role("e3", "Built internal tools"),
    ];

    const slim = buildExperiencePromptContext(experience, 1);

    expect(slim).toHaveLength(3);
    expect(slim[0]).toMatchObject({
      id: "e1",
      title: "Title e1",
      company: "Co e1",
      startYear: "2020",
    });
  });

  it("compresses older roles more than the recent role", () => {
    const longBullets = Array.from({ length: 8 }, (_, i) =>
      `Delivered project ${i} with Python and reduced cost by ${i * 10}%`,
    ).join("\n");

    const experience = [
      role("recent", longBullets),
      role("mid", longBullets),
      role("old", longBullets),
    ];

    const slim = buildExperiencePromptContext(experience, 1);
    const recentLines = (slim[0]!.bullets ?? "").split("\n").filter(Boolean);
    const oldLines = (slim[2]!.bullets ?? "").split("\n").filter(Boolean);

    expect(recentLines.length).toBeGreaterThan(oldLines.length);
    expect(oldLines.length).toBeLessThanOrEqual(2);
    expect((slim[0]!.bullets ?? "").length).toBeLessThan(longBullets.length);
  });

  it("extracts metrics and known skills into fact lines", () => {
    const experience = [
      role("e1", "Scaled platform to 2M users using Python and AWS"),
    ];

    const slim = buildExperiencePromptContext(experience, 1);
    const text = (slim[0]!.bullets ?? "").toLowerCase();

    expect(text).toMatch(/python|aws|2m|users/i);
  });
});
