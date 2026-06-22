/**
 * Deterministic job + resume context extractor for EasySubmit.ai.
 *
 * Zero runtime dependencies — regex and string ops only.
 *
 * Prompt alignment (what downstream AI expects):
 * - Cover letter brain: candidate name, skills, recent role, company, job title, JD excerpt
 * - Resume enhance brain: target role fit + JD keyword mirroring (truthful only)
 *
 * This module pre-parses those facts so templates and prompts can avoid guessing.
 */

import { parseResumeHeuristics } from "@/lib/resume/heuristicParser";
import { TECH_SKILLS } from "@/lib/resume/skills";

// ─── Public types ─────────────────────────────────────────────────────────────

/** Whether a field was parsed from source text or replaced with a safe default. */
export type FieldSource = "parsed" | "fallback";

export type ParsedField<T> = {
  value: T;
  source: FieldSource;
};

export type ResumeContext = {
  candidateName: ParsedField<string>;
  email: ParsedField<string>;
  location: ParsedField<string>;
  /** Up to three skills from {@link TECH_SKILLS} checklist order. */
  topSkills: ParsedField<string[]>;
  mostRecentJobTitle: ParsedField<string>;
};

export type JobContext = {
  companyName: ParsedField<string>;
  targetJobTitle: ParsedField<string>;
  /** Up to three most frequent meaningful tokens in the JD. */
  topKeywords: ParsedField<string[]>;
};

export type JobAndResumeContext = {
  resume: ResumeContext;
  job: JobContext;
};

// ─── Fallback defaults ────────────────────────────────────────────────────────

export const RESUME_CONTEXT_FALLBACKS = {
  candidateName: "Candidate",
  email: "",
  location: "Not specified",
  topSkills: [] as string[],
  mostRecentJobTitle: "Professional",
} as const;

export const JOB_CONTEXT_FALLBACKS = {
  companyName: "Company",
  targetJobTitle: "Role",
  topKeywords: [] as string[],
} as const;

// ─── Shared regex / constants ─────────────────────────────────────────────────

const EMAIL_REGEX = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/;

const DATE_RANGE_REGEX =
  /(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{4}|\d{1,2}\/\d{4}|\d{4})\s*[-–—~to]+\s*(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{4}|\d{1,2}\/\d{4}|\d{4}|Present|Current|Now)/i;

const LOCATION_LABEL_REGEX = /^(?:location|address|based in|residing in)\s*[:\-–—]\s*(.+)$/i;

/** US "City, ST" or "City, State" and international "City, Country". */
const CITY_REGION_REGEX =
  /\b([A-Za-z][A-Za-z .'-]{1,40}),\s*([A-Z]{2}|[A-Za-z][A-Za-z .'-]{2,40})\b/;

const ROLE_TITLE_HINT =
  /\b(engineer|developer|manager|designer|analyst|architect|director|lead|specialist|consultant|coordinator|administrator|scientist|researcher|intern|associate|vp|head of)\b/i;

