import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { normalizeBrandTokens } from "@/lib/resume/brand-normalize";

export function normalizeBrandTokensInForm(form: HubRefineryForm): HubRefineryForm {
  return {
    ...form,
    professionalSummary: normalizeBrandTokens(form.professionalSummary ?? ""),
    skillsText: normalizeBrandTokens(form.skillsText ?? ""),
    experience: (form.experience ?? []).map((exp) => ({
      ...exp,
      title: normalizeBrandTokens(exp.title ?? ""),
      company: normalizeBrandTokens(exp.company ?? ""),
      bullets: normalizeBrandTokens(exp.bullets ?? ""),
    })),
    certifications: (form.certifications ?? []).map((cert) => ({
      ...cert,
      text: normalizeBrandTokens(cert.text ?? ""),
    })),
    projects: (form.projects ?? []).map((project) => ({
      ...project,
      text: normalizeBrandTokens(project.text ?? ""),
    })),
  };
}
