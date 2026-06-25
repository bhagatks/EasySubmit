import { createHash } from "node:crypto";
export { canonicalizeJobUrl } from "@/src/shared/extension/job-url";

/** Stable hash for `job_tracker_entries.urlHash`. */
export function hashJobUrl(canonicalUrl: string): string {
  return createHash("sha256").update(canonicalUrl).digest("hex");
}
