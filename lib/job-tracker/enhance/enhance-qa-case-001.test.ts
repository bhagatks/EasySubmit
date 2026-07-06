/**
 * Case 001 regression — engineering profile × iRhythm Director, Procurement.
 * See docs/enhance-qa-playbook.md §6.
 */
import { describe, expect, it } from "vitest";
import { buildDeterministicSummary } from "@/lib/job-tracker/enhance/build-deterministic-summary";
import { resolveSummaryIdentity } from "@/lib/job-tracker/enhance/resolve-summary-identity";
import { postProcessSummaryOutput } from "@/lib/job-tracker/enhance/summary-grounding";
import { filterJdSkillLabels } from "@/lib/job-tracker/jd/jd-skill-filter";
import { stripBannedSummaryWords } from "@/lib/resume/summary-rules";
import {
  ENHANCE_QA_BASE_FORM,
  ENHANCE_QA_CASES,
} from "@/lib/job-tracker/enhance/enhance-qa-fixtures";

const CASE_001_FORM = ENHANCE_QA_BASE_FORM;
const CASE_001_JD_ROLE = ENHANCE_QA_CASES["001"].targetRole;
const CASE_001_JD_KEYWORDS = [
  "procurement",
  "strategic sourcing",
  "iso 13485",
  "fda",
  "category management",
  "p2p",
];

describe("enhance QA case 001 — engineering × procurement JD", () => {
  it("rejects HR/marketing junk skills from iRhythm-style JD vocabulary", () => {
    const filtered = filterJdSkillLabels([
      "Procurement",
      "Strategic Sourcing",
      "BIG",
      "CARE",
      "Patient",
      "Annual",
      "ISO 13485",
      "Risk Management",
    ]);
    expect(filtered).not.toContain("BIG");
    expect(filtered).not.toContain("CARE");
    expect(filtered).not.toContain("Patient");
    expect(filtered).toContain("Procurement");
    expect(filtered).toContain("ISO 13485");
  });

  it("keeps engineering identity for summary (AI off path)", () => {
    const identity = resolveSummaryIdentity({
      profileTargetTitle: "Director of Engineering",
      form: CASE_001_FORM,
      jdTargetRole: CASE_001_JD_ROLE,
      jdKeywords: CASE_001_JD_KEYWORDS,
      jdDomain: "procurement-supply-chain",
    });

    expect(identity.isCrossDomain).toBe(true);
    expect(identity.identity).not.toMatch(/procurement/i);

    const summary = buildDeterministicSummary({
      currentSummary: CASE_001_FORM.professionalSummary ?? "",
      skills: ["Cloud & DevOps", "Docker", "Full-Stack & APIs", "Gateways", "Mobile Development"],
      experience: CASE_001_FORM.experience ?? [],
      summaryIdentity: identity.identity,
      isCrossDomain: true,
    });

    expect(summary).toMatch(/Head of Engineering|Director/i);
    expect(summary).toMatch(/platform, mobile, and API engineering/i);
    expect(summary).toContain("Cloud & DevOps");
    expect(summary).toMatch(/transferable strengths/i);
    expect(summary).not.toMatch(/procurement|strategic sourcing|purchasing|systems design/i);
  });

  it("strips fabricated spend and [review] artifacts (AI on path)", () => {
    const identity = resolveSummaryIdentity({
      profileTargetTitle: "Director of Engineering",
      form: CASE_001_FORM,
      jdTargetRole: CASE_001_JD_ROLE,
      jdKeywords: CASE_001_JD_KEYWORDS,
      jdDomain: "procurement-supply-chain",
    });

    const experienceBlob = CASE_001_FORM.experience
      ?.map((e) => `${e.title} ${e.bullets}`)
      .join(" ");

    const { summary } = postProcessSummaryOutput(
      "Director, Procurement with 20 years. Leverages strategic sourcing to manage $100M in annual direct purchases.",
      { identity, experienceBlob: experienceBlob ?? "" },
    );

    expect(summary).not.toContain("[review]");
    expect(summary.toLowerCase()).not.toContain("$100m");
    expect(stripBannedSummaryWords("Leverages scale.")).not.toContain("[review]");
  });
});
