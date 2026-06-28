import { describe, expect, it } from "vitest";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { analyzeJobIntelligence } from "@/lib/job-tracker/ats/job-intelligence";
import { deterministicEnhance } from "@/lib/job-tracker/ats/deterministic-enhancer";
import { applyEnhancePlan } from "@/lib/job-tracker/enhance/apply-enhance-plan";
import { buildEnhancePlan } from "@/lib/job-tracker/enhance/enhance-plan";
import { analyzeJobDescriptionSync } from "@/lib/job-tracker/jd/jd-brain";
import { buildResumeEnhanceDirective } from "@/lib/job-tracker/jd/jd-directive";
import { parseSkillsText } from "@/lib/resume/skills-rules";

const BASE_FORM: HubRefineryForm = {
  firstName: "Jane",
  lastName: "Smith",
  email: "jane@example.com",
  phone: "+1 415 555 0100",
  cityState: "San Francisco, CA",
  linkedIn: "linkedin.com/in/janesmith",
  professionalSummary: "Senior software engineer with 8 years building scalable systems.",
  skillsText: "TypeScript, React, Node.js, PostgreSQL",
  experience: [
    {
      id: "exp-0",
      title: "Senior Software Engineer",
      company: "Acme Corp",
      location: "San Francisco, CA",
      startMonth: "Jan",
      startYear: "2020",
      endMonth: "",
      endYear: "Present",
      bullets: [
        "Responsible for the backend microservices platform",
        "Helped with CI/CD pipeline deployments",
        "Built monitoring dashboard used by 3 teams",
      ].join("\n"),
      hidden: false,
    },
  ],
  education: [
    {
      id: "edu-0",
      school: "UC Berkeley",
      degree: "B.S. Computer Science",
      location: "",
      startMonth: "",
      startYear: "2012",
      endMonth: "",
      endYear: "2016",
      hidden: false,
    },
  ],
  certifications: [],
  projects: [],
  languages: [],
  customSections: [],
  pageLengthPreference: "auto" as const,
};

const JD_WITH_MISSING = `
  We are looking for a Senior Software Engineer with strong Python and AWS skills.
  Must have Python experience, AWS experience, and Docker containerization.
  Python Python Python. AWS AWS. Docker Docker Docker.
  Experience with Kubernetes and Terraform is a plus. Kubernetes Kubernetes.
`;

function directiveForJd(form: HubRefineryForm, jd: string) {
  const jdResult = analyzeJobDescriptionSync(jd, "Senior Software Engineer");
  const skills = parseSkillsText(form.skillsText ?? "");
  return buildResumeEnhanceDirective(jdResult.intelligence, skills);
}

describe("buildEnhancePlan branch coverage", () => {
  it("returns no summaryWarnings for empty professionalSummary", () => {
    const form: HubRefineryForm = { ...BASE_FORM, professionalSummary: "" };
    const intel = analyzeJobIntelligence(form, "Senior Software Engineer", JD_WITH_MISSING);
    const plan = buildEnhancePlan(form, intel);
    expect(plan.summaryWarnings).toHaveLength(0);
  });

  it("warns about word count when summary is too short", () => {
    const form: HubRefineryForm = {
      ...BASE_FORM,
      professionalSummary: "Short summary only one sentence.",
    };
    const intel = analyzeJobIntelligence(form, "Senior Software Engineer", JD_WITH_MISSING);
    const plan = buildEnhancePlan(form, intel);
    expect(plan.summaryWarnings.some((w) => w.includes("words"))).toBe(true);
  });

  it("warns about banned words in summary", () => {
    const form: HubRefineryForm = {
      ...BASE_FORM,
      professionalSummary:
        "I am a passionate results-driven team player who is detail-oriented. I have leveraged synergies across teams. I excel at thinking outside the box on complex problems. I deliver value.",
    };
    const intel = analyzeJobIntelligence(form, "Senior Software Engineer", JD_WITH_MISSING);
    const plan = buildEnhancePlan(form, intel);
    expect(plan.summaryWarnings.some((w) => w.includes("overused phrases"))).toBe(true);
  });

  it("includes targetRole and directive fields when provided", () => {
    const intel = analyzeJobIntelligence(BASE_FORM, "Senior Software Engineer", JD_WITH_MISSING);
    const directive = directiveForJd(BASE_FORM, JD_WITH_MISSING);
    const plan = buildEnhancePlan(BASE_FORM, intel, directive, "Staff Engineer");
    expect(plan.targetRole).toBe("Staff Engineer");
    expect(plan.summaryTheme).toBe(directive.summaryTheme);
    expect(plan.roleLevel).toBe(directive.roleLevel);
  });
});

