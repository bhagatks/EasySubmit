import { describe, expect, it } from "vitest";
import { lightSkillsMerge } from "@/lib/job-tracker/enhance/light-skills-merge";
import type {
  JobAnalysisBundle,
  ResumePrepBundle,
} from "@/lib/job-tracker/enhance/pipeline-track-types";
import { makeEmptyIntelligence } from "@/lib/job-tracker/jd/jd-intelligence";
import { emptyJdSkillsVocabulary } from "@/lib/job-tracker/jd/jd-skills-types";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";

function minimalForm(skillsText: string): HubRefineryForm {
  return {
    firstName: "A",
    lastName: "B",
    email: "a@b.com",
    phone: "",
    linkedIn: "",
    cityState: "",
    professionalSummary: "Summary text here for identity.",
    skillsText,
    experience: [
      {
        id: "e1",
        title: "Engineer",
        company: "Acme",
        location: "",
        startMonth: "Jan",
        startYear: "2020",
        endMonth: "",
        endYear: "Present",
        bullets: "Built Python services on AWS",
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
}

function jobBundle(mustHave: string[]): JobAnalysisBundle {
  const intelligence = makeEmptyIntelligence();
  intelligence.mustHaveSkills = mustHave;
  intelligence.tier1Keywords = mustHave;
  return {
    descriptionHash: "abc",
    segments: {
      requirements: "req",
      responsibilities: "resp",
      preferred: "",
      context: "",
      source: "full-text",
      wordCount: { requirements: 1, responsibilities: 1, preferred: 0 },
    },
    intelligence,
    skillsVocabulary: emptyJdSkillsVocabulary("abc"),
    jdAiAttempted: true,
    jdAiCallCount: 1,
    cacheHit: false,
    hasJd: true,
    platform: {
      id: "unknown",
      label: "Unknown",
      strategy: "keyword_search",
      strategyInstructions: "",
      tip: "",
    },
  };
}

function resumeBundle(form: HubRefineryForm): ResumePrepBundle {
  return {
    form,
    sourceProfileId: "p1",
    profileTargetTitle: "Engineer",
    skillsList: form.skillsText.split(",").map((s) => s.trim()).filter(Boolean),
    summaryText: form.professionalSummary,
    pageBudget: 1,
    yearsExperience: 5,
    senioritySignal: "mid",
    promptExperience: form.experience,
    experienceSourceBlob: "Engineer Acme Built Python",
    summaryValidation: {
      valid: true,
      sentenceCount: 1,
      wordCount: 5,
      bannedWords: [],
      warnings: [],
    },
    skillsValidation: { compositionOk: true, banned: [] },
    mashedRolesFound: 0,
    experienceEntryCount: 1,
    profileUpdatedAt: null,
    roleVocabulary: {
      matchedTitle: "Engineer",
      onetCode: "",
      skills: ["Systems Analysis"],
      tools: ["Git"],
      source: "api",
    },
  };
}

describe("lightSkillsMerge", () => {
  it("adds JD must-have skills not already on the resume", () => {
    const form = minimalForm("JavaScript, React");
    const merge = lightSkillsMerge(
      jobBundle(["Python", "AWS"]),
      resumeBundle(form),
      "Software Engineer",
    );

    const skills = merge.form.skillsText.toLowerCase();
    expect(skills).toContain("python");
    expect(skills).toContain("aws");
    expect(merge.skillsAdded.length).toBeGreaterThan(0);
    expect(merge.directive.mustAddSkills.length).toBeGreaterThan(0);
  });
});
