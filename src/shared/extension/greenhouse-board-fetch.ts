import { INTERCEPT_MESSAGE_TYPE } from "./api-intercept-constants";
import type { InterceptedJobData } from "./api-intercept";
import { parseGreenhouseJobPostId } from "./greenhouse-helpers";
import { parseCompanyFromJobHost } from "./job-url-parse";

export const GREENHOUSE_BOARDS_API_BASE = "https://boards-api.greenhouse.io/v1/boards";

/** Host → Greenhouse board slug when it differs from the apex domain label. */
const EMBEDDED_HOST_BOARD_SLUG: Record<string, string> = {
  "suvoda.com": "suvoda",
};

export type GreenhouseBoardApiJob = {
  title: string;
  description: string;
  location: string | null;
};

export function buildGreenhouseBoardJobApiUrl(boardSlug: string, jobPostId: string): string {
  const slug = boardSlug.trim().toLowerCase();
  const id = jobPostId.trim();
  return `${GREENHOUSE_BOARDS_API_BASE}/${encodeURIComponent(slug)}/jobs/${encodeURIComponent(id)}`;
}

/** Candidate Greenhouse board slugs for embedded `gh_jid` career-site URLs. */
export function deriveGreenhouseBoardSlugCandidates(pageUrl: string): string[] {
  const candidates: string[] = [];
  try {
    const parsed = new URL(pageUrl);
    const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();

    const mapped = EMBEDDED_HOST_BOARD_SLUG[host];
    if (mapped) candidates.push(mapped);

    const jobsSubdomain = host.match(/^jobs\.([^.]+)\./i);
    if (jobsSubdomain?.[1]) {
      candidates.push(jobsSubdomain[1].toLowerCase());
    }

    const labels = host.split(".").filter(Boolean);
    if (labels.length >= 2) {
      const apex = labels[labels.length - 2];
      if (apex && !["jobs", "careers", "apply", "www"].includes(apex)) {
        candidates.push(apex.toLowerCase());
      }
    }

    const company = parseCompanyFromJobHost(pageUrl);
    if (company) {
      const normalized = company.trim().toLowerCase();
      candidates.push(normalized.replace(/\s+/g, "-"));
      candidates.push(normalized.replace(/[^a-z0-9]+/g, ""));
    }
  } catch {
    return [];
  }

  return [...new Set(candidates.filter((slug) => slug.length >= 2))];
}

export function parseGreenhouseBoardApiJob(payload: unknown): GreenhouseBoardApiJob | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const content = typeof record.content === "string" ? record.content.trim() : "";
  if (!title || content.length < 40) return null;

  const locationRecord = record.location;
  const locationName =
    locationRecord &&
    typeof locationRecord === "object" &&
    typeof (locationRecord as { name?: unknown }).name === "string"
      ? ((locationRecord as { name: string }).name.trim() || null)
      : null;

  return {
    title,
    description: content,
    location: locationName,
  };
}

export async function fetchGreenhouseBoardJob(
  boardSlug: string,
  jobPostId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<GreenhouseBoardApiJob | null> {
  const apiUrl = buildGreenhouseBoardJobApiUrl(boardSlug, jobPostId);
  const response = await fetchImpl(apiUrl);
  if (!response.ok) return null;
  const payload: unknown = await response.json();
  return parseGreenhouseBoardApiJob(payload);
}

export async function fetchGreenhouseEmbeddedJobData(
  pageUrl: string,
  options?: { jobPostId?: string; fetchImpl?: typeof fetch },
): Promise<InterceptedJobData | null> {
  const jobPostId = options?.jobPostId?.trim() || parseGreenhouseJobPostId(pageUrl);
  if (!jobPostId) return null;

  const fetchImpl = options?.fetchImpl ?? fetch;
  const slugs = deriveGreenhouseBoardSlugCandidates(pageUrl);
  if (slugs.length === 0) return null;

  for (const slug of slugs) {
    const job = await fetchGreenhouseBoardJob(slug, jobPostId, fetchImpl);
    if (!job) continue;

    return {
      type: INTERCEPT_MESSAGE_TYPE,
      platform: "greenhouse",
      title: job.title,
      company: parseCompanyFromJobHost(pageUrl) ?? undefined,
      location: job.location ?? undefined,
      description: job.description,
    };
  }

  return null;
}
