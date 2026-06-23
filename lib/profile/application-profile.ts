/** Canonical shape for `users.applicationProfile` — see `docs/APPLICATION_PROFILE.md`. */

export type ApplicationProfileWorkAuth = {
  authorizedCountry: string;
  authorized: boolean;
  requiresSponsorship: boolean;
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
};

export type ApplicationProfileAddress = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal: string;
  country: string;
};

export type ApplicationProfileEeo = {
  gender: string;
  veteran: string;
  disability: string;
};

export type ApplicationProfile = {
  workAuth: ApplicationProfileWorkAuth | null;
  preferences: ApplicationProfilePreferences | null;
  address: ApplicationProfileAddress | null;
  eeo: ApplicationProfileEeo | null;
};

export function parseApplicationProfile(value: unknown): ApplicationProfile | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as ApplicationProfile;
}