describe("buildEnhancePlan", () => {
  it("uses JD Brain mustAddSkills instead of raw keyword-gap tokens", () => {
    const intel = analyzeJobIntelligence(BASE_FORM, "Senior Software Engineer", JD_WITH_MISSING);
    const directive = directiveForJd(BASE_FORM, JD_WITH_MISSING);

    const plan = buildEnhancePlan(BASE_FORM, intel, directive);

    expect(plan.skillsToAdd).toEqual(directive.mustAddSkills);
    expect(plan.skillsToAdd).not.toEqual(intel.skillsToAdd);
  });

  it("flags summary issues without rewriting", () => {
    const intel = analyzeJobIntelligence(BASE_FORM, "Senior Software Engineer", JD_WITH_MISSING);
    const directive = directiveForJd(BASE_FORM, JD_WITH_MISSING);
    const plan = buildEnhancePlan(BASE_FORM, intel, directive);

    expect(plan.summaryWarnings.length).toBeGreaterThan(0);
  });
});

describe("applyEnhancePlan", () => {
  it("rewrites professionalSummary when plan flags summary issues", () => {
    const intel = analyzeJobIntelligence(BASE_FORM, "Senior Software Engineer", JD_WITH_MISSING);
    const directive = directiveForJd(BASE_FORM, JD_WITH_MISSING);
    const plan = buildEnhancePlan(BASE_FORM, intel, directive);
    const result = applyEnhancePlan(BASE_FORM, plan);

    expect(plan.summaryWarnings.length).toBeGreaterThan(0);
    expect(result.form.professionalSummary).not.toBe(BASE_FORM.professionalSummary);
    expect(result.form.professionalSummary.split(/(?<=[.!?])\s+/).length).toBe(4);
  });
});

