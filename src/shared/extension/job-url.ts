/** Normalize job URLs for tab matching (extension + dashboard). */
export function canonicalizeJobUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return rawUrl.trim();
  }

  url.hash = "";

  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref"]) {
    url.searchParams.delete(key);
  }

  const normalized = url.toString().replace(/\/$/, "");

  if (/myworkdayjobs\.com/i.test(url.hostname)) {
    return normalized.replace(/\/apply\/?$/i, "") || normalized;
  }

  return normalized || rawUrl.trim();
}

export function jobUrlsMatch(a: string, b: string): boolean {
  return canonicalizeJobUrl(a) === canonicalizeJobUrl(b);
}
