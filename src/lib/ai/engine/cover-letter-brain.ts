import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import {
  COVER_LETTER_GENERATION_RULES,
  countCoverLetterWords,
} from "@/src/lib/ai/engine/cover-letter-rules";

function experienceHighlights(form: HubRefineryForm): string[] {
  return (form.experience ?? [])
    .filter((entry) => !entry.hidden && (entry.title?.trim() || entry.company?.trim()))
    .slice(0, 3)
    .map((entry) => {
      const title = entry.title?.trim() || "Role";
      const org = entry.company?.trim() || "";
      const header = org ? `${title} at ${org}` : title;
      const bullets = entry.bullets
        ?.split("\n")
        .map((line) => line.replace(/^[-•*]\s*/, "").trim())
        .filter(Boolean)
        .slice(0, 3);
      if (!bullets?.length) return header;
      return `${header}:\n  - ${bullets.join("\n  - ")}`;
    });
}

export function buildCoverLetterSystemPrompt(): string {
  return COVER_LETTER_GENERATION_RULES;
}

export function buildCoverLetterUserPrompt(input: {
  form: HubRefineryForm;
  targetTitle: string;
  company: string | null;
  jobTitle: string;
  jobDescription?: string | null;
  existing?: string | null;
}): string {
  const name = [input.form.firstName, input.form.lastName].filter(Boolean).join(" ").trim();
  const summary = input.form.professionalSummary?.trim() || "";
  const skills = input.form.skillsText?.trim() || "";
  const company = input.company?.trim() || "the hiring team";
  const role = input.jobTitle.trim() || input.targetTitle.trim() || "this role";
  const highlights = experienceHighlights(input.form);

  const tasks = input.existing?.trim()
    ? [
        "Refine the existing draft below.",
        "Improve personalization, structure, and JD alignment.",
        "Keep every fact truthful; do not invent experience or metrics.",
      ]
    : [
        "Write a new cover letter from scratch.",
        "Follow all structure and quality rules in the system prompt.",
        "Ground every claim in the candidate context below.",
      ];

  const parts = [
    `Candidate: ${name || "the applicant"}`,
    `Target role: ${role}`,
    `Company: ${company}`,
    "",
    "Tasks:",
    ...tasks.map((task) => `- ${task}`),
    "",
    "Candidate context (ground truth — do not invent beyond this):",
    `- Headline target role: ${input.targetTitle.trim() || role}`,
    summary ? `- Summary: ${summary}` : null,
    skills ? `- Skills: ${skills}` : null,
    highlights.length > 0
      ? `- Relevant experience:\n${highlights.map((h) => `  ${h.replace(/\n/g, "\n  ")}`).join("\n")}`
      : null,
    input.jobDescription?.trim()
      ? [
          "",
          "Job description (analyze for skills, leadership, technical needs, business goals):",
          '"""',
          input.jobDescription.trim().slice(0, 4000),
          '"""',
        ].join("\n")
      : null,
    input.existing?.trim()
      ? ["", "Existing draft to refine:", '"""', input.existing.trim(), '"""'].join("\n")
      : null,
    "",
    "Return only the final cover letter text.",
  ].filter(Boolean);

  return parts.join("\n");
}

/** Strip fences, trim commentary wrappers, normalize whitespace. */
export function normalizeCoverLetterBody(text: string): string {
  let body = text
    .replace(/^```[\w]*\n?/gm, "")
    .replace(/```$/gm, "")
    .trim();

  // Strip any model preamble before the greeting line.
  // Handles: Dear / Hello / Hi [Name] / To Whom It May Concern
  const greetingIndex = body.search(/\b(Dear|Hello|Hi\b|To Whom)\b/i);
  if (greetingIndex > 0) {
    body = body.slice(greetingIndex);
  }

  return body.trim();
}

export { countCoverLetterWords };
