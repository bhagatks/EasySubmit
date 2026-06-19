import type {
  ParsedEducation,
  ParsedWorkExperience,
  StructuredResume,
} from "@/lib/resume/heuristicParser";

export type RefineryExperience = ParsedWorkExperience & {
  hidden: boolean;
};

export type RefineryFormValues = {
  name: string | null;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  experience: RefineryExperience[];
  education: ParsedEducation[];
  skills: string[];
};

export type PrimeResumeData = StructuredResume & {
  jobTitle?: string | null;
};

export function toRefineryForm(
  data: StructuredResume,
  jobTitle?: string | null,
): RefineryFormValues {
  return {
    name: data.name ?? "",
    jobTitle: jobTitle?.trim() || null,
    email: data.email ?? "",
    phone: data.phone ?? "",
    experience: data.experience.map((entry) => ({
      ...entry,
      description: [...entry.description],
      hidden: false,
    })),
    education: data.education.map((entry) => ({ ...entry })),
    skills: [...data.skills],
  };
}

/** Maps editor state to canvas payload — omits hidden experience blocks. */
export function toPrimeResumeData(values: RefineryFormValues): PrimeResumeData {
  return {
    name: values.name?.trim() || null,
    jobTitle: values.jobTitle?.trim() || null,
    email: values.email?.trim() || null,
    phone: values.phone?.trim() || null,
    location: null,
    linkedIn: null,
    summary: null,
    experience: values.experience
      .filter((entry) => !entry.hidden)
      .map(({ hidden: _hidden, ...entry }) => entry),
    education: values.education,
    skills: values.skills,
    certifications: [],
    projects: [],
    languages: [],
  };
}

export function emptyRefineryForm(jobTitle?: string | null): RefineryFormValues {
  return toRefineryForm(
    {
      name: null,
      email: null,
      phone: null,
      location: null,
      linkedIn: null,
      summary: null,
      experience: [],
      education: [],
      skills: [],
      certifications: [],
      projects: [],
      languages: [],
    },
    jobTitle,
  );
}
