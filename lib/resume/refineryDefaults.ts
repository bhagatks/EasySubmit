import type { ParsedResumeData } from "@/src/stores/onboarding-store";
import { joinProfileName } from "@/lib/profile/name";
import {
  extractExperiencesFromText,
  extractLocationFromText,
  extractNameFromText,
  extractProjectsFromText,
} from "@/lib/resume/extractSections";

const SOFT_SKILL_HINTS =
  /agile|scrum|kanban|leadership|management|communication|collaboration|strategy|mentoring|product|design thinking|stakeholder/i;

export type RefineryExperienceField = {
  id: string;
  title: string;
  company: string;
  parsed: boolean;
};

export type RefineryProjectField = {
  id: string;
  name: string;
  description: string;
  parsed: boolean;
};

export type RefineryFormValues = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  coreCompetencies: string[];
  technicalSkills: string[];
  experiences: RefineryExperienceField[];
  projects: RefineryProjectField[];
};

export type RefineryVerifiedFields = {
  fullName: boolean;
  email: boolean;
  phone: boolean;
  location: boolean;
  coreCompetencies: boolean;
  technicalSkills: boolean;
  experiences: boolean;
  projects: boolean;
};

function splitSkills(skills: string[]): {
  coreCompetencies: string[];
  technicalSkills: string[];
} {
  const coreCompetencies: string[] = [];
  const technicalSkills: string[] = [];

  for (const skill of skills) {
    if (SOFT_SKILL_HINTS.test(skill)) {
      coreCompetencies.push(skill);
    } else {
      technicalSkills.push(skill);
    }
  }

  if (coreCompetencies.length === 0 && technicalSkills.length > 4) {
    return {
      coreCompetencies: technicalSkills.slice(0, Math.ceil(technicalSkills.length / 3)),
      technicalSkills: technicalSkills.slice(Math.ceil(technicalSkills.length / 3)),
    };
  }

  return { coreCompetencies, technicalSkills };
}

export function buildRefineryDefaults(input: {
  parsed: ParsedResumeData | null;
  sessionFirstName?: string | null;
  sessionLastName?: string | null;
  /** @deprecated Prefer sessionFirstName + sessionLastName */
  sessionName?: string | null;
  sessionEmail?: string | null;
}): { values: RefineryFormValues; verified: RefineryVerifiedFields } {
  const { parsed, sessionFirstName, sessionLastName, sessionName, sessionEmail } = input;
  const rawText = parsed?.rawText ?? "";

  const parsedName = rawText ? extractNameFromText(rawText) : null;
  const parsedLocation = rawText ? extractLocationFromText(rawText) : null;
  const parsedExperiences = rawText ? extractExperiencesFromText(rawText) : [];
  const parsedProjects = rawText ? extractProjectsFromText(rawText) : [];
  const { coreCompetencies, technicalSkills } = splitSkills(parsed?.skills ?? []);

  const sessionFullName =
    joinProfileName(sessionFirstName, sessionLastName) ||
    sessionName?.split("|")[0]?.trim() ||
    "";
  const fullName = parsedName ?? sessionFullName;
  const email = parsed?.email ?? sessionEmail ?? "";
  const phone = parsed?.phone ?? "";
  const location = parsedLocation ?? "";

  return {
    values: {
      fullName,
      email,
      phone,
      location,
      coreCompetencies,
      technicalSkills,
      experiences: parsedExperiences.map((row) => ({
        id: row.id,
        title: row.title,
        company: row.company,
        parsed: true,
      })),
      projects: parsedProjects.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        parsed: true,
      })),
    },
    verified: {
      fullName: Boolean(parsedName || sessionFullName),
      email: Boolean(parsed?.email || sessionEmail),
      phone: Boolean(parsed?.phone),
      location: Boolean(parsedLocation),
      coreCompetencies: coreCompetencies.length > 0,
      technicalSkills: technicalSkills.length > 0,
      experiences: parsedExperiences.length > 0,
      projects: parsedProjects.length > 0,
    },
  };
}
