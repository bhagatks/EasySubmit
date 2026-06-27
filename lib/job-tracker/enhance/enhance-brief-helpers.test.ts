import { describe, expect, it } from "vitest";
import { buildJdAtomList } from "@/lib/job-tracker/enhance/build-jd-atom-list";
import { buildJdCoverageReport } from "@/lib/job-tracker/enhance/build-jd-coverage-report";
import { scoreBulletAnchors } from "@/lib/job-tracker/enhance/score-bullet-anchors";
import { makeEmptyIntelligence } from "@/lib/job-tracker/jd/jd-intelligence";
import type { ResumeEnhanceDirective } from "@/lib/job-tracker/jd/jd-intelligence";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";

const directive: ResumeEnhanceDirective = {
  mustAddSkills: ["Python"],
  mustRemoveSkills: [],
  mustWeaveKeywords: ["microservices"],
  effectiveTargetRole: "Software Engineer",
  roleLevel: "senior",
  scope: "ic",
  targetVerbs: [],
  impactDimensions: [],
  quantHints: [],
  summaryTheme: "",
  emphasisAreas: [],
  deprioritize: [],
  cultureSignals: { velocity: null, ownership: null, industry: [] },
};

describe("JD coverage helpers", () => {
  it("builds atoms from intelligence + directive", () => {
    const intel = {
      ...makeEmptyIntelligence(),
      tier1Keywords: ["python", "aws"],
      tier2Keywords: ["docker"],
    };
    const atoms = buildJdAtomList(intel, directive);
    expect(atoms.length).toBeGreaterThan(0);
    expect(atoms.some((a) => a.label.toLowerCase().includes("python"))).toBe(true);
  });

  it("scores bullet anchors and reports coverage", () => {
    const form: HubRefineryForm = {
      professionalSummary: "Engineer with Python experience",
      skillsText: "Python, AWS",
      experience: [
        {
          title: "Backend Engineer",
          company: "Co",
          bullets: "Built microservices on AWS using Python",
        },
      ],
    };
    const intel = {
      ...makeEmptyIntelligence(),
      tier1Keywords: ["python", "aws", "microservices"],
    };
    const atoms = buildJdAtomList(intel, directive);
    const anchors = scoreBulletAnchors(form, atoms);
    expect(anchors.length).toBeGreaterThan(0);

    const report = buildJdCoverageReport({ form, atoms });
    expect(report.coveragePercent).toBeGreaterThan(0);
  });
});
