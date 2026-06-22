import type { HubRefineryForm } from "@/lib/onboarding/hubResume";

export function buildCoverLetterDraft(input: {
  form: HubRefineryForm;
  targetTitle: string;
  company: string | null;
  jobTitle: string;
  jobDescription?: string | null;
}): string {
  const name = [input.form.firstName, input.form.lastName].filter(Boolean).join(" ").trim();
  const greeting = input.company?.trim() ? `Dear ${input.company} hiring team,` : "Dear hiring manager,";
  const role = input.jobTitle.trim() || input.targetTitle.trim() || "this role";

  const jdSnippet = input.jobDescription?.trim().slice(0, 280) ?? "";
  const motivation = jdSnippet
    ? `I am excited to apply for the ${role} position. My background in ${input.targetTitle || "this field"} aligns with your needs, including experience highlighted in your posting.`
    : `I am writing to express my interest in the ${role} position. My experience as ${input.targetTitle || "a qualified professional"} aligns well with what you are looking for.`;

  const closing = name ? `Sincerely,\n${name}` : "Sincerely,";

  return [greeting, "", motivation, "", "I would welcome the opportunity to discuss how I can contribute to your team.", "", closing].join(
    "\n",
  );
}
