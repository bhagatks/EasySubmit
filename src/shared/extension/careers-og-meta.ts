/** Parse Phenom / iCIMS-style `og:title` strings for company + location backfill. */
export type CareersOgTitleMeta = {
  title: string | null;
  company: string | null;
  location: string | null;
};

function cleanSegment(value: string | null | undefined): string | null {
  const trimmed = value?.replace(/\s+/g, " ").trim();
  return trimmed && trimmed.length > 1 ? trimmed : null;
}

function stripJobSuffix(value: string): string {
  return value.replace(/\s+job\s*$/i, "").trim();
}

/**
 * Examples:
 * - `Lead Director, Software Development Engineering in Work at Home, Texas, United States | Innovation and Technology at CVS Health Job`
 * - `Senior Consultant - Data Engineering | Slalom`
 */
export function parseCareersOgTitleMeta(raw: string | null | undefined): CareersOgTitleMeta {
  const source = raw?.trim();
  if (!source) {
    return { title: null, company: null, location: null };
  }

  const segments = source
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  const primary = segments[0] ?? source;
  const secondary = segments[1] ?? null;

  let title: string | null = cleanSegment(primary);
  let location: string | null = null;
  let company: string | null = null;

  const inMatch = primary.match(/^(.+?)\s+in\s+(.+)$/i);
  if (inMatch) {
    title = cleanSegment(inMatch[1]);
    location = cleanSegment(inMatch[2]);
  }

  if (secondary) {
    const atMatch = secondary.match(/^(.+?)\s+at\s+(.+)$/i);
    if (atMatch) {
      company = cleanSegment(stripJobSuffix(atMatch[2] ?? ""));
    } else {
      company = cleanSegment(stripJobSuffix(secondary));
    }
  }

  return { title, company, location };
}

const KNOWN_COMPANY_SUFFIXES = new Set([
  "slalom",
  "optimum",
  "cvs health",
  "walmart",
  "linkedin",
]);

/** Parse `document.title` patterns like `Role (City) - 1959 - Slalom`. */
export function parseDocumentTitleCareersMeta(raw: string | null | undefined): CareersOgTitleMeta {
  const source = raw?.trim();
  if (!source) return { title: null, company: null, location: null };

  const parts = source
    .split(" - ")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) {
    return { title: cleanSegment(source), company: null, location: null };
  }

  const maybeCompany = parts[parts.length - 1] ?? "";
  const companyKnown = KNOWN_COMPANY_SUFFIXES.has(maybeCompany.toLowerCase());

  if (!companyKnown) {
    return { title: cleanSegment(source), company: null, location: null };
  }

  const company = cleanSegment(maybeCompany.replace(/\s*\|\s*LinkedIn.*$/i, ""));
  let titlePart = parts.slice(0, -1).join(" - ");
  titlePart = titlePart.replace(/\s*-\s*\d+\s*$/, "").trim();

  let location: string | null = null;
  const parenMatch = titlePart.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (parenMatch) {
    titlePart = parenMatch[1]?.trim() ?? titlePart;
    location = cleanSegment(parenMatch[2] ?? null);
  }

  return {
    title: cleanSegment(titlePart),
    company,
    location,
  };
}
