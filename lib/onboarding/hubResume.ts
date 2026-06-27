import type {
  PrimeResumeData,
  PrimeResumeProfile,
} from "@/components/onboarding/PrimeResume";
import type { CoordinatesValues } from "@/components/onboarding/hub/CoordinatesPanel";
import type { StructuredResume } from "@/lib/resume/heuristicParser";
import {
  formatDateRangeParts,
  parseDateRangeString,
} from "@/lib/resume/dates";
import { DEFAULT_DIAL_CODE } from "@/lib/phone/countryCodes";
import {
  formatFullPhone,
  splitPhoneNumber,
} from "@/lib/phone/phone";
import { splitFullName } from "@/lib/resume/openResume/adapter";
import {
  normalizeBulletText,
  normalizeResumeLine,
} from "@/lib/resume/normalizeResumeText";
import { splitMashedExperienceInForm } from "@/lib/resume/split-mashed-experience";

export type HubRefineryForm = {
  firstName: string;
  lastName: string;
  cityState: string;
  phone: string;
  email: string;
  linkedIn: string;
  professionalSummary: string;
  skillsText: string;
  experience: Array<{
    id: string;
    title: string;
    company: string;
    location: string;
    startMonth: string;
    startYear: string;
    endMonth: string;
    endYear: string;
    bullets: string;
    hidden?: boolean;
  }>;
  education: Array<{
    id: string;
    degree: string;
    school: string;
    location: string;
    startMonth: string;
    startYear: string;
    endMonth: string;
    endYear: string;
    hidden?: boolean;
  }>;
  certifications: Array<{ id: string; text: string; hidden?: boolean }>;
  projects: Array<{ id: string; text: string; hidden?: boolean }>;
  languages: Array<{ id: string; text: string; hidden?: boolean }>;
  customSections: Array<{
    id: string;
    title: string;
    content: string;
    hidden?: boolean;
  }>;
};

function pickParsedField(
  parsed: string | null | undefined,
  coordinates: string,
): string {
  const fromParser = parsed?.trim();
  if (fromParser) return fromParser;
  return coordinates.trim();
}

export function emptyCoordinatesValues(): CoordinatesValues {
  return {
    firstName: "",
    lastName: "",
    cityState: "",
    phoneDialCode: DEFAULT_DIAL_CODE,
    phone: "",
    email: "",
  };
}

export function hubFormToCoordinates(form: HubRefineryForm): CoordinatesValues {
  const phoneParts = splitPhoneNumber(form.phone);

  return {
    firstName: form.firstName,
    lastName: form.lastName,
    cityState: form.cityState,
    phoneDialCode: phoneParts.dialCode,
    phone: phoneParts.nationalNumber,
    email: form.email,
  };
}

export function emptyHubRefineryForm(): HubRefineryForm {
  return {
    firstName: "",
    lastName: "",
    cityState: "",
    phone: "",
    email: "",
    linkedIn: "",
    professionalSummary: "",
    skillsText: "",
    experience: [],
    education: [],
    certifications: [],
    projects: [],
    languages: [],
    customSections: [],
  };
}

export function coordinatesToRefineryForm(
  coordinates: CoordinatesValues,
): HubRefineryForm {
  return {
    ...emptyHubRefineryForm(),
    firstName: coordinates.firstName,
    lastName: coordinates.lastName,
    cityState: coordinates.cityState,
    phone: formatFullPhone(coordinates.phoneDialCode, coordinates.phone),
    email: coordinates.email,
    linkedIn: "",
  };
}

export function mergeParsedWithCoordinates(
  data: StructuredResume,
  coordinates: CoordinatesValues,
): HubRefineryForm {
  const parsedNames = splitFullName(data.name ?? "");

  const mergedPhone = pickParsedField(data.phone, formatFullPhone(
    coordinates.phoneDialCode,
    coordinates.phone,
  ));

  const merged: HubRefineryForm = {
    firstName: pickParsedField(parsedNames.firstName, coordinates.firstName),
    lastName: pickParsedField(parsedNames.lastName, coordinates.lastName),
    cityState: pickParsedField(data.location, coordinates.cityState),
    phone: mergedPhone,
    email: pickParsedField(data.email, coordinates.email),
    linkedIn: data.linkedIn?.trim() ?? "",
    professionalSummary: normalizeResumeLine(data.summary?.trim() ?? ""),
    skillsText: data.skills.map((skill) => normalizeResumeLine(skill)).join(", "),
    experience: data.experience.map((entry, index) => {
      const range = parseDateRangeString(entry.date);
      return {
        id: `exp-${index}`,
        title: normalizeResumeLine(entry.role),
        company: normalizeResumeLine(entry.company),
        location: "",
        startMonth: range.start.month,
        startYear: range.start.year,
        endMonth: range.end.month,
        endYear: range.end.year,
        bullets: normalizeBulletText(entry.description.join("\n")),
        hidden: false,
      };
    }),
    education: data.education.map((entry, index) => {
      const range = parseDateRangeString(entry.date);
      return {
        id: `edu-${index}`,
        degree: entry.degree,
        school: entry.school,
        location: "",
        startMonth: range.start.month,
        startYear: range.start.year,
        endMonth: range.end.month,
        endYear: range.end.year,
        hidden: false,
      };
    }),
    certifications: data.certifications.map((text, index) => ({
      id: `cert-${index}`,
      text,
      hidden: false,
    })),
    projects: data.projects.map((text, index) => ({
      id: `proj-${index}`,
      text,
      hidden: false,
    })),
    languages: data.languages.map((text, index) => ({
      id: `lang-${index}`,
      text,
      hidden: false,
    })),
    customSections: [],
  };

  return splitMashedExperienceInForm(merged);
}

