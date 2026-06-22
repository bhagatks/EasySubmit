import type { HubRefineryForm } from "@/lib/onboarding/hubResume";

function line(value: string | null | undefined): string {
  return value?.trim() || "";
}

export function buildResumePlainText(form: HubRefineryForm, targetTitle: string): string {
  const name = [form.firstName, form.lastName].filter(Boolean).join(" ").trim() || "Applicant";
  const contact = [form.cityState, form.phone, form.email, form.linkedIn]
    .map(line)
    .filter(Boolean)
    .join(" | ");

  const sections: string[] = [name.toUpperCase(), contact, targetTitle.trim() || ""];

  if (line(form.professionalSummary)) {
    sections.push("", "PROFESSIONAL SUMMARY", line(form.professionalSummary));
  }

  if (line(form.skillsText)) {
    sections.push("", "SKILLS", line(form.skillsText));
  }

  const experience = form.experience.filter((e) => !e.hidden && (e.title || e.company));
  if (experience.length > 0) {
    sections.push("", "EXPERIENCE");
    for (const job of experience) {
      const dates = [job.startMonth, job.startYear, job.endMonth, job.endYear]
        .map(line)
        .filter(Boolean)
        .join(" ");
      sections.push(
        `${line(job.title)} — ${line(job.company)}`,
        [line(job.location), dates].filter(Boolean).join(" · "),
      );
      for (const bullet of job.bullets.split("\n")) {
        const text = line(bullet.replace(/^[-•*]\s*/, ""));
        if (text) sections.push(`• ${text}`);
      }
      sections.push("");
    }
  }

  const education = form.education.filter((e) => !e.hidden && (e.degree || e.school));
  if (education.length > 0) {
    sections.push("EDUCATION");
    for (const edu of education) {
      sections.push(`${line(edu.degree)} — ${line(edu.school)}`);
    }
  }

  return sections.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function resumeHasExportableContent(form: HubRefineryForm, targetTitle: string): boolean {
  if (targetTitle.trim()) return true;
  if (form.professionalSummary.trim()) return true;
  if (form.skillsText.trim()) return true;
  return form.experience.some((e) => !e.hidden && (e.title || e.company));
}
