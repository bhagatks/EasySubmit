import { describe, expect, it } from "vitest";
import { extractDeterministicJdSkills } from "@/lib/job-tracker/jd/jd-skills-deterministic";
import { serializeGroupedSkills, buildGroupedSkills } from "@/lib/job-tracker/enhance/merge-skills-grouped";
import { emptyJdSkillsVocabulary } from "@/lib/job-tracker/jd/jd-skills-types";
import {
  fetchJdSkillsVocabulary,
  jdSkillLabels,
} from "@/lib/job-tracker/jd/jd-skills-service";
import { hashJobDescription } from "@/lib/job-tracker/jd/jd-brain";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";

const TECH_JD = `
Senior Software Engineer — Python, Kubernetes, CI/CD required.
Build scalable APIs with PostgreSQL and AWS. Experience with Docker required.
`.repeat(3);

describe("JDSkillsFramework deterministic", () => {
  it("extracts taxonomy skills from JD text", () => {
    const skills = extractDeterministicJdSkills({
      jobDescription: TECH_JD,
      targetRole: "Software Engineer",
    });
    const labels = skills.map((s) => s.label.toLowerCase());
    expect(labels.some((l) => l.includes("python"))).toBe(true);
    expect(labels.some((l) => l.includes("kubernetes") || l.includes("k8s"))).toBe(true);
  });

  it("returns empty for blank JD", () => {
    expect(
      extractDeterministicJdSkills({ jobDescription: "", targetRole: "Engineer" }),
    ).toEqual([]);
  });
});

describe("fetchJdSkillsVocabulary", () => {
  it("returns empty vocabulary for blank JD", async () => {
    const vocab = await fetchJdSkillsVocabulary({
      jobDescription: "   ",
      targetRole: "Engineer",
      useExternalExtract: false,
    });
    expect(vocab.skills).toEqual([]);
    expect(vocab.source).toBe("fallback");
  });

  it("uses cached vocabulary when hash matches", async () => {
    const descriptionHash = hashJobDescription(TECH_JD);
    const cached = emptyJdSkillsVocabulary(descriptionHash);
    cached.skills = [{ label: "Python", source: "deterministic", confidence: 0.9 }];
    const vocab = await fetchJdSkillsVocabulary({
      jobDescription: TECH_JD,
      targetRole: "Software Engineer",
      cachedHash: descriptionHash,
      cachedVocabulary: cached,
      useExternalExtract: false,
    });
    expect(vocab.source).toBe("cache");
    expect(jdSkillLabels(vocab)).toContain("Python");
  });

  it("extracts deterministic skills without external providers", async () => {
    const vocab = await fetchJdSkillsVocabulary({
      jobDescription: TECH_JD,
      targetRole: "Software Engineer",
      useExternalExtract: false,
    });
    expect(vocab.skills.length).toBeGreaterThan(0);
    expect(vocab.providersUsed).toEqual(["deterministic"]);
    expect(jdSkillLabels(vocab).join(" ").toLowerCase()).toMatch(/python|kubernetes|docker/);
  });
});

describe("merge-skills-grouped", () => {
  const form = {
    professionalSummary: "",
    skillsText: "JavaScript, React",
    experience: [
      {
        title: "Engineer",
        company: "Co",
        bullets: "Built APIs with Python and AWS",
      },
    ],
  } as HubRefineryForm;

  it("serializes JD | resume groups", () => {
    const text = serializeGroupedSkills({
      jdSkills: ["Python", "Kubernetes"],
      resumeSkills: ["JavaScript", "React"],
    });
    expect(text).toContain(" | ");
    expect(text).toMatch(/Python.*JavaScript/);
  });

  it("caps total skills at SKILLS_HARD_MAX", () => {
    const vocab = {
      ...emptyJdSkillsVocabulary("abc"),
      skills: Array.from({ length: 25 }, (_, i) => ({
        label: `Skill${i}`,
        source: "deterministic" as const,
        confidence: 0.9,
      })),
    };
    const result = buildGroupedSkills({
      existingSkillsText: "JavaScript",
      jdVocabulary: vocab,
      mustAddSkills: [],
      keywordSkills: [],
      skillsToRemove: [],
      form,
      targetRole: "Engineer",
    });
    const total =
      result.grouped.jdSkills.length + result.grouped.resumeSkills.length;
    expect(total).toBeLessThanOrEqual(20);
  });
});
