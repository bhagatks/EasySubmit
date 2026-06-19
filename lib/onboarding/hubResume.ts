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
    linkedIn: "",
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
    linkedIn: form.linkedIn,
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
    linkedIn: coordinates.linkedIn,
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

  return {
    firstName: pickParsedField(parsedNames.firstName, coordinates.firstName),
    lastName: pickParsedField(parsedNames.lastName, coordinates.lastName),
    cityState: pickParsedField(data.location, coordinates.cityState),
    phone: mergedPhone,
    email: pickParsedField(data.email, coordinates.email),
    linkedIn: pickParsedField(data.linkedIn, coordinates.linkedIn),
    professionalSummary: data.summary?.trim() ?? "",
    skillsText: data.skills.join(", "),
    experience: data.experience.map((entry, index) => {
      const range = parseDateRangeString(entry.date);
      return {
        id: `exp-${index}`,
        title: entry.role,
        company: entry.company,
        location: "",
        startMonth: range.start.month,
        startYear: range.start.year,
        endMonth: range.end.month,
        endYear: range.end.year,
        bullets: entry.description.join("\n"),
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
  };
}

/** @deprecated Use mergeParsedWithCoordinates */
export function parsedToRefineryForm(data: StructuredResume): HubRefineryForm {
  return mergeParsedWithCoordinates(data, emptyCoordinatesValues());
}

function parseSkillsText(skillsText: string): string[] {
  return skillsText
    .split(/[,;|•·\/]|\n/)
    .map((skill) => skill.trim())
    .filter(Boolean);
}

export function refineryFormToPrimeResume(
  form: HubRefineryForm,
  profile?: PrimeResumeProfile,
): PrimeResumeData {
  const fullName = [form.firstName, form.lastName].filter(Boolean).join(" ").trim();

  return {
    profile,
    fullName: fullName || null,
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    location: form.cityState.trim() || null,
    linkedIn: form.linkedIn.trim() || null,
    summary: form.professionalSummary.trim() || null,
    skills: parseSkillsText(form.skillsText),
    experience: form.experience
      .filter((entry) => !entry.hidden)
      .filter((entry) => entry.title.trim() || entry.company.trim())
      .map((entry) => {
        return {
          id: entry.id,
          title: entry.title.trim(),
          company: entry.company.trim(),
          location: entry.location.trim() || null,
          startDate: entry.startMonth.trim() && entry.startYear.trim()
            ? `${entry.startMonth.trim()} ${entry.startYear.trim()}`
            : entry.startYear.trim() || null,
          endDate: entry.endMonth.trim() && entry.endYear.trim()
            ? `${entry.endMonth.trim()} ${entry.endYear.trim()}`
            : entry.endYear.trim() || null,
          bullets: entry.bullets
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
        };
      }),
    education: form.education
      .filter((entry) => !entry.hidden)
      .filter((entry) => entry.school.trim() || entry.degree.trim())
      .map((entry) => ({
        id: entry.id,
        school: entry.school.trim(),
        degree: entry.degree.trim() || null,
        startDate: entry.startMonth.trim() && entry.startYear.trim()
          ? `${entry.startMonth.trim()} ${entry.startYear.trim()}`
          : entry.startYear.trim() || null,
        endDate: entry.endMonth.trim() && entry.endYear.trim()
          ? `${entry.endMonth.trim()} ${entry.endYear.trim()}`
          : entry.endYear.trim() || null,
        field: entry.location.trim() || null,
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
): PrimeResumeData {
  return refineryFormToPrimeResume(coordinatesToRefineryForm(coordinates));
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
