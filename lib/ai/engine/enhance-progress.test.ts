import { describe, expect, it } from "vitest";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import {
  measureEnhanceWorkload,
  resolveEnhanceClientTimeoutMs,
  resolveEnhanceProgressMessage,
  resolveEnhanceProgressRatio,
} from "@/src/lib/ai/engine/enhance-progress";

const baseForm = (): HubRefineryForm => ({
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  phone: "",
  linkedIn: "",
  cityState: "Austin, TX",
  professionalSummary: "Short summary.",
  skillsText: "TypeScript, React",
  experience: [
    {
      id: "1",
      company: "Acme",
      title: "Dev",
      location: "",
      startMonth: "",
      startYear: "2020",
      endMonth: "",
      endYear: "Present",
      bullets: "Built things",
      hidden: false,
    },
  ],
  education: [],
  certifications: [],
  projects: [],
  languages: [],
  customSections: [],
  pageLengthPreference: "auto",
});

describe("enhance-progress", () => {
  it("classifies small payloads as light with one pass", () => {
    const estimate = measureEnhanceWorkload({ form: baseForm() });
    expect(estimate.tier).toBe("light");
    expect(estimate.passCount).toBe(1);
    expect(estimate.estimatedMs).toBeLessThan(22_000);
  });

  it("classifies large JD + resume as heavy with two passes", () => {
    const estimate = measureEnhanceWorkload({
      form: {
        ...baseForm(),
        professionalSummary: "x".repeat(2_000),
        experience: [
          {
            ...baseForm().experience[0]!,
            bullets: "y".repeat(6_000),
          },
        ],
      },
      jobDescription: "z".repeat(2_500),
      rawResumeText: "r".repeat(8_000),
    });

    expect(estimate.passCount).toBe(2);
    expect(estimate.tier).toBe("heavy");
    expect(estimate.totalInputChars).toBeGreaterThan(10_000);
    expect(estimate.estimatedLabel).toMatch(/minute/);
  });

  it("returns reassurance copy after the estimate is exceeded", () => {
    const estimate = measureEnhanceWorkload({
      form: baseForm(),
      jobDescription: "jd".repeat(1_000),
    });

    const message = resolveEnhanceProgressMessage({
      tier: estimate.tier,
      estimatedMs: estimate.estimatedMs,
      elapsedMs: estimate.estimatedMs * 1.2,
      passCount: estimate.passCount,
    });

    expect(message.phase).toBe("over_estimate");
    expect(message.headline.toLowerCase()).toContain("still");
  });

  it("caps progress ratio below completion", () => {
    expect(resolveEnhanceProgressRatio(120_000, 30_000)).toBeLessThanOrEqual(0.92);
    expect(resolveEnhanceProgressRatio(1_000, 30_000)).toBeGreaterThanOrEqual(0.08);
  });

  it("resolveEnhanceClientTimeoutMs uses workload floor above config", () => {
    const estimate = measureEnhanceWorkload({
      form: baseForm(),
      jobDescription: "z".repeat(3_000),
    });
    const timeout = resolveEnhanceClientTimeoutMs(10_000, estimate);
    expect(timeout).toBeGreaterThan(10_000);
    expect(timeout).toBeGreaterThanOrEqual(Math.ceil(estimate.estimatedMs * 1.35));
  });
});
