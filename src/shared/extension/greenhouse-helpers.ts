/** Hosted Greenhouse board job posting (`boards` or `job-boards` subdomain). */
export const GREENHOUSE_BOARD_JOB_URL =
  /(?:boards|job-boards)\.greenhouse\.io\/[^/]+\/jobs\/\d+/i;

function boardSlugToLabel(slug: string): string {
  const decoded = decodeURIComponent(slug).trim();
  if (!decoded) return "";
  return decoded
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Greenhouse job post id from embedded career-site URLs (`?gh_jid=8521135002`). */
export function parseGreenhouseJobPostId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const fromQuery = parsed.searchParams.get("gh_jid")?.trim();
    if (fromQuery && /^\d+$/.test(fromQuery)) return fromQuery;

    const hashMatch = parsed.hash.match(/(?:[?&]|^)gh_jid=(\d+)/i);
    if (hashMatch?.[1]) return hashMatch[1];
  } catch {
    return null;
  }
  return null;
}

export function isGreenhouseEmbeddedJobUrl(url: string): boolean {
  return parseGreenhouseJobPostId(url) != null;
}

export function isGreenhouseBoardJobUrl(url: string): boolean {
  return GREENHOUSE_BOARD_JOB_URL.test(url);
}

export function parseGreenhouseBoardJobFromUrl(url: string): {
  company: string;
  jobId: string;
} | null {
  if (!isGreenhouseBoardJobUrl(url)) return null;

  try {
    const match = new URL(url).pathname.match(/^\/([^/]+)\/jobs\/(\d+)\/?$/i);
    if (!match?.[1] || !match?.[2]) return null;
    const company = boardSlugToLabel(match[1]);
    if (!company) return null;
    return { company, jobId: match[2] };
  } catch {
    return null;
  }
}

export function parseGreenhouseCompanyFromBoardUrl(url: string): string | null {
  return parseGreenhouseBoardJobFromUrl(url)?.company ?? null;
}
