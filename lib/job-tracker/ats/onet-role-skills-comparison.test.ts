/**
 * Compare JD Skills Framework (posting-specific) vs O*NET Role Skills (occupation norms)
 * on a single Software Engineer job fixture.
 */
import { describe, expect, it } from "vitest";
import { buildGroupedSkills } from "@/lib/job-tracker/enhance/merge-skills-grouped";
import { fetchRoleVocabulary } from "@/lib/job-tracker/ats/onet-service";
import {
  fetchJdSkillsVocabulary,
  jdSkillLabels,
} from "@/lib/job-tracker/jd/jd-skills-service";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";

const TARGET_ROLE = "Software Developer";

const SAMPLE_JD = `
Senior Software Developer — Python, Kubernetes, CI/CD, PostgreSQL, and AWS required.
Build scalable REST APIs and microservices. Experience with Docker, Git, and Agile required.
Design cloud-native systems and mentor junior engineers.
`.repeat(2);

const SAMPLE_FORM = {
  professionalSummary:
    "Software engineer with 8 years building web platforms and backend services.",
  skillsText: "TypeScript, React, Node.js, PostgreSQL",
  experience: [
    {
      title: "Senior Software Engineer",
      company: "Acme Corp",
      bullets: "Built REST APIs with Node.js and PostgreSQL. Deployed services on AWS with Docker.",
    },
  ],
} as HubRefineryForm;

describe("JD Skills vs O*NET Role Skills — one job comparison", () => {
  it("shows how each framework changes the skills merge", async () => {
    const jdVocabulary = await fetchJdSkillsVocabulary({
      jobDescription: SAMPLE_JD,
      targetRole: TARGET_ROLE,
      useExternalExtract: false,
    });

    const roleVocabulary = await fetchRoleVocabulary(TARGET_ROLE);

    const mergeBase = {
      existingSkillsText: SAMPLE_FORM.skillsText ?? "",
      jdVocabulary,
      mustAddSkills: jdSkillLabels(jdVocabulary).slice(0, 8),
      keywordSkills: [],
      skillsToRemove: [],
      form: SAMPLE_FORM,
      targetRole: TARGET_ROLE,
    };

    const withoutOnet = buildGroupedSkills(mergeBase);
    const withOnet = buildGroupedSkills({
      ...mergeBase,
      roleVocabulary,
    });

    const jdOnly = jdSkillLabels(jdVocabulary);
    const onetOnly = [
      ...roleVocabulary.skills,
      ...roleVocabulary.tools,
    ].filter(
      (term) => !jdOnly.some((jd) => jd.toLowerCase() === term.toLowerCase()),
    );

    const addedByOnet = withOnet.grouped.resumeSkills.filter(
      (skill) => !withoutOnet.grouped.resumeSkills.includes(skill),
    );

    // eslint-disable-next-line no-console -- intentional QA output for one-job comparison
    console.log("\n=== One job: JD Skills vs O*NET Role Skills ===");
    console.log("Target role:", TARGET_ROLE);
    console.log("O*NET match:", roleVocabulary.matchedTitle, roleVocabulary.onetCode);
    console.log("O*NET source:", roleVocabulary.source);
    console.log("\nJD Skills Framework (this posting):", jdOnly.slice(0, 15));
    console.log("O*NET occupation norms (not in JD group):", onetOnly.slice(0, 15));
    console.log("\nSkills merge WITHOUT O*NET:");
    console.log("  JD group:", withoutOnet.grouped.jdSkills);
    console.log("  Resume group:", withoutOnet.grouped.resumeSkills);
    console.log("\nSkills merge WITH O*NET:");
    console.log("  JD group:", withOnet.grouped.jdSkills);
    console.log("  Resume group:", withOnet.grouped.resumeSkills);
    console.log("  Added to resume group by O*NET:", addedByOnet);
    console.log("================================================\n");

    expect(jdOnly.length).toBeGreaterThan(0);
    expect(withoutOnet.grouped.jdSkills.length).toBeGreaterThan(0);

    if (process.env.ONET_API_KEY?.trim()) {
      expect(roleVocabulary.source).toMatch(/api|cache/);
      expect(roleVocabulary.skills.length + roleVocabulary.tools.length).toBeGreaterThan(0);
    } else {
      expect(roleVocabulary.source).toBe("fallback");
    }
  });
});
