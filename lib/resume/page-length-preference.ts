export type PageLengthPreference = "auto" | "1" | "2";

export const DEFAULT_PAGE_LENGTH_PREFERENCE: PageLengthPreference = "auto";

export const PAGE_LENGTH_OPTIONS: ReadonlyArray<{
  id: PageLengthPreference;
  label: string;
}> = [
  { id: "auto", label: "Auto (recommended)" },
  { id: "1", label: "1 page" },
  { id: "2", label: "2 pages" },
];

export function normalizePageLengthPreference(value: unknown): PageLengthPreference {
  if (value === "auto" || value === "1" || value === "2") {
    return value;
  }
  return DEFAULT_PAGE_LENGTH_PREFERENCE;
}

export function inferAutoResumePages(years: number, targetRole: string): 1 | 2 {
  const role = targetRole.trim().toLowerCase();
  if (/\b(director|vp|vice president|head of|chief|c-suite|executive)\b/.test(role)) {
    return 2;
  }
  if (years >= 10) {
    return 2;
  }
  return 1;
}

export function resolveResumePages(
  years: number,
  targetRole: string,
  preference: PageLengthPreference = DEFAULT_PAGE_LENGTH_PREFERENCE,
): 1 | 2 {
  if (preference === "1") return 1;
  if (preference === "2") return 2;
  return inferAutoResumePages(years, targetRole);
}

export function describeAutoPageLengthRecommendation(
  years: number,
  targetRole: string,
): string {
  const pages = inferAutoResumePages(years, targetRole);
  const experienceLabel = years > 0 ? `~${years} years experience` : "your experience";
  return `${pages} page${pages === 1 ? "" : "s"} based on ${experienceLabel}`;
}