const GENERIC_JD_LINE =
  /^(job description|about (the )?role|about us|overview|responsibilities|requirements|qualifications|what you('ll| will) do|who we are|summary|description)$/i;

const JD_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "our",
  "that",
  "the",
  "their",
  "this",
  "to",
  "we",
  "will",
  "with",
  "you",
  "your",
  "all",
  "can",
  "may",
  "not",
  "who",
  "what",
  "when",
  "where",
  "how",
  "about",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "between",
  "under",
  "over",
  "such",
  "than",
  "then",
  "them",
  "they",
  "these",
  "those",
  "been",
  "being",
  "were",
  "was",
  "also",
  "able",
  "work",
  "role",
  "team",
  "job",
  "jobs",
  "company",
  "experience",
  "years",
  "year",
  "including",
  "within",
  "using",
  "use",
  "used",
  "must",
  "should",
  "would",
  "could",
  "other",
  "more",
  "most",
  "some",
  "any",
  "each",
  "both",
  "new",
  "well",
  "high",
  "strong",
  "excellent",
  "preferred",
  "required",
  "requirements",
  "responsibilities",
  "qualifications",
  "skills",
  "ability",
  "opportunity",
  "position",
  "candidate",
  "candidates",
  "applicant",
  "applicants",
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parsed<T>(value: T): ParsedField<T> {
  return { value, source: "parsed" };
}

function fallback<T>(value: T): ParsedField<T> {
  return { value, source: "fallback" };
}

/**
 * Normalize markdown-ish resume/JD text to plain lines for regex parsing.
 * Strips headings, emphasis, links, and code fences without external libs.
 */
export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function nonEmptyLines(text: string): string[] {
  return text
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function isLikelyPersonName(line: string): boolean {
  if (line.length < 2 || line.length > 80) return false;
  if (/^\d/.test(line)) return false;
  if (EMAIL_REGEX.test(line)) return false;
  if (/https?:\/\//i.test(line)) return false;
  if (/[,|@]/.test(line)) return false;
  const words = line.split(/\s+/);
  return words.length >= 1 && words.length <= 6;
}

function extractEmail(text: string): string | null {
  return text.match(EMAIL_REGEX)?.[0]?.toLowerCase() ?? null;
}

/**
 * Location: labeled line, City/Region pattern, or standalone "Remote".
 */
function extractLocation(lines: string[], fullText: string): string | null {
  for (const line of lines.slice(0, 20)) {
    const labelMatch = line.match(LOCATION_LABEL_REGEX);
    if (labelMatch?.[1]?.trim()) {
      return labelMatch[1].trim();
    }
  }

  if (/\bremote\b/i.test(fullText) && !/\bnot remote\b/i.test(fullText)) {
    const remoteLine = lines.find((line) => /^remote(?:\s+ok)?$/i.test(line));
    if (remoteLine) return "Remote";
  }

  for (const line of lines.slice(0, 15)) {
    if (EMAIL_REGEX.test(line) || DATE_RANGE_REGEX.test(line)) continue;
    const cityMatch = line.match(CITY_REGION_REGEX);
    if (cityMatch) {
      return `${cityMatch[1].trim()}, ${cityMatch[2].trim()}`;
    }
  }

  const blobMatch = fullText.match(CITY_REGION_REGEX);
  return blobMatch ? `${blobMatch[1].trim()}, ${blobMatch[2].trim()}` : null;
}

/**
 * Walk the predefined TECH_SKILLS checklist in priority order; return first three hits.
 */
function extractTopSkillsFromChecklist(text: string, limit = 3): string[] {
  const normalized = text.toLowerCase();
  const found: string[] = [];

  for (const skill of TECH_SKILLS) {
    const pattern = new RegExp(`\\b${escapeRegExp(skill.toLowerCase())}\\b`, "i");
    if (pattern.test(normalized)) {
      found.push(skill);
      if (found.length >= limit) break;
    }
  }

  return found;
}

function stripDateFromLine(line: string): string {
  return line.replace(DATE_RANGE_REGEX, "").replace(/^[|,\-–—]+\s*|\s*[|,\-–—]+$/g, "").trim();
}

function parseRoleFromExperienceLine(line: string): string | null {
  const withoutDate = stripDateFromLine(line);
  if (!withoutDate) return null;

  const atMatch = withoutDate.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
  if (atMatch?.[1]?.trim()) return atMatch[1].trim();

  const pipeParts = withoutDate.split(/\s*[|–—]\s*/).map((part) => part.trim()).filter(Boolean);
  if (pipeParts[0]) return pipeParts[0];

  const commaParts = withoutDate.split(",").map((part) => part.trim()).filter(Boolean);
  if (commaParts.length >= 2 && commaParts[0].length > 2) return commaParts[0];

  return withoutDate;
}

function extractMostRecentJobTitle(text: string, structuredExperience: { role: string }[]): string | null {
  const firstStructured = structuredExperience.find((entry) => entry.role?.trim());
  if (firstStructured?.role?.trim()) {
    return firstStructured.role.trim();
  }

  const lines = nonEmptyLines(text);
  const experienceHeader = /^(work experience|professional experience|experience|employment|career history)$/i;
  let inExperience = false;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!;

    if (experienceHeader.test(line)) {
      inExperience = true;
      continue;
    }

    const roleAtMatch = line.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
    if (roleAtMatch?.[1]?.trim() && ROLE_TITLE_HINT.test(roleAtMatch[1])) {
      if (inExperience || index < 25) {
        return roleAtMatch[1].trim();
      }
    }

    if (ROLE_TITLE_HINT.test(line) && !DATE_RANGE_REGEX.test(line)) {
      const nextLine = lines[index + 1];
      if (nextLine && DATE_RANGE_REGEX.test(nextLine)) {
        const role = parseRoleFromExperienceLine(line);
        if (role) return role;
      }
    }

    if ((inExperience || index < 25) && DATE_RANGE_REGEX.test(line)) {
      const role = parseRoleFromExperienceLine(line);
      if (role && ROLE_TITLE_HINT.test(role)) return role;
    }
  }

  return null;
}

function extractCandidateName(lines: string[], heuristicName: string | null): string | null {
  if (heuristicName?.trim()) return heuristicName.trim();

  for (const line of lines.slice(0, 12)) {
    if (!isLikelyPersonName(line)) continue;
    return line;
  }

  return null;
}

// ─── Resume extraction ──────────────────────────────────────────────────────────

function extractResumeContext(resumeMarkdown: string): ResumeContext {
  const plain = markdownToPlainText(resumeMarkdown);
  const lines = nonEmptyLines(plain);
  const heuristics = parseResumeHeuristics(plain);

  const nameValue = extractCandidateName(lines, heuristics.name);
  const emailValue = extractEmail(plain) ?? heuristics.email;
  const locationValue = extractLocation(lines, plain);
  const skillsValue = extractTopSkillsFromChecklist(plain, 3);
  const titleValue = extractMostRecentJobTitle(plain, heuristics.experience);

  return {
    candidateName: nameValue
      ? parsed(nameValue)
      : fallback(RESUME_CONTEXT_FALLBACKS.candidateName),
    email: emailValue ? parsed(emailValue) : fallback(RESUME_CONTEXT_FALLBACKS.email),
    location: locationValue
      ? parsed(locationValue)
      : fallback(RESUME_CONTEXT_FALLBACKS.location),
    topSkills:
      skillsValue.length > 0
        ? parsed(skillsValue)
        : fallback([...RESUME_CONTEXT_FALLBACKS.topSkills]),
    mostRecentJobTitle: titleValue
      ? parsed(titleValue)
      : fallback(RESUME_CONTEXT_FALLBACKS.mostRecentJobTitle),
  };
}

// ─── Job description extraction ───────────────────────────────────────────────

function cleanCompanyCandidate(value: string): string | null {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed || trimmed.length < 2 || trimmed.length > 80) return null;
  if (GENERIC_JD_LINE.test(trimmed)) return null;
  if (/^\d+$/.test(trimmed)) return null;
  return trimmed.replace(/[.,;:]+$/, "");
}

function extractCompanyName(lines: string[], fullText: string): string | null {
  for (const line of lines.slice(0, 8)) {
    const aboutLine = line.match(/^about\s+(.+)$/i);
    if (aboutLine?.[1]) {
      const company = cleanCompanyCandidate(aboutLine[1]);
      if (company) return company;
    }
  }

  const aboutHiring = fullText.match(
    /\babout\s+([A-Z][A-Za-z0-9&.'\- ]{1,60})(?:\s+is|\s+we|\s*,|\s*$)/i,
  );
  if (aboutHiring?.[1]) {
    const company = cleanCompanyCandidate(aboutHiring[1]);
    if (company) return company;
  }

  const isHiring = fullText.match(/\b([A-Z][A-Za-z0-9&.'\- ]{1,60})\s+is hiring\b/i);
  if (isHiring?.[1]) {
    const company = cleanCompanyCandidate(isHiring[1]);
    if (company) return company;
  }

  const joinCompany = fullText.match(/\bjoin\s+([A-Z][A-Za-z0-9&.'\- ]{1,60})\b/i);
  if (joinCompany?.[1]) {
    const company = cleanCompanyCandidate(joinCompany[1]);
    if (company) return company;
  }

  const atCompany = fullText.match(/\b(?:at|@)\s+([A-Z][A-Za-z0-9&.'\- ]{2,60})(?:\s+[,.\n]|$)/);
  if (atCompany?.[1]) {
    const company = cleanCompanyCandidate(atCompany[1]);
    if (company) return company;
  }

  // First substantive line is often the company on scraped postings.
  for (const line of lines.slice(0, 5)) {
    if (GENERIC_JD_LINE.test(line)) continue;
    if (/^about\s+/i.test(line)) continue;
    if (ROLE_TITLE_HINT.test(line) && line.length < 90) continue;
    if (line.length > 70) continue;
    const company = cleanCompanyCandidate(line);
    if (company && !/^(the|a|an)\s/i.test(company)) return company;
  }

  return null;
}

function extractTargetJobTitle(lines: string[], fullText: string): string | null {
  const labeled = fullText.match(
    /(?:job title|position|role|opening)\s*[:\-–—]\s*([^\n]{2,120})/i,
  );
  if (labeled?.[1]?.trim()) {
    return labeled[1].trim().replace(/[.,;:]+$/, "");
  }

  const hiringRole = fullText.match(
    /\bhiring\s+(?:a|an)\s+([A-Za-z0-9][A-Za-z0-9 /&,\-]{2,80})/i,
  );
  if (hiringRole?.[1]?.trim()) {
    return hiringRole[1].trim().replace(/[.,;:]+$/, "");
  }

  // Title often appears on line 1–2 before company or "About" blocks.
  for (const line of lines.slice(0, 6)) {
    if (GENERIC_JD_LINE.test(line)) continue;
    if (line.length < 4 || line.length > 100) continue;
    if (ROLE_TITLE_HINT.test(line)) {
      return line.replace(/[.,;:]+$/, "");
    }
  }

  return null;
}

/**
 * Prefer checklist skill terms found in the JD (by frequency), then general tokens.
 */
function extractTopKeywords(jdText: string, limit = 3, excludeTerms: string[] = []): string[] {
  const exclude = new Set(
    excludeTerms
      .flatMap((term) => term.toLowerCase().split(/\s+/))
      .filter((token) => token.length >= 2),
  );

  const skillHits: { term: string; count: number }[] = [];
  const normalized = jdText.toLowerCase();

  for (const skill of TECH_SKILLS) {
    const token = skill.toLowerCase();
    if (exclude.has(token)) continue;
    const pattern = new RegExp(`\\b${escapeRegExp(token)}\\b`, "gi");
    const matches = normalized.match(pattern);
    if (matches?.length) {
      skillHits.push({ term: token, count: matches.length });
    }
  }

  skillHits.sort((a, b) => b.count - a.count || a.term.localeCompare(b.term));
  const results = skillHits.slice(0, limit).map((hit) => hit.term);
  if (results.length >= limit) return results;

  const tokens = normalized
    .replace(/[^a-z0-9+\-#/ ]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(
      (token) =>
        token.length >= 3 &&
        !JD_STOPWORDS.has(token) &&
        !exclude.has(token) &&
        !results.includes(token),
    );

  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  const general = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([word]) => word)
    .filter((word) => !results.includes(word));

  return [...results, ...general].slice(0, limit);
}

function extractJobContext(jdText: string): JobContext {
  const plain = markdownToPlainText(jdText);
  const lines = nonEmptyLines(plain);

  const companyValue = extractCompanyName(lines, plain);
  const titleValue = extractTargetJobTitle(lines, plain);
  const keywordsValue = extractTopKeywords(plain, 3, [
    companyValue ?? "",
    titleValue ?? "",
  ]);

  return {
    companyName: companyValue
      ? parsed(companyValue)
      : fallback(JOB_CONTEXT_FALLBACKS.companyName),
    targetJobTitle: titleValue
      ? parsed(titleValue)
      : fallback(JOB_CONTEXT_FALLBACKS.targetJobTitle),
    topKeywords:
      keywordsValue.length > 0
        ? parsed(keywordsValue)
        : fallback([...JOB_CONTEXT_FALLBACKS.topKeywords]),
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Extract structured resume + job posting context using deterministic rules.
 *
 * @param resumeMarkdown - Resume as markdown or plain text (contact + experience sections).
 * @param jdText - Job description as markdown or plain text.
 */
export function extractJobAndResumeContext(
  resumeMarkdown: string,
  jdText: string,
): JobAndResumeContext {
  const resume = extractResumeContext(resumeMarkdown ?? "");
  const job = extractJobContext(jdText ?? "");
  return { resume, job };
}

/**
 * Convenience helper: flatten parsed context to plain strings for prompt templates.
 * Fallback values are included when parsing fails.
 */
export function flattenJobAndResumeContext(ctx: JobAndResumeContext): {
  candidateName: string;
  email: string;
  location: string;
  topSkills: string[];
  mostRecentJobTitle: string;
  companyName: string;
  targetJobTitle: string;
  topKeywords: string[];
} {
  return {
    candidateName: ctx.resume.candidateName.value,
    email: ctx.resume.email.value,
    location: ctx.resume.location.value,
    topSkills: [...ctx.resume.topSkills.value],
    mostRecentJobTitle: ctx.resume.mostRecentJobTitle.value,
    companyName: ctx.job.companyName.value,
    targetJobTitle: ctx.job.targetJobTitle.value,
    topKeywords: [...ctx.job.topKeywords.value],
  };
}
