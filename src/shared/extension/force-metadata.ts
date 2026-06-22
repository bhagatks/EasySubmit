import { scrapeDescription } from "./scrape-helpers";
import { ALL_ADAPTERS } from "./site-adapters";
import type { ExtensionRuntimeConfig, ScrapedJobMetadata } from "./types";
import { parseCompanyFromJobHost, parseJobTitleFromUrl } from "./job-url-parse";
import { parseWorkdayTitleFromUrl } from "./workday-helpers";
import { enrichScrapedJobMetadata } from "./scrape-enrichment";

function readMetaTitle(doc: Document): string {
  const og = doc.querySelector('meta[property="og:title"]')?.getAttribute("content")?.trim();
  if (og && og.length > 2) return og.split("|")[0]?.trim() ?? og;

  const docTitle = doc.title?.split("|")[0]?.trim();
  if (docTitle && docTitle.length > 2) return docTitle;

  return "";
}

function readHeadingTitle(doc: Document): string {
  for (const selector of [
    "[data-automation-id='jobPostingHeader']",
    "h1",
    "h2",
    "[class*='job-title']",
    "[class*='posting-title']",
  ]) {
    const value = doc.querySelector(selector)?.textContent?.trim();
    if (value && value.length > 2) return value;
  }
  return "";
}

/** Best-effort metadata when auto-detection fails or the user forces the card. */
export function buildFallbackJobMetadata(
  doc: Document,
  url: string,
  _config: ExtensionRuntimeConfig,
): ScrapedJobMetadata {
  for (const adapter of ALL_ADAPTERS) {
    if (adapter.platform !== "generic") {
      const matchesUrl = adapter.urlPatterns.some((pattern) => pattern.test(url));
      if (!matchesUrl) continue;
    }

    const scraped = adapter.scrape(doc);
    if (scraped?.title) {
      const { metadata } = enrichScrapedJobMetadata(doc, url, scraped);
      return metadata;
    }
  }

  const title =
    readHeadingTitle(doc) ||
    readMetaTitle(doc) ||
    parseJobTitleFromUrl(url) ||
    parseWorkdayTitleFromUrl(url) ||
    "Job posting on this page";

  const { metadata } = enrichScrapedJobMetadata(doc, url, {
    title,
    company: parseCompanyFromJobHost(url),
    location: null,
    salaryText: null,
    description: scrapeDescription(doc) || null,
    platform: "generic",
    confidence: 25,
  });

  return metadata;
}
