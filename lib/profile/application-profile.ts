/** Canonical shape for `users.applicationProfile` — see `docs/APPLICATION_PROFILE.md`. */

export type ApplicationProfileWorkAuth = {
  authorizedCountry: string;
  authorized: boolean;
  requiresSponsorship: boolean;
  citizenshipStatus?:
    | "citizen"
    | "green_card"
    | "tn"
    | "ead"
    | "h1b"
    | "opt"
    | "cpt"
    | "other"
    | null;
  visaType?: string | null;
};

export type ApplicationProfileSalary = {
  min: number;
  max: number;
  currency: string;
  signals: number[];
};

export type ApplicationProfilePreferences = {
  salary: ApplicationProfileSalary;
  earliestStart: "immediately" | "2_weeks" | "1_month" | "flexible";
  workMode: "remote" | "hybrid" | "onsite" | "flexible";
  willingToRelocate?: boolean | null;
  noticePeriod?: "immediate" | "2_weeks" | "1_month" | "2_months" | "flexible" | null;
  desiredJobType?: "full_time" | "part_time" | "contract" | "flexible" | null;
  travelTolerance?: "none" | "25pct" | "50pct" | "75pct" | "any" | null;
};

export type ApplicationProfileAddress = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal: string;
  country: string;
};

export type ApplicationProfileEducation = {
  highestDegree?:
    | "high_school"
    | "associate"
    | "bachelor"
    | "master"
    | "phd"
    | "other"
    | null;
  fieldOfStudy?: string | null;
  schoolName?: string | null;
  graduationYear?: number | null;
  gpa?: string | null;
};

export type ApplicationProfileEeo = {
  gender: string;
  veteran: string;
  disability: string;
  race?: string | null;
  hispanicLatino?: boolean | null;
};

export type ApplicationProfileIdentityExtras = {
  preferredName?: string | null;
  pronouns?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
};

export type ApplicationProfile = {
  workAuth: ApplicationProfileWorkAuth | null;
  preferences: ApplicationProfilePreferences | null;
  address: ApplicationProfileAddress | null;
  education: ApplicationProfileEducation | null;
  eeo: ApplicationProfileEeo | null;
  identityExtras: ApplicationProfileIdentityExtras | null;
};

export function parseApplicationProfile(value: unknown): ApplicationProfile | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as ApplicationProfile;
}
