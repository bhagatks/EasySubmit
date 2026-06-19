export type ParsedExperienceRow = {
  id: string;
  title: string;
  company: string;
};

export type ParsedProjectRow = {
  id: string;
  name: string;
  description: string;
};

const SECTION_BREAK =
  /^(experience|work experience|professional experience|employment|projects|project experience|education|skills|certifications|summary|objective)\b/i;

const ROLE_AT_COMPANY =
  /^(.{2,80}?)\s+(?:at|@)\s+(.{2,80}?)(?:\s*[|·•-]\s*|\s*\(?\d{4}|\s*$)/i;

const PROJECT_LINE =
  /^[-•*]?\s*([A-Z0-9][\w\s/&-]{2,60})(?:\s*[-–—:]\s*(.+))?$/;

function createId(prefix: string, index: number): string {
  return `${prefix}-${index}`;
}

function cleanLine(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

function isLikelyName(line: string): boolean {
  if (line.length < 3 || line.length > 60) return false;
  if (/@|https?:|linkedin|github|\d{3}/i.test(line)) return false;
  const words = line.split(/\s+/);
  return words.length >= 2 && words.length <= 5;
}

export function extractNameFromText(text: string): string | null {
  const lines = text
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean)
    .slice(0, 8);

  for (const line of lines) {
    if (isLikelyName(line) && !ROLE_AT_COMPANY.test(line)) {
      return line;
    }
  }

  return null;
}

export function extractLocationFromText(text: string): string | null {
  const cityState = text.match(
    /\b([A-Za-z][A-Za-z\s.'-]{1,40},\s*[A-Z]{2}(?:\s+\d{5})?)\b/,
  );
  if (cityState?.[1]) {
    return cityState[1].trim();
  }

  const cityCountry = text.match(
    /\b([A-Za-z][A-Za-z\s.'-]{1,40},\s*[A-Za-z][A-Za-z\s.'-]{2,40})\b/,
  );
  if (cityCountry?.[1] && !cityCountry[1].includes("@")) {
    return cityCountry[1].trim();
  }

  return null;
}

export function extractExperiencesFromText(text: string): ParsedExperienceRow[] {
  const lines = text.split(/\r?\n/).map(cleanLine).filter(Boolean);
  const results: ParsedExperienceRow[] = [];
  let inExperience = false;

  for (const line of lines) {
    if (/^(work\s+)?experience|professional\s+experience|employment\s+history/i.test(line)) {
      inExperience = true;
      continue;
    }

    if (inExperience && SECTION_BREAK.test(line) && !ROLE_AT_COMPANY.test(line)) {
      inExperience = false;
    }

    const match = line.match(ROLE_AT_COMPANY);
    if (match) {
      results.push({
        id: createId("exp", results.length),
        title: match[1].trim(),
        company: match[2].replace(/\s*\(?\d{4}.*$/, "").trim(),
      });
      continue;
    }

    if (inExperience && line.includes(" at ")) {
      const [title, company] = line.split(/\s+at\s+/i);
      if (title && company) {
        results.push({
          id: createId("exp", results.length),
          title: title.trim(),
          company: company.replace(/\s*\(?\d{4}.*$/, "").trim(),
        });
      }
    }
  }

  if (results.length === 0) {
    for (const line of lines) {
      const match = line.match(ROLE_AT_COMPANY);
      if (match) {
        results.push({
          id: createId("exp", results.length),
          title: match[1].trim(),
          company: match[2].replace(/\s*\(?\d{4}.*$/, "").trim(),
        });
      }
    }
  }

  return results.slice(0, 8);
}

export function extractProjectsFromText(text: string): ParsedProjectRow[] {
  const lines = text.split(/\r?\n/).map(cleanLine).filter(Boolean);
  const results: ParsedProjectRow[] = [];
  let inProjects = false;

  for (const line of lines) {
    if (/^projects?\b|project experience/i.test(line)) {
      inProjects = true;
      continue;
    }

    if (inProjects && SECTION_BREAK.test(line) && !PROJECT_LINE.test(line)) {
      inProjects = false;
    }

    if (!inProjects && !/^projects?\b/i.test(line)) {
      continue;
    }

    const match = line.match(PROJECT_LINE);
    if (match && !ROLE_AT_COMPANY.test(line)) {
      results.push({
        id: createId("proj", results.length),
        name: match[1].trim(),
        description: match[2]?.trim() ?? "",
      });
    }
  }

  return results.slice(0, 6);
}

export function splitLocationField(location: string): { city: string; country: string } {
  const parts = location.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) {
    return { city: "", country: "" };
  }
  if (parts.length === 1) {
    return { city: parts[0], country: "" };
  }
  return {
    city: parts[0],
    country: parts.slice(1).join(", "),
  };
}
