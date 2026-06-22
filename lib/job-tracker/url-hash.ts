import { createHash } from "node:crypto";

/** Normalize job URLs for deduplication (strip hash, trailing slash, common tracking params). */
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

export function hashJobUrl(canonicalUrl: string): string {
  return createHash("sha256").update(canonicalUrl).digest("hex");
}
