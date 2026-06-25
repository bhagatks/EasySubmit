/** Query params stripped before job URL dedup / status lookup (save + extension sync). */
export const JOB_URL_TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "ref",
  "source",
  "gh_src",
  "src",
  "referrer",
  "trk",
  "tracking",
  "jobPipeline",
  "applyOrigin",
] as const;

export function stripJobUrlTrackingParams(url: URL): void {
  for (const key of JOB_URL_TRACKING_PARAMS) {
    url.searchParams.delete(key);
  }
}
