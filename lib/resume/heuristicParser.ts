const EMAIL_REGEX = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/;
const PHONE_REGEX =
  /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b/;

const DATE_RANGE_REGEX =
  /(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{4}|\d{1,2}\/\d{4}|\d{4})\s*[-–—~to]+\s*(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{4}|\d{1,2}\/\d{4}|\d{4}|Present|Current|Now)/i;

const BULLET_REGEX = /^[\s•\-\*·▪◦‣▸►→✓✔○●]\s*/;
const URL_REGEX = /https?:\/\/|www\.|linkedin\.com|github\.com/i;

const SECTION_KEYWORDS = {
  experience: [
    "EXPERIENCE",
    "WORK EXPERIENCE",
    "PROFESSIONAL EXPERIENCE",
    "EMPLOYMENT",
    "EMPLOYMENT HISTORY",
    "CAREER HISTORY",
  ],
  education: ["EDUCATION", "ACADEMIC BACKGROUND", "ACADEMICS"],
  skills: ["SKILLS", "TECHNICAL SKILLS", "CORE COMPETENCIES", "TECHNOLOGIES"],
} as const;

export type ParsedWorkExperience = {
  company: string;
  role: string;
  date: string;
  description: string[];
};

export type ParsedEducation = {
  school: string;
  degree: string;
  date: string;
};

export type StructuredResume = {
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedIn: string | null;
  summary: string | null;
  experience: ParsedWorkExperience[];
  education: ParsedEducation[];
  skills: string[];
  certifications: string[];
  projects: string[];
  languages: string[];
};

type ResumeSection = keyof typeof SECTION_KEYWORDS | "other";

function cleanLine(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

function normalizeLines(text: string): string[] {
  return text.split(/\r?\n/).map(cleanLine).filter(Boolean);
}

function isAllCapsKeywordLine(line: string): boolean {
  const letters = line.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 3) return false;
  return letters === letters.toUpperCase();
}

function lineContainsSectionKeyword(
  line: string,
  keywords: readonly string[],
): boolean {
  const normalized = line.toUpperCase().replace(/[^A-Z\s]/g, " ").replace(/\s+/g, " ").trim();
  return keywords.some(
    (keyword) =>
      normalized === keyword ||
      normalized.startsWith(`${keyword} `) ||
      normalized.endsWith(` ${keyword}`) ||
      normalized.includes(` ${keyword} `),
  );
}

function detectSection(line: string): ResumeSection {
  if (!isAllCapsKeywordLine(line)) {
    return "other";
  }

  if (lineContainsSectionKeyword(line, SECTION_KEYWORDS.experience)) {
    return "experience";
  }
  if (lineContainsSectionKeyword(line, SECTION_KEYWORDS.education)) {
    return "education";
  }
  if (lineContainsSectionKeyword(line, SECTION_KEYWORDS.skills)) {
    return "skills";
  }

  return "other";
}

function splitIntoSections(text: string): Map<ResumeSection, string[]> {
  const lines = normalizeLines(text);
  const sections = new Map<ResumeSection, string[]>();
  let current: ResumeSection = "other";

  for (const line of lines) {
    const detected = detectSection(line);
    if (detected !== "other") {
      current = detected;
      if (!sections.has(current)) {
        sections.set(current, []);
      }
      continue;
    }

    if (!sections.has(current)) {
      sections.set(current, []);
    }
    sections.get(current)!.push(line);
  }

  return sections;
}

function isContactOrNoiseLine(line: string): boolean {
  return (
    EMAIL_REGEX.test(line) ||
    PHONE_REGEX.test(line) ||
    URL_REGEX.test(line) ||
    detectSection(line) !== "other"
  );
}

function extractName(lines: string[]): string | null {
  for (const line of lines.slice(0, 12)) {
    if (isContactOrNoiseLine(line)) continue;
    if (line.length < 2 || line.length > 80) continue;
    if (/^\d/.test(line)) continue;
    if (/[,|@]/.test(line)) continue;

    const words = line.split(/\s+/);
    if (words.length >= 1 && words.length <= 6) {
      return line;
    }
  }

  return null;
}

function extractEmail(text: string): string | null {
  return text.match(EMAIL_REGEX)?.[0]?.toLowerCase() ?? null;
}

function extractPhone(text: string): string | null {
  return text.match(PHONE_REGEX)?.[0]?.trim() ?? null;
}

function extractDateFromLine(line: string): string | null {
  const match = line.match(DATE_RANGE_REGEX);
  return match?.[0]?.trim() ?? null;
}

function stripDateFromLine(line: string): string {
  return cleanLine(line.replace(DATE_RANGE_REGEX, "").replace(/^[|,\-–—]+\s*|\s*[|,\-–—]+$/g, ""));
}

function isBulletLine(line: string): boolean {
  return BULLET_REGEX.test(line);
}

