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
