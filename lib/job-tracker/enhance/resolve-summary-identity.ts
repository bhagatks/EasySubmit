import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import type { JDDomain } from "@/lib/job-tracker/jd/jd-intelligence";

const OVERLAP_USE_JD_TITLE = 0.4;
const OVERLAP_CROSS_DOMAIN = 0.25;

const TECH_DOMAINS = new Set<JDDomain>([
  "software-engineering",
  "frontend",
  "backend",
  "fullstack",
  "devops-sre",
  "data-engineering",
  "ml-ai",
  "security",
  "mobile",
  "data-science",
  "qa-testing",
]);

const NON_TECH_DOMAINS = new Set<JDDomain>([
  "other",
  "product-management",
  "procurement-supply-chain",
  "medtech-regulatory",
]);

export type SummaryIdentityInput = {
  profileTargetTitle?: string;
  form: HubRefineryForm;
  currentSummary?: string;
  jdTargetRole: string;
  jdKeywords?: string[];
  jdDomain?: JDDomain;
};

export type SummaryIdentityResolution = {
  identity: string;
  jdTargetRole: string;
  overlapScore: number;
  mayUseJdTitleInSummary: boolean;
  isCrossDomain: boolean;
  isTechnicalCandidate: boolean;
};

function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ");
}

function experienceCompanies(form: HubRefineryForm): Set<string> {
  return new Set(
    (form.experience ?? [])
      .map((e) => e.company?.trim().toLowerCase())
      .filter(Boolean) as string[],
  );
}

/** Primary role from "Head of Engineering | Sr. Engineering Manager". */
function normalizeExperienceTitle(raw: string): string {
  const primary = raw.split("|")[0]?.trim() ?? raw.trim();
  return normalizeTitle(primary);
}

const ROLE_TITLE_PATTERN =
  /\b(engineer|engineering|manager|director|lead|developer|architect|head|vp|president|analyst|consultant|specialist|coordinator|administrator|officer|principal|staff|senior|sr\.?)\b/i;

function looksLikeRoleTitle(label: string): boolean {
  return ROLE_TITLE_PATTERN.test(label);
}

function isEmployerLabel(label: string, companies: Set<string>): boolean {
  const lower = label.toLowerCase();
  if (companies.has(lower)) return true;
  for (const company of companies) {
    if (lower === company || lower.startsWith(`${company} `)) return true;
  }
  return false;
}

function isValidIdentityCandidate(label: string, companies: Set<string>): boolean {
  const normalized = normalizeTitle(label);
  if (!normalized) return false;
  if (isEmployerLabel(normalized, companies)) return false;
  return looksLikeRoleTitle(normalized);
}

/** Bare titles like "Director" without domain — prefer a specific experience title. */
function isGenericIdentityTitle(label: string): boolean {
  const normalized = normalizeTitle(label).toLowerCase();
  if (!normalized) return true;
  if (/^(senior |sr\.? )?(director|manager|lead|professional|consultant|specialist|executive)$/.test(normalized)) {
    return true;
  }
  if (/^director$/i.test(normalized)) return true;
  return false;
}

function pickRecentExperienceTitle(form: HubRefineryForm): string {
  for (const exp of form.experience ?? []) {
    if (exp.hidden) continue;
    const title = exp.title?.trim();
    if (title) return normalizeExperienceTitle(title);
  }
  return "";
}

function extractSummaryLead(summary: string, companies: Set<string>): string | null {
  const trimmed = summary.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(.+?)\s+with\s+\d+/i);
  if (match?.[1]) {
    const lead = normalizeTitle(match[1]);
    if (isValidIdentityCandidate(lead, companies)) return lead;
    return null;
  }
  const firstSentence = trimmed.split(/[.!?]/)[0]?.trim();
  if (
    firstSentence &&
    firstSentence.length <= 80 &&
    isValidIdentityCandidate(firstSentence, companies)
  ) {
    return firstSentence;
  }
  return null;
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9+#/]+/)
      .filter((t) => t.length >= 3),
  );
}

export function computeExperienceJdOverlap(
  form: HubRefineryForm,
  jdKeywords: string[],
): number {
  if (jdKeywords.length === 0) return 0;

  const blob = (form.experience ?? [])
    .filter((e) => !e.hidden)
    .map((e) => `${e.title ?? ""} ${e.company ?? ""} ${e.bullets ?? ""}`)
    .join(" ")
    .toLowerCase();

  const titleBlob = (form.experience ?? [])
    .filter((e) => !e.hidden)
    .map((e) => e.title ?? "")
    .join(" ")
    .toLowerCase();

  const jdTokens = new Set(
    jdKeywords.flatMap((kw) => [...tokenize(kw)]).filter((t) => t.length >= 4),
  );
  if (jdTokens.size === 0) return 0;

  let hits = 0;
  for (const token of jdTokens) {
    if (blob.includes(token) || titleBlob.includes(token)) hits++;
  }

  return hits / jdTokens.size;
}

function candidateLooksTechnical(form: HubRefineryForm, jdDomain?: JDDomain): boolean {
  if (jdDomain && TECH_DOMAINS.has(jdDomain)) return true;

  const blob = (form.experience ?? [])
    .map((e) => `${e.title ?? ""} ${e.bullets ?? ""}`)
    .join(" ")
    .toLowerCase();

  return /\b(engineer|engineering|software|developer|mobile|platform|api|devops|architect)\b/.test(
    blob,
  );
}

function looksLikeTechnicalTargetRole(role: string): boolean {
  return /\b(ai|ml|machine learning|data|architecture|architect|engineering|engineer|software|platform|cloud|security|devops|sre|mobile|backend|frontend|fullstack)\b/i.test(
    role,
  );
}

export function resolveSummaryIdentity(input: SummaryIdentityInput): SummaryIdentityResolution {
  const jdTargetRole = normalizeTitle(input.jdTargetRole) || "Professional";
  const companies = experienceCompanies(input.form);
  const profileTitle = normalizeTitle(input.profileTargetTitle ?? "");
  const recentTitle = pickRecentExperienceTitle(input.form);
  const summaryLead = extractSummaryLead(input.currentSummary ?? "", companies);

  const candidates = [profileTitle, recentTitle, summaryLead].filter(
    (c): c is string =>
      typeof c === "string" && c.length > 0 && isValidIdentityCandidate(c, companies),
  );
  const specific = candidates.find((c) => !isGenericIdentityTitle(c));
  const identity = specific ?? candidates[0] ?? "Professional";

  const overlapScore = computeExperienceJdOverlap(input.form, input.jdKeywords ?? []);
  const isCrossDomain = overlapScore < OVERLAP_CROSS_DOMAIN;
  const isTechnicalCandidate = candidateLooksTechnical(input.form, input.jdDomain);
  const mayUseTechnicalTargetRole =
    isTechnicalCandidate &&
    looksLikeTechnicalTargetRole(jdTargetRole) &&
    !isCrossDomain &&
    normalizeTitle(identity).toLowerCase() !== jdTargetRole.toLowerCase();
  const mayUseJdTitleInSummary =
    mayUseTechnicalTargetRole ||
    (!isCrossDomain &&
      overlapScore >= OVERLAP_USE_JD_TITLE &&
      normalizeTitle(identity).toLowerCase() !== jdTargetRole.toLowerCase());

  return {
    identity,
    jdTargetRole,
    overlapScore,
    mayUseJdTitleInSummary,
    isCrossDomain,
    isTechnicalCandidate,
  };
}

export function isNonTechJdDomain(domain: JDDomain | undefined): boolean {
  if (!domain) return false;
  return NON_TECH_DOMAINS.has(domain);
}
