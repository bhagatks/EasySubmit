import type { HubRefineryForm } from "@/lib/onboarding/hubResume";

export type ResumeBodyForm = Omit<
  HubRefineryForm,
  "firstName" | "lastName" | "email" | "phone" | "linkedIn" | "cityState"
>;

export type CandidateContext = {
  targetRole: string;
  yearsExperienceEstimate: number;
  senioritySignal: string;
  pageBudget: {
    pages: 1 | 2;
    maxBulletsPerRole: number;
    maxRolesDetailed: number;
    maxSkills: number;
    summarySentencesMax: number;
  };
  resumeBody: ResumeBodyForm;
  jobDescription?: string;
  rawResumeSnippet?: string;
};

const CONTACT_KEYS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "linkedIn",
  "cityState",
] as const;

export function stripContactFromForm(form: HubRefineryForm): ResumeBodyForm {
  const copy = { ...form };
  for (const key of CONTACT_KEYS) {
    delete (copy as Record<string, unknown>)[key];
  }
  return copy as ResumeBodyForm;
}

function parseYear(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const year = Number.parseInt(trimmed, 10);
  return Number.isFinite(year) ? year : null;
}

export function estimateYearsExperience(form: HubRefineryForm): number {
  const currentYear = new Date().getFullYear();
  let earliest: number | null = null;

  for (const entry of form.experience) {
    if (entry.hidden) continue;
    const start = parseYear(entry.startYear);
    if (start !== null) {
      earliest = earliest === null ? start : Math.min(earliest, start);
    }
  }

  if (earliest === null) return 0;
  return Math.max(0, currentYear - earliest);
}

function inferSeniority(targetRole: string, years: number): string {
  const role = targetRole.toLowerCase();
  if (/\b(director|vp|vice president|head of|chief|c-suite|executive)\b/.test(role)) {
    return "executive";
  }
  if (/\b(principal|staff|lead|manager|director)\b/.test(role) || years >= 10) {
    return "senior";
  }
  if (years >= 5) return "mid";
  return "early";
}

export function resolvePageBudget(years: number, targetRole: string): CandidateContext["pageBudget"] {
  const seniority = inferSeniority(targetRole, years);
  const pages: 1 | 2 = seniority === "executive" || years >= 10 ? 2 : 1;

  if (pages === 2) {
    return {
      pages: 2,
      maxRolesDetailed: 4,
      maxBulletsPerRole: 6,
      maxSkills: 25,
      summarySentencesMax: 3,
    };
  }

  return {
    pages: 1,
    maxRolesDetailed: 3,
    maxBulletsPerRole: 5,
    maxSkills: 15,
    summarySentencesMax: 3,
  };
}

export function buildCandidateContext(input: {
  form: HubRefineryForm;
  targetRole: string;
  jobDescription?: string;
  rawResumeText?: string | null;
}): CandidateContext {
  const years = estimateYearsExperience(input.form);
  const targetRole = input.targetRole.trim() || "Professional";

  return {
    targetRole,
    yearsExperienceEstimate: years,
    senioritySignal: inferSeniority(targetRole, years),
    pageBudget: resolvePageBudget(years, targetRole),
    resumeBody: stripContactFromForm(input.form),
    jobDescription: input.jobDescription?.trim() || undefined,
    rawResumeSnippet: input.rawResumeText?.trim().slice(0, 2000) || undefined,
  };
}

export function mergeEnhancedBodyIntoForm(
  original: HubRefineryForm,
  enhancedBody: Partial<ResumeBodyForm>,
): HubRefineryForm {
  return {
    ...original,
    ...enhancedBody,
    firstName: original.firstName,
    lastName: original.lastName,
    email: original.email,
    phone: original.phone,
    linkedIn: original.linkedIn,
    cityState: original.cityState,
  };
}
