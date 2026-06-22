import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { buildCoverLetterContext } from "@/lib/job-tracker/cover-letter";
import { generateCoverLatex } from "@/lib/job-tracker/latex/review-latex";

export function buildCoverLetterDocumentPatch(input: {
  form: Pick<HubRefineryForm, "firstName" | "lastName" | "email" | "phone">;
  company: string | null;
  jobTitle: string;
  body: string;
}): { coverLetter: string; coverLetterLatex: string } {
  const ctx = buildCoverLetterContext({
    firstName: input.form.firstName,
    lastName: input.form.lastName,
    email: input.form.email,
    phone: input.form.phone,
    company: input.company,
    jobTitle: input.jobTitle,
    body: input.body,
  });

  return {
    coverLetter: ctx.body,
    coverLetterLatex: generateCoverLatex(ctx),
  };
}
