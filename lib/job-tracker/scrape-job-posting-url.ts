import { detectJobPage } from "@/src/shared/extension/detect-job-page";
import { buildFallbackJobMetadata } from "@/src/shared/extension/force-metadata";
import { fetchGreenhouseJobFromPageUrl } from "@/src/shared/extension/greenhouse-board-fetch";
import { parseCompanyFromJobHost, parseJobTitleFromUrl } from "@/src/shared/extension/job-url-parse";
import { EXTENSION_RUNTIME_DEFAULTS } from "@/src/shared/extension/runtime-config-merge";
import { parseJobMetadataFromJsonLd } from "@/src/shared/extension/scrape-helpers";
import { APPLY_JD_MIN_CHARS } from "@/src/shared/extension/apply-gate";
import type { ExtensionPlatform, ScrapedJobMetadata } from "@/src/shared/extension/types";

export type ScrapeJobPostingUrlSuccess = {
  success: true;
  url: string;
  title: string;
  company: string;
  description: string;
  platform: ExtensionPlatform | "dashboard_manual";
  partial: boolean;
  hint: string | null;
};

export type ScrapeJobPostingUrlFailure = {
  success: false;
  error: string;
  code: "invalid_url" | "blocked_url" | "fetch_failed" | "parse_failed" | "insufficient_content";
};

export type ScrapeJobPostingUrlResult = ScrapeJobPostingUrlSuccess | ScrapeJobPostingUrlFailure;

const FETCH_TIMEOUT_MS = 12_000;
const MAX_HTML_BYTES = 2_000_000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; EasySubmitJobImport/1.0; +https://www.easysubmit.ai)";

const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  return false;
}

export function normalizeJobPostingUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

export function assertPublicJobPostingUrl(url: string): ScrapeJobPostingUrlFailure | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^\[/, "").replace(/\]$/, "").toLowerCase();
    if (BLOCKED_HOSTS.has(host) || host.endsWith(".local")) {
      return { success: false, error: "That URL cannot be imported.", code: "blocked_url" };
    }
    if (isPrivateIpv4(host)) {
      return { success: false, error: "That URL cannot be imported.", code: "blocked_url" };
    }
    return null;
  } catch {
    return { success: false, error: "Enter a valid job posting URL.", code: "invalid_url" };
  }
}

export function htmlToPlainJobText(html: string): string {
  const withoutTags = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"');
  return withoutTags.replace(/\s+/g, " ").trim();
}

function metadataToDraftFields(
  url: string,
  metadata: ScrapedJobMetadata,
): Pick<ScrapeJobPostingUrlSuccess, "title" | "company" | "description" | "platform"> {
  const descriptionRaw = metadata.description?.trim() ?? "";
  const description = htmlToPlainJobText(descriptionRaw);
  const title =
    metadata.title?.trim() ||
    parseJobTitleFromUrl(url)?.trim() ||
    "";
  const company = metadata.company?.trim() ?? "";

  return {
    title,
    company,
    description,
    platform: metadata.platform,
  };
}

function buildResult(
  url: string,
  fields: Pick<ScrapeJobPostingUrlSuccess, "title" | "company" | "description" | "platform">,
): ScrapeJobPostingUrlResult {
  const descriptionLength = fields.description.length;
  const titleOk = fields.title.length >= 2;
  const descriptionOk = descriptionLength >= APPLY_JD_MIN_CHARS;

  if (!titleOk && !descriptionOk) {
    return {
      success: false,
      error:
        "Could not read enough from that page. Paste the job description below, or try the extension on the live job page.",
      code: "insufficient_content",
    };
  }

  const partial = !titleOk || !descriptionOk;
  let hint: string | null = null;
  if (!descriptionOk) {
    hint = `Imported ${descriptionLength} characters — add more of the job description below (minimum ${APPLY_JD_MIN_CHARS}).`;
  } else if (!titleOk) {
    hint = "Add a role title below before saving.";
  } else if (partial) {
    hint = "Fields imported — nothing saved yet. Review below, then click Save to Job Tracker.";
  }

  return {
    success: true,
    url,
    title: fields.title,
    company: fields.company,
    description: fields.description,
    platform: fields.platform,
    partial,
    hint,
  };
}

