import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";
import { parseDateRangeString } from "@/lib/resume/dates";
import type { ResumeProfile } from "@/lib/profile/resume-profile-core";
import {
  normalizeBulletText,
  normalizeResumeLine,
} from "@/lib/resume/normalizeResumeText";
import {
  normalizePageLengthPreference,
} from "@/lib/resume/page-length-preference";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
}

function mapExperienceEntry(
  entry: unknown,
  index: number,
): HubRefineryForm["experience"][number] | null {
  const row = asRecord(entry);
  if (!row) return null;

  const title = readString(row.title);
  const company = readString(row.company);
  if (!title && !company) return null;

  const dateRange = readString(row.dateRange);
  const range = dateRange ? parseDateRangeString(dateRange) : parseDateRangeString("");

  const bullets = Array.isArray(row.bullets)
    ? row.bullets.filter((line): line is string => typeof line === "string").join("\n")
    : readString(row.description);

  return {
    id: `exp-${index}`,
    title: normalizeResumeLine(title),
    company: normalizeResumeLine(company),
    location: normalizeResumeLine(readString(row.location)),
    startMonth: range.start.month,
    startYear: range.start.year,
    endMonth: range.end.month,
    endYear: range.end.year,
    bullets: normalizeBulletText(bullets),
    hidden: false,
  };
}

function mapEducationEntry(
  entry: unknown,
  index: number,
): HubRefineryForm["education"][number] | null {
  const row = asRecord(entry);
  if (!row) return null;

  const school = readString(row.school) || readString(row.institution);
  const degree = readString(row.degree);
  if (!school && !degree) return null;

  const date = readString(row.date) || readString(row.startDate);
  const range = date ? parseDateRangeString(date) : parseDateRangeString("");

  return {
    id: `edu-${index}`,
    degree,
    school,
    location: readString(row.location) || readString(row.field),
    startMonth: range.start.month,
    startYear: range.start.year,
    endMonth: range.end.month,
    endYear: range.end.year,
    hidden: false,
  };
}

function mapCustomSections(
  value: unknown,
): HubRefineryForm["customSections"] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry, index) => {
      const row = asRecord(entry);
      if (!row) return null;
      const title = readString(row.title);
      const content = readString(row.content) || readString(row.text);
      if (!title && !content) return null;
      return {
        id: readString(row.id) || `custom-${index}`,
        title: normalizeResumeLine(title),
        content: normalizeResumeLine(content),
        hidden: false,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

function mapTextList(
  value: unknown,
  prefix: string,
): Array<{ id: string; text: string; hidden?: boolean }> {
  return readStringList(value).map((text, index) => ({
    id: `${prefix}-${index}`,
    text,
    hidden: false,
  }));
}

/** Hydrate dashboard Studio form from profile row + resume JSON content. */
export function hubRefineryFormFromProfile(profile: ResumeProfile): HubRefineryForm {
  const root = asRecord(profile.content) ?? {};
  const cityState = [profile.city, profile.country].filter(Boolean).join(", ");

  const archSkills = readStringList(root.skills);
  const skills = archSkills.length > 0 ? archSkills : profile.skills;

  const experienceSource = root.experiences ?? root.experience;
  const educationSource = root.education ?? root.educations;

  const experience = Array.isArray(experienceSource)
    ? experienceSource
        .map((entry, index) => mapExperienceEntry(entry, index))
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    : [];

  const education = Array.isArray(educationSource)
    ? educationSource
        .map((entry, index) => mapEducationEntry(entry, index))
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    : [];

  const form = emptyHubRefineryForm();
  form.firstName = profile.firstName ?? "";
  form.lastName = profile.lastName ?? "";
  form.cityState = cityState;
  form.phone = profile.phone ?? "";
  form.email = profile.email;
  form.linkedIn = readString(root.linkedIn);
  form.professionalSummary = profile.summary ?? "";
  form.skillsText = skills.join(", ");
  form.experience = experience;
  form.education = education;
  form.certifications = mapTextList(root.certifications, "cert");
  form.projects = mapTextList(root.projects, "proj");
  form.languages = mapTextList(root.languages, "lang");
  form.customSections = mapCustomSections(root.customSections);
  form.pageLengthPreference = normalizePageLengthPreference(root.pageLengthPreference);

  return form;
}

export function targetTitleFromProfile(profile: ResumeProfile): string {
  return profile.targetTitle?.trim() || "";
}

export function studioSkillsFromForm(form: HubRefineryForm): string[] {
  return form.skillsText
    .split(/[,;|•·\/]|\n/)
    .map((skill) => normalizeResumeLine(skill))
    .filter(Boolean);
}

export function hubFormToProfileContent(
  form: HubRefineryForm,
  skills: string[],
): Record<string, unknown> {
  const pageLengthPreference = normalizePageLengthPreference(form.pageLengthPreference);

  return {
    email: form.email.trim(),
    phone: form.phone.trim(),
    linkedIn: form.linkedIn.trim(),
    skills,
    pageLengthPreference,
    experiences: form.experience
      .filter((entry) => !entry.hidden)
      .filter((entry) => entry.title.trim() || entry.company.trim())
      .map((entry) => ({
        title: entry.title.trim(),
        company: entry.company.trim(),
        location: entry.location.trim(),
        dateRange: formatDateRangeForContent(entry),
        bullets: normalizeBulletText(entry.bullets)
          .split("\n")
          .filter(Boolean),
      })),
    education: form.education
      .filter((entry) => !entry.hidden)
      .filter((entry) => entry.school.trim() || entry.degree.trim())
      .map((entry) => ({
        school: entry.school.trim(),
        degree: entry.degree.trim(),
        location: entry.location.trim(),
        date: formatDateRangeForContent(entry),
      })),
    certifications: form.certifications
      .filter((entry) => !entry.hidden && entry.text.trim())
      .map((entry) => entry.text.trim()),
    projects: form.projects
      .filter((entry) => !entry.hidden && entry.text.trim())
      .map((entry) => entry.text.trim()),
    languages: form.languages
      .filter((entry) => !entry.hidden && entry.text.trim())
      .map((entry) => entry.text.trim()),
    customSections: form.customSections
      .filter(
        (entry) =>
          !entry.hidden && entry.title.trim() && entry.content.trim(),
      )
      .map((entry) => ({
        title: entry.title.trim(),
        content: entry.content.trim(),
      })),
  };
}

function formatDateRangeForContent(
  entry: {
    startMonth: string;
    startYear: string;
    endMonth: string;
    endYear: string;
  },
): string {
  const start =
    entry.startMonth.trim() && entry.startYear.trim()
      ? `${entry.startMonth.trim()} ${entry.startYear.trim()}`
      : entry.startYear.trim();
  const end =
    entry.endMonth.trim() && entry.endYear.trim()
      ? `${entry.endMonth.trim()} ${entry.endYear.trim()}`
      : entry.endYear.trim();

  if (start && end) return `${start} – ${end}`;
  return start || end || "";
}

/** @deprecated Use `hubFormToProfileContent` */
export const hubFormToArchitectureContent = hubFormToProfileContent;