/** @deprecated Use mergeParsedWithCoordinates */
export function parsedToRefineryForm(data: StructuredResume): HubRefineryForm {
  return mergeParsedWithCoordinates(data, emptyCoordinatesValues());
}

function parseSkillsText(skillsText: string): string[] {
  return skillsText
    .split(/[,;|•·\/]|\n/)
    .map((skill) => normalizeResumeLine(skill))
    .filter(Boolean);
}

export function refineryFormToPrimeResume(
  form: HubRefineryForm,
  profile?: PrimeResumeProfile,
): PrimeResumeData {
  const safe = {
    firstName: form.firstName ?? "",
    lastName: form.lastName ?? "",
    cityState: form.cityState ?? "",
    phone: form.phone ?? "",
    email: form.email ?? "",
    linkedIn: form.linkedIn ?? "",
    professionalSummary: form.professionalSummary ?? "",
    skillsText: form.skillsText ?? "",
    experience: form.experience ?? [],
    education: form.education ?? [],
    certifications: form.certifications ?? [],
    projects: form.projects ?? [],
    languages: form.languages ?? [],
    customSections: form.customSections ?? [],
  };

  const fullName = [safe.firstName, safe.lastName].filter(Boolean).join(" ").trim();

  return {
    profile,
    fullName: fullName || null,
    email: safe.email.trim() || null,
    phone: safe.phone.trim() || null,
    location: safe.cityState.trim() || null,
    linkedIn: safe.linkedIn.trim() || null,
    summary: safe.professionalSummary.trim() || null,
    skills: parseSkillsText(safe.skillsText),
    experience: safe.experience
      .filter((entry) => !entry.hidden)
      .filter((entry) => (entry.title ?? "").trim() || (entry.company ?? "").trim())
      .map((entry) => {
        return {
          id: entry.id,
          title: (entry.title ?? "").trim(),
          company: (entry.company ?? "").trim(),
          location: (entry.location ?? "").trim() || null,
          startDate: entry.startMonth?.trim() && entry.startYear?.trim()
            ? `${entry.startMonth.trim()} ${entry.startYear.trim()}`
            : entry.startYear?.trim() || null,
          endDate: entry.endMonth?.trim() && entry.endYear?.trim()
            ? `${entry.endMonth.trim()} ${entry.endYear.trim()}`
            : entry.endYear?.trim() || null,
          bullets: normalizeBulletText(entry.bullets ?? "")
            .split("\n")
            .filter(Boolean),
        };
      }),
    education: safe.education
      .filter((entry) => !entry.hidden)
      .filter((entry) => (entry.school ?? "").trim() || (entry.degree ?? "").trim())
      .map((entry) => ({
        id: entry.id,
        school: (entry.school ?? "").trim(),
        degree: (entry.degree ?? "").trim() || null,
        startDate: entry.startMonth?.trim() && entry.startYear?.trim()
          ? `${entry.startMonth.trim()} ${entry.startYear.trim()}`
          : entry.startYear?.trim() || null,
        endDate: entry.endMonth?.trim() && entry.endYear?.trim()
          ? `${entry.endMonth.trim()} ${entry.endYear.trim()}`
          : entry.endYear?.trim() || null,
        field: (entry.location ?? "").trim() || null,
      })),
    certifications: safe.certifications
      .filter((entry) => !entry.hidden && (entry.text ?? "").trim())
      .map((entry) => (entry.text ?? "").trim()),
    projects: safe.projects
      .filter((entry) => !entry.hidden && (entry.text ?? "").trim())
      .map((entry) => (entry.text ?? "").trim()),
    languages: safe.languages
      .filter((entry) => !entry.hidden && (entry.text ?? "").trim())
      .map((entry) => (entry.text ?? "").trim()),
    customSections: safe.customSections
      .filter(
        (entry) =>
          !entry.hidden &&
          (entry.title ?? "").trim() &&
          (entry.content ?? "").trim(),
      )
      .map((entry) => ({
        title: (entry.title ?? "").trim(),
        content: (entry.content ?? "").trim(),
      })),
  };
}

export function structuredToPrimeResume(
  data: StructuredResume,
  profile?: PrimeResumeProfile,
): PrimeResumeData {
  return refineryFormToPrimeResume(parsedToRefineryForm(data), profile);
}

export function coordinatesToPrimeResume(
  coordinates: CoordinatesValues,
  identity?: { targetRole?: string },
): PrimeResumeData {
  const targetRole = identity?.targetRole?.trim() ?? "";
  const resume = refineryFormToPrimeResume(coordinatesToRefineryForm(coordinates));

  if (!targetRole) return resume;

  return {
    ...resume,
    headline: targetRole,
    profile: {
      ...resume.profile,
      targetRole,
    },
  };
}

export function profileToResumePatch(
  profile: PrimeResumeProfile,
  current: PrimeResumeData,
): PrimeResumeData {
  return {
    ...current,
    profile,
  };
}

export function formFullName(form: HubRefineryForm): string {
  return [form.firstName, form.lastName].filter(Boolean).join(" ").trim();
}
