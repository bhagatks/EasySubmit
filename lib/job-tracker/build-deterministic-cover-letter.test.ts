import { describe, expect, it } from "vitest";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";
import {
  buildCoverLetterParserInput,
  buildCoverLetterSeedPatch,
  buildDeterministicCoverLetterMarkdown,
  hubRefineryFormToResumeMarkdown,
} from "@/lib/job-tracker/build-deterministic-cover-letter";
import { countTemplateWords, DETERMINISTIC_COVER_LETTER_WORD_TARGET } from "@/lib/job-tracker/cover-letter-template-matrix";

const form = {
  ...emptyHubRefineryForm(),
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  cityState: "London, UK",
  professionalSummary:
    "Platform engineer with ten years building reliable backend systems at scale.",
  skillsText: "TypeScript, PostgreSQL, AWS",
  experience: [
    {
      id: "1",
      title: "Staff Engineer",
      company: "Analytical Engines",
      location: "",
      startMonth: "03",
      startYear: "2021",
      endMonth: "",
      endYear: "",
      bullets: "- Scaled platform services to 10M+ users with TypeScript",
      hidden: false,
    },
  ],
};

const tailorInput = {
  form,
  targetTitle: "Senior Platform Engineer",
  company: "Acme Corp",
  jobTitle: "Senior Platform Engineer",
  jobDescription:
    "Acme Corp is hiring a Senior Platform Engineer. Requirements: TypeScript, PostgreSQL, AWS.",
};

describe("buildDeterministicCoverLetterMarkdown", () => {
  it("builds markdown from form + JD without AI clichés", () => {
    const result = buildDeterministicCoverLetterMarkdown(tailorInput);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.markdown).toContain("Ada Lovelace");
    expect(result.markdown).toContain("Acme Corp");
    expect(result.markdown).toContain("Senior Platform Engineer");
    expect(result.markdown).toContain("TypeScript");
    expect(result.markdown).toMatch(/Dear Acme Corp hiring team/i);
    expect(result.markdown).not.toMatch(/incredibly thrilled|fast-paced digital world/i);

    const bodyWords = countTemplateWords(
      result.markdown.split("Dear ")[1] ?? result.markdown,
    );
    expect(bodyWords).toBeGreaterThanOrEqual(DETERMINISTIC_COVER_LETTER_WORD_TARGET.min - 20);
  });

  it("is deterministic for the same company", () => {
    const a = buildDeterministicCoverLetterMarkdown(tailorInput);
    const b = buildDeterministicCoverLetterMarkdown(tailorInput);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.markdown).toBe(b.markdown);
  });
});

describe("buildCoverLetterSeedPatch", () => {
  it("returns cover letter + latex when cover is empty", () => {
    const patch = buildCoverLetterSeedPatch({
      ...tailorInput,
      existingCoverLetter: "   ",
    });

    expect(patch).not.toBeNull();
    expect(patch?.coverLetter).toMatch(/Dear Acme Corp hiring team/i);
    expect(patch?.coverLetterLatex).toContain("\\begin{document}");
  });

  it("skips seeding when a cover letter already exists", () => {
    const patch = buildCoverLetterSeedPatch({
      ...tailorInput,
      existingCoverLetter: "Dear team,\n\nCustom draft.",
    });

    expect(patch).toBeNull();
  });
});

describe("hubRefineryFormToResumeMarkdown", () => {
  it("serializes contact, skills, and experience for the parser", () => {
    const md = hubRefineryFormToResumeMarkdown(form, "Senior Platform Engineer");
    expect(md).toContain("# Ada Lovelace");
    expect(md).toContain("## Skills");
    expect(md).toContain("Staff Engineer at Analytical Engines");
  });

  it("merge prefers structured form fields", () => {
    const merged = buildCoverLetterParserInput(tailorInput);
    expect(merged.resume.candidateName.value).toBe("Ada Lovelace");
    expect(merged.job.companyName.value).toBe("Acme Corp");
    expect(merged.resume.topSkills.value).toContain("TypeScript");
  });
});
