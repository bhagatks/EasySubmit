/**
 * Normalized resume content — single builder for HTML preview, PDF, Word, and ATS.
 * Renderers only map this model to their output format; they do not parse forms directly.
 */

import type { PrimeResumeData } from "@/components/onboarding/PrimeResume";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { refineryFormToPrimeResume } from "@/lib/onboarding/hubResume";
import { extractTrailingDateRange } from "@/lib/resume/dates";
import { SECTION_TITLE } from "@/lib/job-tracker/export/resume-style";

export const MAX_BULLETS_PER_ROLE = 6;

export type ResumeContentExperience = {
  id: string;
  title: string;
  subtitle: string;
  dateRange: string;
  bullets: string[];
  /** True when source had more than MAX_BULLETS_PER_ROLE bullets. */
  bulletsTruncated: boolean;
  originalBulletCount: number;
};

export type ResumeContentEducation = {
  id: string;
  title: string;
  subtitle: string;
  dateRange: string;
};

export type ResumeContentCustomSection = {
  id: string;
  title: string;
  lines: string[];
};

export type ResumeContentModel = {
  name: string;
  contact: string;
  targetTitle: string;
  summary: string;
  skillsText: string;
  skills: string[];
  experience: ResumeContentExperience[];
  education: ResumeContentEducation[];
  certifications: string[];
  projects: string[];
  languages: string[];
  customSections: ResumeContentCustomSection[];
  /** Issues surfaced to ATS analysis and export (e.g. bullet cap). */
  warnings: string[];
};

export type ResumeContentValidationResult =
  | { valid: true }
  | { valid: false; violations: string[] };

function line(v: string | null | undefined): string {
  return v?.trim() ?? "";
}

/** Normalize date range to "Mon YYYY – Mon YYYY" per RULES.md §4. */
export function formatResumeDateRange(
  startMonth: string,
  startYear: string,
  endMonth: string,
  endYear: string,
): string {
  const start = [startMonth, startYear].map(line).filter(Boolean).join(" ");
  const end = [endMonth, endYear].map(line).filter(Boolean).join(" ");
  if (start && end) return `${start} – ${end}`;
  return start || end;
}

/** Split mashed title/date lines when structured month-year fields are empty. */
export function resolveResumeEntryTitleLine(
  title: string,
  dateRange: string,
): { title: string; dateRange: string } {
  const cleanTitle = line(title);
  const cleanDate = line(dateRange);

  if (cleanDate) {
    return { title: cleanTitle || "Role", dateRange: cleanDate };
  }

  if (!cleanTitle) {
    return { title: "Role", dateRange: "" };
  }

  const extracted = extractTrailingDateRange(cleanTitle);
  if (extracted?.date) {
    return {
      title: line(extracted.title) || cleanTitle,
      dateRange: extracted.date,
    };
  }

  return { title: cleanTitle, dateRange: "" };
}

/** Parse bullet lines from a newline-delimited string. */
export function parseBulletLines(raw: string): string[] {
  return raw
    .split("\n")
    .map((b) => b.trim().replace(/^[-•*]\s*/, ""))
    .filter(Boolean);
}

/** Cap bullets at MAX_BULLETS_PER_ROLE and report truncation. */
export function normalizeRoleBullets(rawBullets: string[] | string): {
  bullets: string[];
  truncated: boolean;
  originalCount: number;
} {
  const parsed = Array.isArray(rawBullets) ? rawBullets.map((b) => line(b)).filter(Boolean) : parseBulletLines(rawBullets);
  const originalCount = parsed.length;
  const truncated = originalCount > MAX_BULLETS_PER_ROLE;
  return {
    bullets: parsed.slice(0, MAX_BULLETS_PER_ROLE),
    truncated,
    originalCount,
  };
}

function contactFromParts(parts: Array<string | null | undefined>, separator: string): string {
  return parts.map(line).filter(Boolean).join(separator);
}

function experienceWarnings(entries: ResumeContentExperience[]): string[] {
  const warnings: string[] = [];
  for (const entry of entries) {
    if (entry.bulletsTruncated) {
      warnings.push(
        `"${entry.title}" has ${entry.originalBulletCount} bullets — only the first ${MAX_BULLETS_PER_ROLE} export (RULES.md §8). Trim in Studio before applying.`,
      );
    }
  }
  return warnings;
}

/** Check §8 hard rules on form data (pre-export / ATS). */
export function validateResumeForm(form: HubRefineryForm): ResumeContentValidationResult {
  const content = buildResumeContentFromForm(form, "");
  const violations = content.warnings.filter((w) => w.includes("bullets"));
  return violations.length === 0 ? { valid: true } : { valid: false, violations };
}

