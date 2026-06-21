/**
 * ATS-safe resume text cleanup after PDF/DOCX extraction.
 * See EASYSUBMIT_RESUME_RULES.md §1, §4, §8 — strips extraction junk and list
 * markers; preserves legitimate punctuation (C++, AT&T, $, %, accents).
 */

/** Unicode glyphs commonly used as list markers in Word/PDF resumes. */
export const RESUME_BULLET_GLYPHS = [
  "🞄",
  "⚫︎",
  "⬤",
  "⋅",
  "∙",
  "•",
  "⦁",
  "●",
  "⚬",
  "○",
  "·",
  "▪",
  "◦",
  "‣",
  "▸",
  "►",
  "→",
  "✓",
  "✔",
] as const;

const BULLET_GLYPHS_BY_LENGTH = [...RESUME_BULLET_GLYPHS].sort(
  (a, b) => b.length - a.length,
);

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const ZERO_WIDTH_TO_SPACE = /[\u200B-\u200D]/g;
const INVISIBLE_CHARS = /[\u2060\uFEFF]/g;
const SOFT_HYPHEN = /\u00AD/g;
const REPLACEMENT_AND_PUA = /[\uFFFD]|[\uE000-\uF8FF]/g;

const SMART_QUOTE_MAP: Record<string, string> = {
  "\u2018": "'",
  "\u2019": "'",
  "\u201A": "'",
  "\u201B": "'",
  "\u201C": '"',
  "\u201D": '"',
  "\u201E": '"',
  "\u201F": '"',
};

const LEADING_ASCII_BULLET = /^[\s*\-–—]\s*/;

const NUMBERED_LIST_PREFIX = /^\d+[.)]\s+/;

/** Strip control chars, zero-width spaces, soft hyphens, PUA glyphs, replacement char. */
export function stripResumeJunkChars(text: string): string {
  return text
    .replace(CONTROL_CHARS, "")
    .replace(ZERO_WIDTH_TO_SPACE, " ")
    .replace(INVISIBLE_CHARS, "")
    .replace(SOFT_HYPHEN, "")
    .replace(REPLACEMENT_AND_PUA, "")
    .replace(/\u00A0/g, " ");
}

export function normalizeSmartQuotes(text: string): string {
  let result = text;
  for (const [from, to] of Object.entries(SMART_QUOTE_MAP)) {
    result = result.split(from).join(to);
  }
  return result;
}

/** Collapse horizontal whitespace; optionally preserve newlines. */
export function collapseResumeWhitespace(
  text: string,
  preserveNewlines = false,
): string {
  if (preserveNewlines) {
    return text
      .split(/\r?\n/)
      .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
      .join("\n");
  }

  return text.replace(/\s+/g, " ").trim();
}

/** Remove leading list markers (unicode bullets, -, *, numbered prefixes). */
export function stripLeadingBulletMarker(line: string): string {
  let result = line;

  for (let pass = 0; pass < 8; pass += 1) {
    const trimmed = result.trimStart();
    if (trimmed !== result) {
      result = trimmed;
    }

    const numbered = result.match(NUMBERED_LIST_PREFIX);
    if (numbered) {
      result = result.slice(numbered[0].length);
      continue;
    }

    let matchedGlyph = false;
    for (const glyph of BULLET_GLYPHS_BY_LENGTH) {
      if (result.startsWith(glyph)) {
        result = result.slice(glyph.length).trimStart();
        matchedGlyph = true;
        break;
      }
    }
    if (matchedGlyph) {
      continue;
    }

    const asciiBullet = result.match(LEADING_ASCII_BULLET);
    if (asciiBullet) {
      result = result.slice(asciiBullet[0].length);
      continue;
    }

    break;
  }

  return result;
}

/** Normalize a single resume field line (title, company, skill token, etc.). */
export function normalizeResumeLine(line: string): string {
  const cleaned = collapseResumeWhitespace(
    normalizeSmartQuotes(stripResumeJunkChars(line)),
  );
  return cleaned;
}

/** Normalize one experience bullet line — strips leading markers then cleans text. */
export function normalizeBulletLine(line: string): string {
  const withoutMarker = stripLeadingBulletMarker(stripResumeJunkChars(line));
  return collapseResumeWhitespace(normalizeSmartQuotes(withoutMarker));
}

/** Normalize multiline bullet storage (one achievement per line). */
export function normalizeBulletText(text: string | unknown): string {
  let source = "";
  if (typeof text === "string") {
    source = text;
  } else if (Array.isArray(text)) {
    source = text
      .filter((line): line is string => typeof line === "string")
      .join("\n");
  }

  return source
    .split(/\r?\n/)
    .map((line) => normalizeBulletLine(line))
    .filter(Boolean)
    .join("\n");
}

/** Normalize an array of parsed bullet/description lines. */
export function normalizeBulletLines(lines: string[]): string[] {
  return lines
    .map((line) => normalizeBulletLine(line))
    .filter(Boolean);
}

/** Normalize date-range strings to ATS-friendly en-dash separators. */
export function normalizeDateRangeString(value: string): string {
  const cleaned = collapseResumeWhitespace(
    normalizeSmartQuotes(stripResumeJunkChars(value)),
  );
  if (!cleaned) {
    return "";
  }

  return cleaned.replace(/\s*(?:[-–—~]|to)\s*/gi, " – ");
}

/** Contact tokens — junk strip only; preserve @ and URL characters. */
export function normalizeContactToken(value: string): string {
  return collapseResumeWhitespace(normalizeSmartQuotes(stripResumeJunkChars(value)));
}

export type StructuredResumeLike = {
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedIn: string | null;
  summary: string | null;
  experience: Array<{
    company: string;
    role: string;
    date: string;
    description: string[];
  }>;
  education: Array<{
    school: string;
    degree: string;
    date: string;
  }>;
  skills: string[];
  certifications: string[];
  projects: string[];
  languages: string[];
};

/** Apply normalization to all fields on a parsed StructuredResume payload. */
export function normalizeStructuredResume<T extends StructuredResumeLike>(data: T): T {
  return {
    ...data,
    name: normalizeResumeLine(data.name ?? "") || null,
    email: normalizeContactToken(data.email ?? "") || null,
    phone: normalizeContactToken(data.phone ?? "") || null,
    location: normalizeResumeLine(data.location ?? "") || null,
    linkedIn: normalizeContactToken(data.linkedIn ?? "") || null,
    summary: normalizeBulletLine(data.summary ?? "") || null,
    experience: data.experience.map((entry) => ({
      company: normalizeResumeLine(entry.company),
      role: normalizeResumeLine(entry.role),
      date: normalizeDateRangeString(entry.date),
      description: normalizeBulletLines(entry.description),
    })),
    education: data.education.map((entry) => ({
      school: normalizeResumeLine(entry.school),
      degree: normalizeResumeLine(entry.degree),
      date: normalizeDateRangeString(entry.date),
    })),
    skills: data.skills
      .map((skill) => normalizeResumeLine(skill))
      .filter(Boolean),
    certifications: normalizeBulletLines(data.certifications),
    projects: data.projects.map((line) => normalizeResumeLine(line)).filter(Boolean),
    languages: data.languages.map((line) => normalizeResumeLine(line)).filter(Boolean),
  };
}
