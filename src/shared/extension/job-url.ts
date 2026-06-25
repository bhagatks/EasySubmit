import { stripJobUrlTrackingParams } from "./job-url-tracking-params";

/** Normalize job URLs for tab matching, dedup, and extension ↔ server status lookup. */
export function canonicalizeJobUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return rawUrl.trim();
  }

  url.hash = "";
  stripJobUrlTrackingParams(url);

  const normalized = url.toString().replace(/\/$/, "");

  if (/myworkdayjobs\.com/i.test(url.hostname)) {
    return normalized.replace(/\/apply\/?$/i, "") || normalized;
  }

  return normalized || rawUrl.trim();
}

export function jobUrlsMatch(a: string, b: string): boolean {
  return canonicalizeJobUrl(a) === canonicalizeJobUrl(b);
}

export { JOB_URL_TRACKING_PARAMS, stripJobUrlTrackingParams } from "./job-url-tracking-params";
