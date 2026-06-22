import type { HubRefineryForm } from "@/lib/onboarding/hubResume";

export function buildCoverLetterSystemPrompt(): string {
  return [
    "You write concise, professional job cover letters.",
    "Output plain text only — no markdown, no JSON, no code fences.",
    "Use a warm professional tone. Keep the letter to 3–4 short paragraphs.",
    "Include a greeting (Dear …), body paragraphs, and a closing (Sincerely, + name).",
    "Do not invent employers, degrees, or metrics not supported by the candidate context.",
    "Never include contact lines (email, phone, address) — the template adds those.",
  ].join(" ");
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

  const experienceLines = input.form.experience
    .filter((entry) => !entry.hidden && (entry.title?.trim() || entry.company?.trim()))
    .slice(0, 3)
    .map((entry) => {
      const title = entry.title?.trim() || "Role";
      const org = entry.company?.trim() || "";
      return org ? `${title} at ${org}` : title;
    });

  const parts = [
    `Write a cover letter for ${name || "the candidate"} applying to ${company} for the ${role} position.`,
    "",
    "Candidate context:",
    `- Target role: ${input.targetTitle.trim() || role}`,
    summary ? `- Summary: ${summary}` : null,
    skills ? `- Skills: ${skills}` : null,
    experienceLines.length > 0 ? `- Recent roles: ${experienceLines.join("; ")}` : null,
    input.jobDescription?.trim()
      ? `\nJob description excerpt:\n${input.jobDescription.trim().slice(0, 2400)}`
      : null,
    input.existing?.trim()
      ? `\nRefine this existing draft (improve clarity and job fit; keep truthful facts):\n${input.existing.trim()}`
      : null,
  ].filter(Boolean);

  return parts.join("\n");
}

export function normalizeCoverLetterBody(text: string): string {
  return text
    .replace(/^```[\w]*\n?/gm, "")
    .replace(/```$/gm, "")
    .trim();
}