export function buildResumeContentFromForm(
  form: HubRefineryForm,
  targetTitle: string,
): ResumeContentModel {
  const preview = refineryFormToPrimeResume(form, { targetRole: targetTitle });
  const name = line([form.firstName, form.lastName].filter(Boolean).join(" ")) || "Applicant";
  const contact = contactFromParts(
    [form.cityState, form.phone, form.email, form.linkedIn],
    " | ",
  );

  const experience: ResumeContentExperience[] = form.experience
    .filter((entry) => !entry.hidden && (line(entry.title) || line(entry.company)))
    .map((entry) => {
      const { bullets, truncated, originalCount } = normalizeRoleBullets(entry.bullets);
      const titleLine = resolveResumeEntryTitleLine(
        line(entry.title) || "Role",
        formatResumeDateRange(
          entry.startMonth,
          entry.startYear,
          entry.endMonth,
          entry.endYear,
        ),
      );
      return {
        id: entry.id,
        title: titleLine.title,
        subtitle: [line(entry.company), line(entry.location)].filter(Boolean).join(" – "),
        dateRange: titleLine.dateRange,
        bullets,
        bulletsTruncated: truncated,
        originalBulletCount: originalCount,
      };
    });

  const education: ResumeContentEducation[] = form.education
    .filter((entry) => !entry.hidden && (line(entry.school) || line(entry.degree)))
    .map((entry) => {
      const degree = line(entry.degree);
      const school = line(entry.school);
      const subtitle =
        degree && school
          ? [school, line(entry.location)].filter(Boolean).join(", ")
          : line(entry.location);
      return {
        id: entry.id,
        title: degree || school,
        subtitle,
        dateRange: formatResumeDateRange(
          entry.startMonth,
          entry.startYear,
          entry.endMonth,
          entry.endYear,
        ),
      };
    });

  const certifications = (form.certifications ?? [])
    .filter((item) => !item.hidden && line(item.text))
    .map((item) => line(item.text));

  const projects = (form.projects ?? [])
    .filter((item) => !item.hidden && line(item.text))
    .map((item) => line(item.text));

  const languages = (form.languages ?? [])
    .filter((item) => !item.hidden && line(item.text))
    .map((item) => line(item.text));

  const customSections: ResumeContentCustomSection[] = (form.customSections ?? [])
    .filter((section) => !section.hidden && line(section.title) && line(section.content))
    .map((section) => ({
      id: section.id,
      title: line(section.title),
      lines: line(section.content).split("\n").map(line).filter(Boolean),
    }));

  const warnings = experienceWarnings(experience);

  return {
    name,
    contact,
    targetTitle: line(targetTitle),
    summary: line(form.professionalSummary),
    skillsText: line(form.skillsText),
    skills: preview.skills ?? [],
    experience,
    education,
    certifications,
    projects,
    languages,
    customSections,
    warnings,
  };
}

export function buildResumeContentFromPrime(
  data: PrimeResumeData,
  targetTitle: string,
): ResumeContentModel {
  const name = line(data.fullName) || "Applicant";
  const contact = contactFromParts(
    [data.location, data.phone, data.email, data.linkedIn],
    " | ",
  );

  const experience: ResumeContentExperience[] = (data.experience ?? [])
    .filter((entry) => line(entry.title) || line(entry.company))
    .map((entry, index) => {
      const { bullets, truncated, originalCount } = normalizeRoleBullets(entry.bullets ?? []);
      return {
        id: entry.id ?? `exp-${index}`,
        title: line(entry.title) || "Role",
        subtitle: [line(entry.company), line(entry.location)].filter(Boolean).join(", "),
        dateRange: [line(entry.startDate), line(entry.endDate)].filter(Boolean).join(" – "),
        bullets,
        bulletsTruncated: truncated,
        originalBulletCount: originalCount,
      };
    });

  const education: ResumeContentEducation[] = (data.education ?? [])
    .filter((entry) => line(entry.school) || line(entry.degree))
    .map((entry, index) => ({
      id: entry.id ?? `edu-${index}`,
      title: line(entry.degree) || line(entry.school),
      subtitle:
        line(entry.degree) && line(entry.school) ? line(entry.school) : "",
      dateRange: [line(entry.startDate), line(entry.endDate)].filter(Boolean).join(" – "),
    }));

  const warnings = experienceWarnings(experience);

  return {
    name,
    contact,
    targetTitle: line(targetTitle),
    summary: line(data.summary),
    skillsText: (data.skills ?? []).join(", "),
    skills: data.skills ?? [],
    experience,
    education,
    certifications: (data.certifications ?? []).map(line).filter(Boolean),
    projects: (data.projects ?? []).map(line).filter(Boolean),
    languages: (data.languages ?? []).map(line).filter(Boolean),
    customSections: (data.customSections ?? [])
      .filter((section) => line(section.title) && line(section.content))
      .map((section, index) => ({
        id: `custom-${index}`,
        title: line(section.title),
        lines: line(section.content).split("\n").map(line).filter(Boolean),
      })),
    warnings,
  };
}

/** ATS document-order section ids — mirrors RULES.md section order. */
export const RESUME_CONTENT_SECTION_ORDER = [
  "summary",
  "skills",
  "experience",
  "education",
  "certs",
  "projects",
  "languages",
] as const;

export function resumeContentSectionTitle(sectionId: (typeof RESUME_CONTENT_SECTION_ORDER)[number]): string {
  const map: Record<(typeof RESUME_CONTENT_SECTION_ORDER)[number], string> = {
    summary: SECTION_TITLE.summary,
    skills: SECTION_TITLE.skills,
    experience: SECTION_TITLE.experience,
    education: SECTION_TITLE.education,
    certs: SECTION_TITLE.certs,
    projects: SECTION_TITLE.projects,
    languages: SECTION_TITLE.languages,
  };
  return map[sectionId];
}
