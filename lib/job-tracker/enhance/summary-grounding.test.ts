import { describe, expect, it } from "vitest";
import {
  enforceSummaryIdentityOpening,
  experienceBlobFromForm,
  normalizeExperienceDateFields,
  normalizePresentDateArtifacts,
  postProcessSummaryOutput,
  sanitizeUngroundedSummaryClaims,
} from "@/lib/job-tracker/enhance/summary-grounding";
import { resolveSummaryIdentity } from "@/lib/job-tracker/enhance/resolve-summary-identity";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";

const engForm = {
  experience: [
    {
      title: "Head of Engineering",
      company: "7-Eleven",
      bullets: "Led 7Now Delivery Platform engineering initiatives.",
    },
  ],
} as HubRefineryForm;

describe("summary-grounding", () => {
  it("removes fabricated spend claims", () => {
    const blob = "Led 7Now Delivery Platform engineering initiatives.";
    const { summary, removed } = sanitizeUngroundedSummaryClaims(
      "Director, Procurement with 20 years. Successfully managed $100M in annual direct purchases.",
      blob,
    );
    expect(removed).toContain("spend figure");
    expect(summary.toLowerCase()).not.toContain("$100m");
  });

  it("replaces employer name opening with candidate identity", () => {
    const identity = resolveSummaryIdentity({
      profileTargetTitle: "Engineering Manager",
      form: engForm,
      jdTargetRole: "Director, Procurement",
      jdKeywords: ["procurement"],
      jdDomain: "procurement-supply-chain",
    });

    const fixed = enforceSummaryIdentityOpening(
      "7-Eleven with 20 years leading platform, mobile, and API engineering organizations.",
      identity,
      ["7-Eleven", "CVS Health"],
    );
    expect(fixed.startsWith("Engineering Manager")).toBe(true);
    expect(fixed.toLowerCase()).not.toMatch(/^7-eleven/);
  });

  it("replaces JD title opening with candidate identity when cross-domain", () => {
    const identity = resolveSummaryIdentity({
      profileTargetTitle: "Head of Engineering",
      form: engForm,
      jdTargetRole: "Director, Procurement",
      jdKeywords: ["procurement"],
      jdDomain: "procurement-supply-chain",
    });

    const fixed = enforceSummaryIdentityOpening(
      "Director, Procurement with 20 years of experience in retail.",
      identity,
    );
    expect(fixed.startsWith("Head of Engineering")).toBe(true);
    expect(fixed.toLowerCase()).not.toMatch(/^director, procurement/);
  });

  it("allows target-role opening for aligned technical leadership jobs", () => {
    const identity = resolveSummaryIdentity({
      profileTargetTitle: "Head of Engineering",
      form: {
        experience: [
          {
            title: "Head of Engineering",
            company: "7-Eleven",
            bullets:
              "Led AWS microservices, event-driven APIs, data migration, platform architecture, and Agentic AI delivery workflows.",
          },
        ],
      } as HubRefineryForm,
      jdTargetRole: "Director, AI/ML and Data Architecture",
      jdKeywords: ["data architecture", "AI/ML", "cloud", "microservices"],
      jdDomain: "ml-ai",
    });

    const fixed = enforceSummaryIdentityOpening(
      "Director, AI/ML and Data Architecture with 20 years of experience modernizing enterprise platforms.",
      identity,
    );

    expect(identity.mayUseJdTitleInSummary).toBe(true);
    expect(fixed).toMatch(/^Director, AI\/ML and Data Architecture/);
  });

  it("rewrites generic director opening to JD target title when allowed", () => {
    const identity = resolveSummaryIdentity({
      profileTargetTitle: "Head of Engineering",
      form: {
        experience: [
          {
            title: "Head of Engineering",
            company: "7-Eleven",
            bullets:
              "Led AWS microservices, data architecture, machine learning pipelines, and cloud platform modernization.",
          },
        ],
      } as HubRefineryForm,
      jdTargetRole: "Director, AI/ML and Data Architecture",
      jdKeywords: ["data architecture", "machine learning", "cloud"],
      jdDomain: "ml-ai",
    });

    const fixed = enforceSummaryIdentityOpening(
      "Director-level engineering executive with 21 years of experience driving data architecture modernization.",
      identity,
    );

    expect(identity.mayUseJdTitleInSummary).toBe(true);
    expect(fixed.startsWith("Director, AI/ML and Data Architecture with 21 years")).toBe(true);
  });

  it("rewrites generic director opening when summary uses with over N years", () => {
    const identity = resolveSummaryIdentity({
      profileTargetTitle: "Head of Engineering",
      form: {
        experience: [
          {
            title: "Head of Engineering",
            company: "7-Eleven",
            bullets:
              "Led AWS microservices, data architecture, machine learning pipelines, and cloud platform modernization.",
          },
        ],
      } as HubRefineryForm,
      jdTargetRole: "Director, AI/ML and Data Architecture",
      jdKeywords: ["data architecture", "machine learning", "cloud"],
      jdDomain: "ml-ai",
    });

    const fixed = enforceSummaryIdentityOpening(
      "Director-level engineering executive with over 21 years of experience driving data architecture modernization.",
      identity,
    );

    expect(fixed.startsWith("Director, AI/ML and Data Architecture with over 21 years")).toBe(
      true,
    );
  });

  it("fixes Present Present artifacts", () => {
    expect(normalizePresentDateArtifacts("Jan 2024 – Present Present")).toBe(
      "Jan 2024 – Present",
    );
  });

  it("strips leverage without review placeholder", () => {
    const identity = resolveSummaryIdentity({
      profileTargetTitle: "Head of Engineering",
      form: engForm,
      jdTargetRole: "Director, Procurement",
    });
    const { summary, warnings } = postProcessSummaryOutput(
      "Director, Procurement with 20 years. Leverages strategic sourcing for scale.",
      {
        identity,
        experienceBlob: "Led 7Now Delivery Platform engineering initiatives.",
      },
    );
    expect(summary).not.toContain("[review]");
    expect(summary.toLowerCase()).toContain("applies strategic sourcing");
    expect(warnings.some((w) => w.includes("may not match"))).toBe(true);
  });

  it("builds experience blob and normalizes duplicated Present fields", () => {
    expect(
      experienceBlobFromForm([
        { title: "Engineer", company: "Co", bullets: "Built APIs." },
      ]),
    ).toContain("Built APIs.");

    const normalized = normalizeExperienceDateFields([
      { endYear: "Present Present", bullets: "Jan 2024 – Present Present" },
    ]);
    expect(normalized[0]?.endYear).toBe("Present");
    expect(normalized[0]?.bullets).toBe("Jan 2024 – Present");
  });
});
