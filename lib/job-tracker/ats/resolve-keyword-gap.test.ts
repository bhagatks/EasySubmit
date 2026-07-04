import { describe, expect, it } from "vitest";
import type { PrimeResumeData } from "@/components/onboarding/PrimeResume";
import { analyzeKeywordGap } from "@/lib/job-tracker/ats/keyword-gap";
import {
  jdIntelligenceHasKeywords,
  resolveKeywordGap,
} from "@/lib/job-tracker/ats/resolve-keyword-gap";
import type { JDIntelligence } from "@/lib/job-tracker/jd/jd-intelligence";

const resume: PrimeResumeData = {
  fullName: "Jane Doe",
  email: "jane@example.com",
  phone: "555-0100",
  summary: "Engineer with Python and AWS experience.",
  skills: ["Python", "AWS"],
  experience: [
    {
      title: "Engineer",
      company: "Acme",
      bullets: ["Built APIs with Python"],
    },
  ],
};

const jd = "Python AWS Docker Kubernetes required. Python AWS Docker Kubernetes required.";

const intel: JDIntelligence = {
  extractedJobTitle: "Software Engineer",
  mustHaveSkills: [],
  mustHaveYearsExp: null,
  mustHaveDegree: null,
  mustHaveCerts: [],
  preferredSkills: [],
  preferredDomain: [],
  seniority: "senior",
  scope: "ic",
  domain: "software-engineering",
  industryDomain: [],
  tier1Keywords: ["Python", "AWS", "Docker"],
  tier2Keywords: ["Kubernetes"],
  tier3Keywords: [],
  summaryTheme: "",
  targetVerbs: [],
  deliverables: [],
  impactDimensions: [],
  emphasisAreas: [],
  deprioritize: [],
  velocitySignal: null,
  ownershipLevel: null,
  source: "deterministic",
  confidence: 1,
  extractedAt: new Date().toISOString(),
};

describe("resolveKeywordGap", () => {
  it("uses intelligence path when tier keywords exist", () => {
    const gap = resolveKeywordGap(resume, "Engineer", jd, intel);
    expect(gap.coveragePercent).toBeGreaterThan(0);
    expect(gap.matched.some((m) => m.keyword === "Python")).toBe(true);
  });

  it("falls back to raw JD gap when intelligence is empty", () => {
    const emptyIntel = { ...intel, tier1Keywords: [], tier2Keywords: [], tier3Keywords: [] };
    expect(jdIntelligenceHasKeywords(emptyIntel)).toBe(false);
    const intelGap = resolveKeywordGap(resume, "Engineer", jd, emptyIntel);
    const rawGap = analyzeKeywordGap(resume, "Engineer", jd);
    expect(intelGap.coveragePercent).toBe(rawGap.coveragePercent);
  });

  it("falls back to raw JD gap when intelligence is null", () => {
    const resolved = resolveKeywordGap(resume, "Engineer", jd, null);
    const raw = analyzeKeywordGap(resume, "Engineer", jd);
    expect(resolved.coveragePercent).toBe(raw.coveragePercent);
  });
});
