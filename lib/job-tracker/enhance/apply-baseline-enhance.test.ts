import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock("@/src/lib/services/config-service", () => ({
  getAppConfig: vi.fn(async () => ({})),
  isSubscribed: vi.fn(() => false),
}));

import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { analyzeJobIntelligence } from "@/lib/job-tracker/ats/job-intelligence";
import { computeResumeReadiness } from "@/lib/job-tracker/ats/resume-readiness-score";
import { applyBaselineEnhance } from "@/lib/job-tracker/enhance/apply-baseline-enhance";
import { buildEnhancePlan } from "@/lib/job-tracker/enhance/enhance-plan";
import { buildJdAtomList } from "@/lib/job-tracker/enhance/build-jd-atom-list";
import { buildJdCoverageReport } from "@/lib/job-tracker/enhance/build-jd-coverage-report";
import { resolveSummaryIdentity } from "@/lib/job-tracker/enhance/resolve-summary-identity";
import type { ResumeEnhanceBrief } from "@/lib/job-tracker/enhance/enhance-brief";
import { analyzeJobDescriptionSync } from "@/lib/job-tracker/jd/jd-brain";
import { buildResumeEnhanceDirective } from "@/lib/job-tracker/jd/jd-directive";
import { parseSkillsText } from "@/lib/resume/skills-rules";
import { refineryFormToPrimeResume } from "@/lib/onboarding/hubResume";

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
  education: [],
  certifications: [],
  projects: [],
  languages: [],
  customSections: [],
  pageLengthPreference: "auto",
};

const JD = `
Senior Software Engineer with Python, AWS, and Docker experience.
Python Python Python. AWS AWS. Docker Docker.
`;

function buildBrief(form: HubRefineryForm): ResumeEnhanceBrief {
  const targetRole = "Senior Software Engineer";
  const intel = analyzeJobIntelligence(form, targetRole, JD);
  const jdResult = analyzeJobDescriptionSync(JD, targetRole);
  const directive = buildResumeEnhanceDirective(jdResult.intelligence, parseSkillsText(form.skillsText ?? ""));
  const plan = buildEnhancePlan(form, intel, directive);
  const atoms = buildJdAtomList(jdResult.intelligence, directive);
  const readiness = computeResumeReadiness(refineryFormToPrimeResume(form), targetRole, JD);
  const summaryIdentity = resolveSummaryIdentity({
    profileTargetTitle: targetRole,
    form,
    jdTargetRole: targetRole,
    jdKeywords: jdResult.intelligence.keywords,
    jdDomain: jdResult.intelligence.domain,
  });

  return {
    traceId: "trace-test",
    surface: "job_apply",
    variant: "job_tailor",
    targetRole,
    hasJd: true,
    jdAiCallCount: 0,
    structural: {
      warnings: [],
      mashedRolesFound: 0,
      experienceEntryCount: form.experience?.length ?? 0,
      bulletCountsByRole: [3],
      pageBudget: 1,
    },
    summary: {
      text: form.professionalSummary ?? "",
      valid: true,
      warnings: plan.summaryWarnings,
      sentenceCount: 1,
      wordCount: 10,
      bannedWords: [],
    },
    skills: {
      list: parseSkillsText(form.skillsText ?? ""),
      jdSkills: directive.mustAddSkills,
      resumeSkills: parseSkillsText(form.skillsText ?? ""),
      warnings: [],
      banned: [],
      count: parseSkillsText(form.skillsText ?? "").length,
      compositionOk: true,
    },
    experience: { weakBullets: plan.weakBullets },
    jd: {
      segments: jdResult.segments,
      intelligence: jdResult.intelligence,
      skillsVocabulary: {
        skills: directive.mustAddSkills,
        descriptionHash: "hash",
        source: "fallback",
        providersUsed: ["deterministic"],
      },
      directive,
      keywordGap: intel.keywordGap,
      jobIntelligence: intel,
      atoms,
      anchorScores: [],
      coverageBefore: buildJdCoverageReport({
        form,
        atoms,
        skills: parseSkillsText(form.skillsText ?? ""),
        summary: form.professionalSummary,
      }),
    },
    onet: {
      matchedTitle: targetRole,
      onetCode: "15-1252.00",
      skills: [],
      tools: [],
      source: "fallback",
    },
    readiness,
    plan,
    summaryIdentity,
  };
}

describe("applyBaselineEnhance", () => {
  it("applies skills, bullets, and summary updates from brief", () => {
    const brief = buildBrief(BASE_FORM);
    const result = applyBaselineEnhance(BASE_FORM, brief, "trace-test", "user-1");

    expect(result.changes.skillsAdded.length + result.changes.bulletsRewritten).toBeGreaterThan(0);
    expect(result.form.skillsText).not.toBe(BASE_FORM.skillsText);
    expect(result.enhanceSummary.length).toBeGreaterThan(0);
    expect(result.coverageAfter?.coveragePercent).toBeGreaterThanOrEqual(0);
  });
});
