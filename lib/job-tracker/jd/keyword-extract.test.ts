import { describe, it, expect } from "vitest";
import {
  extractRankedKeywords,
  isKnownSkillToken,
  looksLikeTechTerm,
  tokenizeJobText,
} from "@/lib/job-tracker/jd/keyword-extract";
import { extractJDIntelligenceSync } from "@/lib/job-tracker/jd/jd-extractor";
import { buildResumeEnhanceDirective } from "@/lib/job-tracker/jd/jd-directive";
import { isBannedSkill, SKILLS_HARD_MAX } from "@/lib/resume/skills-rules";
import { analyzeKeywordGap } from "@/lib/job-tracker/ats/keyword-gap";
import { analyzeJobIntelligence } from "@/lib/job-tracker/ats/job-intelligence";
import type { PrimeResumeData } from "@/components/onboarding/PrimeResume";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import type { JDSegments } from "@/lib/job-tracker/jd/jd-intelligence";

describe("deterministic mustAddSkills pipeline", () => {
  const segments: JDSegments = {
    requirements: [
      "The ability to drive outcomes and ensure quality.",
      "Required: React Native, CI/CD, Python, AWS.",
      "Strong communication and teamwork.",
    ].join(" "),
    responsibilities: "Build mobile features with React Native.",
    preferred: "",
    context: "",
    source: "heuristic",
    wordCount: { requirements: 20, responsibilities: 6, preferred: 0 },
  };

  function mustAddSkillsFromJd(resumeSkills: string[] = []) {
    const intelligence = extractJDIntelligenceSync(segments, "Software Engineer");
    return buildResumeEnhanceDirective(intelligence, resumeSkills).mustAddSkills;
  }

  it("excludes junk verbs and filler from mustAddSkills", () => {
    const skills = mustAddSkillsFromJd().map((s) => s.toLowerCase());
    for (const junk of ["the", "ensure", "drive", "ability to"]) {
      expect(skills).not.toContain(junk);
    }
  });

  it("includes taxonomy-backed technical skills in mustAddSkills", () => {
    const skills = mustAddSkillsFromJd().map((s) => s.toLowerCase());
    expect(skills).toContain("react native");
    expect(skills).toContain("ci/cd");
    expect(skills).toContain("python");
    expect(skills).toContain("aws");
  });

  it("caps mustAddSkills at SKILLS_HARD_MAX", () => {
    expect(mustAddSkillsFromJd().length).toBeLessThanOrEqual(SKILLS_HARD_MAX);
  });

  it("excludes banned soft skills from mustAddSkills", () => {
    const skills = mustAddSkillsFromJd();
    expect(skills.some((skill) => isBannedSkill(skill))).toBe(false);
    expect(skills.map((s) => s.toLowerCase())).not.toContain("communication");
    expect(skills.map((s) => s.toLowerCase())).not.toContain("teamwork");
  });
});

describe("keyword-extract", () => {
  it("rejects plain English and page-noise tokens", () => {
    for (const junk of ["please", "email", "com", "irhythm", "ensure", "drive", "planning"]) {
      expect(looksLikeTechTerm(junk)).toBe(false);
    }
  });

  it("accepts taxonomy-backed tech tokens", () => {
    for (const skill of ["python", "react", "kubernetes", "typescript", "aws"]) {
      expect(looksLikeTechTerm(skill)).toBe(true);
      expect(isKnownSkillToken(skill)).toBe(true);
    }
  });

  it("tokenizeJobText normalizes Node.js and C++", () => {
    const tokens = tokenizeJobText("Node.js and C++ required");
    expect(tokens).toContain("nodejs");
    expect(tokens).toContain("cplusplus");
  });

  it("extractRankedKeywords keeps skills from requirements, not HR filler", () => {
    const text = [
      "Please apply via email at jobs.example.com.",
      "Required: Python, Kubernetes, Docker, PostgreSQL.",
      "Strong communication and leadership required.",
    ].join(" ");

    const keywords = extractRankedKeywords(text, 20);
    expect(keywords).toContain("python");
    expect(keywords).toContain("kubernetes");
    expect(keywords).not.toContain("please");
    expect(keywords).not.toContain("email");
    expect(keywords).not.toContain("com");
    expect(keywords).not.toContain("communication");
  });
});

describe("analyzeKeywordGap junk filtering", () => {
  const resume: PrimeResumeData = {
    fullName: "Test User",
    skills: ["Python", "React"],
    experience: [],
    education: [],
  };

  const noisyJd = `
    iRhythm Technologies — please email careers@irhythm.com to apply.
    Required: Python, React, TypeScript. Python Python Python.
    Strong communication and ensure timely delivery.
  `;

  it("does not surface page-noise tokens as missing keywords", () => {
    const result = analyzeKeywordGap(resume, "Software Engineer", noisyJd);
    const allKeywords = [...result.matched, ...result.missing].map((k) =>
      typeof k === "string" ? k : k.keyword,
    );

    expect(allKeywords).not.toContain("please");
    expect(allKeywords).not.toContain("email");
    expect(allKeywords).not.toContain("com");
    expect(allKeywords).not.toContain("irhythm");
  });

  it("still matches real tech keywords", () => {
    const result = analyzeKeywordGap(resume, "Software Engineer", noisyJd);
    const matched = result.matched.map((m) => m.keyword);
    expect(matched).toContain("python");
    expect(matched).toContain("react");
  });
});

describe("analyzeJobIntelligence skillsToAdd", () => {
  const form = {
    skillsText: "Python, React",
    professionalSummary: "Engineer with backend experience.",
    experience: [{ title: "Engineer", company: "Co", bullets: "Built APIs", hidden: false }],
    education: [],
  } as unknown as HubRefineryForm;

  it("does not classify junk JD tokens as skills", () => {
    const jd = `
      Please apply at jobs.example.com. iRhythm is hiring.
      Required: Python, Kubernetes. Python Python.
    `;
    const intel = analyzeJobIntelligence(form, "Software Engineer", jd);
    expect(intel.skillsToAdd).not.toContain("please");
    expect(intel.skillsToAdd).not.toContain("com");
    expect(intel.skillsToAdd).not.toContain("irhythm");
  });
});
