import type { PrimeResumeData } from "@/components/onboarding/PrimeResume";

export type ProfileResumeSnapshot = {
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  city: string | null;
  country: string | null;
  summary: string | null;
  skills: string[];
  targetTitle: string | null;
};

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
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

/** Build dashboard Prime Paper preview from profile + Career Architecture JSONB. */
export function buildResumePreviewFromSources(
  profile: ProfileResumeSnapshot | null,
  content: unknown,
  targetRole: string | null,
): PrimeResumeData {
  const root = asRecord(content) ?? {};
  const fullName = profile
    ? [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim()
    : "";
  const location = profile
    ? [profile.city, profile.country].filter(Boolean).join(", ")
    : "";

  const archSkills = readStringList(root.skills);
  const skills = archSkills.length > 0 ? archSkills : (profile?.skills ?? []);

  const experience = Array.isArray(root.experiences)
    ? root.experiences
        .map((entry, index) => {
          const row = asRecord(entry);
          if (!row) return null;

          return {
            id: `exp-${index}`,
            title: readString(row.title),
            company: readString(row.company),
            location: readString(row.location) || null,
            startDate: readString(row.dateRange) || null,
            endDate: null,
            bullets: readStringList(row.bullets),
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    : [];

  const education = Array.isArray(root.education)
    ? root.education
        .map((entry, index) => {
          const row = asRecord(entry);
          if (!row) return null;

          return {
            id: `edu-${index}`,
            school: readString(row.school),
            degree: readString(row.degree) || null,
            field: readString(row.location) || null,
            startDate: readString(row.date) || null,
            endDate: null,
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    : [];

  return {
    profile: {
      targetRole: targetRole ?? profile?.targetTitle ?? null,
    },
    fullName: fullName || null,
    email: profile?.email ?? null,
    phone: profile?.phone ?? null,
    location: location || null,
    summary: profile?.summary ?? null,
    skills,
    experience,
    education,
    certifications: readStringList(root.certifications),
    projects: readStringList(root.projects),
    languages: readStringList(root.languages),
  };
}
