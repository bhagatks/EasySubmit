import { describe, expect, it } from "vitest";
import {
  computeExperienceJdOverlap,
  isNonTechJdDomain,
  resolveSummaryIdentity,
} from "@/lib/job-tracker/enhance/resolve-summary-identity";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";

const engForm = {
  professionalSummary: "Director with 20 years of platform delivery.",
  skillsText: "Cloud & DevOps, Docker",
  experience: [
    {
      title: "Head of Engineering",
      company: "7-Eleven",
      bullets: "Led 7Now Delivery Platform engineering for mobile and API teams.",
    },
  ],
} as HubRefineryForm;

describe("resolveSummaryIdentity", () => {
  it("uses profile title over JD title for identity", () => {
    const result = resolveSummaryIdentity({
      profileTargetTitle: "Director of Engineering",
      form: engForm,
      jdTargetRole: "Director, Procurement",
      jdKeywords: ["procurement", "strategic sourcing", "iso 13485"],
      jdDomain: "procurement-supply-chain",
    });

    expect(result.identity).toBe("Director of Engineering");
    expect(result.isCrossDomain).toBe(true);
    expect(result.mayUseJdTitleInSummary).toBe(false);
  });

  it("falls back to recent experience title", () => {
    const result = resolveSummaryIdentity({
      form: engForm,
      jdTargetRole: "Director, Procurement",
      jdKeywords: ["procurement"],
    });

    expect(result.identity).toBe("Head of Engineering");
  });

  it("ignores employer name parsed from corrupted summary opening", () => {
    const corrupted = {
      ...engForm,
      professionalSummary:
        "7-Eleven with 20 years leading platform, mobile, and API engineering organizations across global technology organizations.",
    };
    const result = resolveSummaryIdentity({
      form: corrupted,
      jdTargetRole: "Director, Procurement",
      jdKeywords: ["procurement"],
    });

    expect(result.identity).toBe("Head of Engineering");
  });

  it("uses primary title before pipe separator", () => {
    const form = {
      experience: [
        {
          title: "Head of Engineering | Sr. Engineering Manager",
          company: "7-Eleven",
          bullets: "Led platform engineering.",
        },
      ],
    } as HubRefineryForm;
    const result = resolveSummaryIdentity({
      form,
      jdTargetRole: "Director, Procurement",
    });
    expect(result.identity).toBe("Head of Engineering");
  });

  it("prefers specific experience title over generic profile Director", () => {
    const result = resolveSummaryIdentity({
      profileTargetTitle: "Director",
      form: engForm,
      jdTargetRole: "Director, Procurement",
      jdKeywords: ["procurement"],
    });

    expect(result.identity).toBe("Head of Engineering");
  });

  it("allows JD target role in summary for aligned technical leadership jobs", () => {
    const result = resolveSummaryIdentity({
      profileTargetTitle: "Head of Engineering",
      form: {
        experience: [
          {
            title: "Head of Engineering",
            company: "7-Eleven",
            bullets:
              "Led AWS microservices, platform architecture, data migration, and Agentic AI delivery workflows.",
          },
        ],
      } as HubRefineryForm,
      jdTargetRole: "Director, AI/ML and Data Architecture",
      jdKeywords: ["machine learning", "data architecture", "platform", "engineering"],
      jdDomain: "ml-ai",
    });

    expect(result.isTechnicalCandidate).toBe(true);
    expect(result.mayUseJdTitleInSummary).toBe(true);
  });

  it("extracts summary lead from years pattern when valid", () => {
    const result = resolveSummaryIdentity({
      form: { experience: [] } as HubRefineryForm,
      currentSummary: "Engineering Manager with 18 years leading platform and API teams.",
      jdTargetRole: "Director, Engineering",
      jdKeywords: ["platform", "engineering"],
    });

    expect(result.identity).toBe("Engineering Manager");
  });

  it("defaults identity to Professional when no valid candidate exists", () => {
    const result = resolveSummaryIdentity({
      form: { experience: [] } as HubRefineryForm,
      jdTargetRole: "",
      jdKeywords: [],
    });

    expect(result.identity).toBe("Professional");
    expect(result.jdTargetRole).toBe("Professional");
  });

  it("skips hidden experience when picking recent title", () => {
    const result = resolveSummaryIdentity({
      form: {
        experience: [
          { title: "Hidden Role", company: "Co", hidden: true, bullets: "" },
          { title: "Platform Engineer", company: "Co", bullets: "Built APIs." },
        ],
      } as HubRefineryForm,
      jdTargetRole: "Engineer",
    });

    expect(result.identity).toBe("Platform Engineer");
  });
});

describe("computeExperienceJdOverlap", () => {
  it("returns zero when JD keywords are empty", () => {
    expect(computeExperienceJdOverlap(engForm, [])).toBe(0);
  });

  it("scores overlap from experience bullets and titles", () => {
    const score = computeExperienceJdOverlap(engForm, [
      "platform",
      "mobile",
      "procurement",
    ]);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe("isNonTechJdDomain", () => {
  it("flags procurement and product domains as non-technical", () => {
    expect(isNonTechJdDomain("procurement-supply-chain")).toBe(true);
    expect(isNonTechJdDomain("product-management")).toBe(true);
    expect(isNonTechJdDomain(undefined)).toBe(false);
    expect(isNonTechJdDomain("ml-ai")).toBe(false);
  });
});
