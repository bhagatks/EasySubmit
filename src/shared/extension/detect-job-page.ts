import { ALL_ADAPTERS } from "./site-adapters";
import type { ExtensionPlatform, ExtensionRuntimeConfig, ScrapedJobMetadata } from "./types";
import { buildFallbackJobMetadata } from "./force-metadata";
import { isJobPage } from "./is-job-page";
import { enrichScrapedJobMetadata } from "./scrape-enrichment";
import { classifyJobPage } from "./page-classifier";
import { WORKDAY_JOB_URL } from "./workday-helpers";

export function pickAdapter(platform: ExtensionPlatform) {
  return ALL_ADAPTERS.find((a) => a.platform === platform) ?? ALL_ADAPTERS.at(-1)!;
}

export function detectJobPage(
  doc: Document,
  url: string,
  config: ExtensionRuntimeConfig,
  options?: { ignoreJobCardFlag?: boolean },
): { metadata: ScrapedJobMetadata; mountSelector: string } | null {
  if (!options?.ignoreJobCardFlag && !config.jobCardEnabled) return null;

  const pageKind = classifyJobPage(url, doc).kind;
  if (pageKind === "careers_hub" || pageKind === "search_results") return null;

  const candidates = ALL_ADAPTERS.filter((adapter) => {
    if (adapter.platform === "generic") {
      return config.genericFallbackEnabled;
    }
    return config.enabledPlatforms.includes(adapter.platform);
  });

  let best: { adapter: (typeof ALL_ADAPTERS)[number]; confidence: number } | null = null;

  for (const adapter of candidates) {
    let confidence = adapter.detectConfidence(doc, url);
    if (WORKDAY_JOB_URL.test(url)) {
      if (adapter.platform === "generic") {
        confidence = Math.min(confidence, 42);
      }
      if (adapter.platform === "workday") {
        confidence = Math.max(confidence, 75);
      }
    }
    if (!best || confidence > best.confidence) {
      best = { adapter, confidence };
    }
  }

  if (!best || best.confidence < config.minConfidence) {
    if (isJobPage(doc, url)) {
      return {
        metadata: buildFallbackJobMetadata(doc, url, config),
        mountSelector: "body",
      };
    }
    return null;
  }

  const scraped = best.adapter.scrape(doc);
  if (!scraped?.title) {
    if (isJobPage(doc, url)) {
      return {
        metadata: buildFallbackJobMetadata(doc, url, config),
        mountSelector: "body",
      };
    }
    return null;
  }

  scraped.confidence = best.confidence;
  const { metadata, enrichments } = enrichScrapedJobMetadata(doc, url, scraped);
  if (enrichments.length > 0) {
    (metadata as ScrapedJobMetadata & { enrichmentsApplied?: string[] }).enrichmentsApplied =
      enrichments;
  }

  const mountSelector =
    best.adapter.mountSelectors.find((sel) => doc.querySelector(sel)) ??
    best.adapter.mountSelectors[0] ??
    "body";

  return { metadata, mountSelector };
}
