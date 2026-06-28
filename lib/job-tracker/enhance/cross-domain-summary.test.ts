import { describe, expect, it } from "vitest";
import {
  buildCrossDomainSummary,
  extractTransferableBridgePhrases,
  shouldRebuildCrossDomainSummary,
  summaryLeaksJdSkillTerms,
} from "@/lib/job-tracker/enhance/cross-domain-summary";
import { countSummarySentences, countSummaryWords } from "@/lib/resume/summary-rules";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";

const CASE_001_EXPERIENCE = [
  {
    title: "Head of Engineering",
    company: "7-Eleven",
    bullets:
      "Led the 7Now Delivery Platform engineering initiatives, directing a high-performing team of API, iOS, Android, and Flutter engineers in transforming third-party delivery integrations (Uber Eats, Door Dash) into a first-party 7Now platform.\nImplemented Agentic AI capability within the engineering org, deploying AI-assisted workflows that increased productivity by 10x.",
    startYear: "2024",
  },
  {
    title: "Director | Engineering Manager",
    company: "CVS Health",
    bullets:
      "Designed, architected and delivered the new payment gateway CVS Pay, obtaining a patent for CVS.",
    startYear: "2014",
    endYear: "2023",
  },
] as HubRefineryForm["experience"];

const NATIVE_SKILLS = [
  "Cloud & DevOps",
  "Data & AI Tools",
  "Docker",
  "Full-Stack & APIs",
  "Gateways",
  "Mobile Development",
];

describe("cross-domain-summary", () => {
  it("extracts vendor and platform bridge themes from engineering bullets", () => {
    const blob = CASE_001_EXPERIENCE!.map((e) => e.bullets).join(" ");
    const phrases = extractTransferableBridgePhrases(blob);
    expect(phrases).toContain("vendor and partner integrations");
    expect(phrases).toContain("platform scale and reliability");
  });

  it("builds identity-first summary without JD procurement terms", () => {
    const summary = buildCrossDomainSummary({
      currentSummary: "",
      skills: NATIVE_SKILLS,
      experience: CASE_001_EXPERIENCE ?? [],
      summaryIdentity: "Head of Engineering",
      isCrossDomain: true,
    });

    expect(summary).toMatch(/Head of Engineering/i);
    expect(summary).toMatch(/platform, mobile, and API engineering/i);
    expect(summary).toContain("Cloud & DevOps");
    expect(summary).not.toMatch(/procurement|strategic sourcing|purchasing|systems design/i);
    expect(summary).toMatch(/transferable strengths/i);
    expect(countSummarySentences(summary)).toBe(4);
    expect(countSummaryWords(summary)).toBeGreaterThanOrEqual(70);
    expect(countSummaryWords(summary)).toBeLessThanOrEqual(80);
  });

  it("detects JD skill leakage in summary text", () => {
    const leaked =
      "Director with 20 years. Applies Procurement, Strategic Alliances, and Risk Management to deliver outcomes.";
    expect(summaryLeaksJdSkillTerms(leaked, NATIVE_SKILLS, ["Procurement", "Risk Management"])).toBe(
      true,
    );
  });

  it("requires rebuild when summary contains procurement terms", () => {
    const bad =
      "Director with 20 years. Applies Procurement and Risk Management to outcomes. Consistent contributor across Regulatory Compliance and Purchasing domains, with demonstrated depth in systems design and cross-functional delivery. Led platform initiatives.";
    expect(
      shouldRebuildCrossDomainSummary(bad, NATIVE_SKILLS, ["Procurement", "ISO 13485"]),
    ).toBe(true);
  });

  it("requires rebuild when summary opens with employer name", () => {
    const bad =
      "7-Eleven with 20 years leading platform engineering organizations. Brings depth in Cloud & DevOps.";
    expect(
      shouldRebuildCrossDomainSummary(bad, NATIVE_SKILLS, [], ["7-Eleven"]),
    ).toBe(true);
  });
});