async function fetchHtmlDocument(
  url: string,
  fetchImpl: typeof fetch,
): Promise<{ ok: true; html: string } | { ok: false; error: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": USER_AGENT,
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `Could not fetch that page (HTTP ${response.status}). Paste details manually or use the extension on the job site.`,
      };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return {
        ok: false,
        error: "That link did not return a web page. Paste the job details manually.",
      };
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_HTML_BYTES) {
      return { ok: false, error: "That page is too large to import. Paste the job description manually." };
    }

    return { ok: true, html: new TextDecoder("utf-8").decode(buffer) };
  } catch {
    return {
      ok: false,
      error:
        "Could not reach that URL from the server. Paste details manually or save the job from the Chrome extension.",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function scrapeFromHtml(
  url: string,
  html: string,
): Promise<ScrapeJobPostingUrlResult | null> {
  const { parseHTML } = await import("linkedom");
  const { document } = parseHTML(html);

  const jsonLd = parseJobMetadataFromJsonLd(document);

  const config = {
    ...EXTENSION_RUNTIME_DEFAULTS,
    jobCardEnabled: true,
    genericFallbackEnabled: true,
  };

  const detected = detectJobPage(document, url, config, { ignoreJobCardFlag: true });
  const metadata = detected?.metadata ?? buildFallbackJobMetadata(document, url, config);

  const merged: typeof metadata = {
    ...metadata,
    title:
      metadata.title && metadata.title !== "Job posting on this page"
        ? metadata.title
        : jsonLd?.title || metadata.title,
    company: metadata.company || jsonLd?.company || parseCompanyFromJobHost(url) || null,
    description: metadata.description || jsonLd?.description || null,
  };

  if (!merged.title && !merged.description) {
    return null;
  }

  return buildResult(url, metadataToDraftFields(url, merged));
}

export async function scrapeJobPostingFromUrl(
  rawUrl: string,
  options?: { fetchImpl?: typeof fetch },
): Promise<ScrapeJobPostingUrlResult> {
  const normalized = normalizeJobPostingUrl(rawUrl);
  if (!normalized) {
    return { success: false, error: "Enter a valid job posting URL.", code: "invalid_url" };
  }

  const blocked = assertPublicJobPostingUrl(normalized);
  if (blocked) return blocked;

  const fetchImpl = options?.fetchImpl ?? fetch;

  const greenhouse = await fetchGreenhouseJobFromPageUrl(normalized, { fetchImpl });
  if (greenhouse?.description && greenhouse.description.trim().length >= APPLY_JD_MIN_CHARS) {
    return buildResult(normalized, {
      title: greenhouse.title?.trim() ?? "",
      company: greenhouse.company?.trim() ?? "",
      description: htmlToPlainJobText(greenhouse.description),
      platform: "greenhouse",
    });
  }

  const htmlResult = await fetchHtmlDocument(normalized, fetchImpl);
  if (!htmlResult.ok) {
    if (greenhouse) {
      return buildResult(normalized, {
        title: greenhouse.title?.trim() ?? "",
        company: greenhouse.company?.trim() ?? "",
        description: htmlToPlainJobText(greenhouse.description ?? ""),
        platform: "greenhouse",
      });
    }
    return { success: false, error: htmlResult.error, code: "fetch_failed" };
  }

  const scraped = await scrapeFromHtml(normalized, htmlResult.html);
  if (scraped) {
    if (greenhouse?.description) {
      const ghDesc = htmlToPlainJobText(greenhouse.description);
      if (ghDesc.length > (scraped.success ? scraped.description.length : 0)) {
        return buildResult(normalized, {
          title: greenhouse.title?.trim() || (scraped.success ? scraped.title : ""),
          company: greenhouse.company?.trim() || (scraped.success ? scraped.company : ""),
          description: ghDesc,
          platform: "greenhouse",
        });
      }
    }
    return scraped;
  }

  if (greenhouse) {
    return buildResult(normalized, {
      title: greenhouse.title?.trim() ?? "",
      company: greenhouse.company?.trim() ?? "",
      description: htmlToPlainJobText(greenhouse.description ?? ""),
      platform: "greenhouse",
    });
  }

  return {
    success: false,
    error:
      "Could not extract job details from that page. Paste the role and description below, or use the extension on the live posting.",
    code: "parse_failed",
  };
}