describe("deterministicEnhance", () => {
  it("injects JD Brain mustAddSkills into skillsText", () => {
    const intel = analyzeJobIntelligence(BASE_FORM, "Senior Software Engineer", JD_WITH_MISSING);
    const directive = directiveForJd(BASE_FORM, JD_WITH_MISSING);
    const result = deterministicEnhance(BASE_FORM, intel, directive);

    if (directive.mustAddSkills.length > 0) {
      expect(result.changes.skillsAdded.length).toBeGreaterThan(0);
      const addedLower = result.changes.skillsAdded.map((s) => s.toLowerCase());
      expect(
        directive.mustAddSkills.some((skill) => addedLower.includes(skill.toLowerCase())),
      ).toBe(true);
    }
  });

  it("does not inject raw keyword-gap junk when directive has no mustAddSkills", () => {
    const intel = analyzeJobIntelligence(BASE_FORM, "Senior Software Engineer", JD_WITH_MISSING);
    const result = deterministicEnhance(BASE_FORM, intel, {
      mustAddSkills: [],
      mustRemoveSkills: [],
      mustWeaveKeywords: [],
      effectiveTargetRole: null,
      roleLevel: "senior",
      scope: "ic",
      targetVerbs: [],
      impactDimensions: [],
      quantHints: [],
      summaryTheme: "",
      emphasisAreas: [],
      deprioritize: [],
      cultureSignals: { velocity: null, ownership: null, industry: [] },
    });

    expect(result.changes.skillsAdded).toHaveLength(0);
    expect(result.form.skillsText).toBe(BASE_FORM.skillsText);
  });

  it("does not duplicate existing skills", () => {
    const intel = analyzeJobIntelligence(BASE_FORM, "Senior Software Engineer", JD_WITH_MISSING);
    const directive = directiveForJd(BASE_FORM, JD_WITH_MISSING);
    const result = deterministicEnhance(BASE_FORM, intel, directive);

    const skillsList = result.form.skillsText
      .split(/[,;\n|]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const uniqueSkills = new Set(skillsList);
    expect(skillsList.length).toBe(uniqueSkills.size);
  });

  it("rewrites weak bullets without stacking verbs", () => {
    const form: HubRefineryForm = {
      ...BASE_FORM,
      experience: [
        {
          ...BASE_FORM.experience[0]!,
          bullets: [
            "Lead the 7Now Delivery Platform engineering initiatives",
            "Define and implement technical direction for mobile apps",
            "Built monitoring dashboard used by 3 teams",
          ].join("\n"),
        },
      ],
    };

    const intel = analyzeJobIntelligence(form, "Senior Software Engineer", JD_WITH_MISSING);
    const directive = directiveForJd(form, JD_WITH_MISSING);
    const result = deterministicEnhance(form, intel, directive);

    const bullets = (result.form.experience[0]?.bullets ?? "").split("\n").filter(Boolean);
    expect(bullets.some((b) => /\bLed lead\b/i.test(b))).toBe(false);
    expect(bullets.some((b) => /\bBuilt define\b/i.test(b))).toBe(false);
    expect(bullets[0]?.startsWith("Led the 7Now")).toBe(true);
  });

  it("rewrites weak bullets", () => {
    const intel = analyzeJobIntelligence(BASE_FORM, "Senior Software Engineer", JD_WITH_MISSING);
    const directive = directiveForJd(BASE_FORM, JD_WITH_MISSING);
    const result = deterministicEnhance(BASE_FORM, intel, directive);

    expect(result.changes.bulletsRewritten).toBeGreaterThan(0);
    const bullets = (result.form.experience[0]?.bullets ?? "").split("\n").filter(Boolean);
    expect(bullets.some((b) => /^responsible for/i.test(b))).toBe(false);
    expect(bullets.some((b) => /^helped (to |with )?/i.test(b))).toBe(false);
  });

  it("returns a non-empty summary", () => {
    const intel = analyzeJobIntelligence(BASE_FORM, "Senior Software Engineer", JD_WITH_MISSING);
    const directive = directiveForJd(BASE_FORM, JD_WITH_MISSING);
    const result = deterministicEnhance(BASE_FORM, intel, directive);
    expect(result.summary.length).toBeGreaterThan(10);
  });

  it("no-ops on skills when directive is empty", () => {
    const emptyIntel = analyzeJobIntelligence(BASE_FORM, "Senior Software Engineer", "");
    const result = deterministicEnhance(BASE_FORM, emptyIntel);
    expect(result.changes.skillsAdded).toHaveLength(0);
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it("preserves contact fields", () => {
    const intel = analyzeJobIntelligence(BASE_FORM, "Senior Software Engineer", JD_WITH_MISSING);
    const directive = directiveForJd(BASE_FORM, JD_WITH_MISSING);
    const result = deterministicEnhance(BASE_FORM, intel, directive);
    expect(result.form.firstName).toBe(BASE_FORM.firstName);
    expect(result.form.email).toBe(BASE_FORM.email);
    expect(result.form.phone).toBe(BASE_FORM.phone);
  });

  it("preserves experience metadata (id, company, dates)", () => {
    const intel = analyzeJobIntelligence(BASE_FORM, "Senior Software Engineer", JD_WITH_MISSING);
    const directive = directiveForJd(BASE_FORM, JD_WITH_MISSING);
    const result = deterministicEnhance(BASE_FORM, intel, directive);
    const exp = result.form.experience[0]!;
    expect(exp.id).toBe("exp-0");
    expect(exp.company).toBe("Acme Corp");
    expect(exp.startYear).toBe("2020");
  });
});
