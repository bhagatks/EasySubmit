import { describe, expect, it } from "vitest";
import { resolveSummaryIdentity } from "@/lib/job-tracker/enhance/resolve-summary-identity";
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
});
