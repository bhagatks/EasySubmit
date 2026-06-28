import { describe, expect, it } from "vitest";
import {
  enforceSummaryIdentityOpening,
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
});