function stripBullet(line: string): string {
  return cleanLine(line.replace(BULLET_REGEX, ""));
}

function parseRoleCompany(line: string): { role: string; company: string } {
  const atMatch = line.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
  if (atMatch) {
    return { role: atMatch[1].trim(), company: atMatch[2].trim() };
  }

  const pipeParts = line.split(/\s*[|–—]\s*/).map(cleanLine).filter(Boolean);
  if (pipeParts.length >= 2) {
    return { role: pipeParts[0], company: pipeParts[1] };
  }

  const commaParts = line.split(",").map(cleanLine).filter(Boolean);
  if (commaParts.length === 2 && commaParts[1].length > 2) {
    return { role: commaParts[0], company: commaParts[1] };
  }

  return { role: line, company: "" };
}

function mergeRoleCompany(
  pending: string[],
  headerLine: string,
): { role: string; company: string } {
  const headerWithoutDate = stripDateFromLine(headerLine);
  const parsed = parseRoleCompany(headerWithoutDate);

  if (parsed.company) {
    return parsed;
  }

  if (pending.length === 0) {
    return parsed;
  }

  if (pending.length === 1) {
    return { company: pending[0], role: parsed.role || pending[0] };
  }

  return {
    company: pending[0],
    role: pending[1] || parsed.role,
  };
}

function parseExperienceLines(lines: string[]): ParsedWorkExperience[] {
  const entries: ParsedWorkExperience[] = [];
  let current: ParsedWorkExperience | null = null;
  let pendingHeader: string[] = [];

  const flush = () => {
    if (current && (current.role || current.company || current.description.length > 0)) {
      entries.push(current);
    }
    current = null;
    pendingHeader = [];
  };

  for (const rawLine of lines) {
    const line = cleanLine(rawLine);
    if (!line) continue;

    if (isBulletLine(line)) {
      if (!current) {
        current = { company: "", role: "", date: "", description: [] };
      }
      const bullet = stripBullet(line);
      if (bullet) {
        current.description.push(bullet);
      }
      continue;
    }

    const date = extractDateFromLine(line);
    if (date) {
      flush();
      const { role, company } = mergeRoleCompany(pendingHeader, line);
      current = {
        company: company || role,
        role: role || company,
        date,
        description: [],
      };
      pendingHeader = [];
      continue;
    }

    if (current && current.description.length > 0) {
      flush();
    }

    if (pendingHeader.length < 2) {
      pendingHeader.push(line);
    } else {
      pendingHeader.shift();
      pendingHeader.push(line);
    }
  }

  flush();
  return entries;
}

function parseEducationLines(lines: string[]): ParsedEducation[] {
  const entries: ParsedEducation[] = [];
  let pending: string[] = [];

  for (const rawLine of lines) {
    const line = cleanLine(rawLine);
    if (!line || isBulletLine(line)) continue;

    const date = extractDateFromLine(line);
    if (date) {
      const withoutDate = stripDateFromLine(line);
      const parts = withoutDate.split(/[,|–—-]/).map(cleanLine).filter(Boolean);

      entries.push({
        school: pending[0] || parts[1] || parts[0] || "",
        degree: pending[1] || parts[0] || "",
        date,
      });
      pending = [];
      continue;
    }

    if (pending.length < 2) {
      pending.push(line);
    } else {
      pending = [pending[1], line];
    }
  }

  if (pending.length > 0) {
    entries.push({
      school: pending.length > 1 ? pending[0] : "",
      degree: pending.length > 1 ? pending[1] : pending[0],
      date: "",
    });
  }

  return entries.filter((entry) => entry.school || entry.degree);
}

function parseSkillsLines(lines: string[]): string[] {
  const blob = lines
    .map((line) => (isBulletLine(line) ? stripBullet(line) : line))
    .join(", ");

  const skills = blob
    .split(/[,;|•·\/]|\s{2,}/)
    .map(cleanLine)
    .filter((skill) => skill.length > 1 && skill.length < 60);

  return Array.from(new Set(skills)).slice(0, 40);
}

/**
 * Open-Resume-inspired heuristic parser: all-caps section headers, regex contact
 * fields, and state-machine work experience extraction.
 */
export function parseResumeHeuristics(text: string): StructuredResume {
  const lines = normalizeLines(text);
  const sections = splitIntoSections(text);

  const experienceLines = sections.get("experience") ?? [];
  const educationLines = sections.get("education") ?? [];
  const skillsLines = sections.get("skills") ?? [];

  const sectionSkills = parseSkillsLines(skillsLines);
  const experience = parseExperienceLines(experienceLines);
  const education = parseEducationLines(educationLines);

  return {
    name: extractName(lines),
    email: extractEmail(text),
    phone: extractPhone(text),
    location: null,
    linkedIn: null,
    summary: null,
    experience,
    education,
    skills: sectionSkills,
    certifications: [],
    projects: [],
    languages: [],
  };
}
