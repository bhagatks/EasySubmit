import {
  parseCareersOgTitleMeta,
  parseDocumentTitleCareersMeta,
} from "./careers-og-meta";
import {
  parseCompanyFromJobHost,
  parseLocationFromJobUrl,
} from "./job-url-parse";
import {
  parseLinkedInCompanyFromDoc,
  parseLinkedInLocationFromDoc,
} from "./linkedin-helpers";
import { isWorkdayJobUrl, scrapeWorkdayCompany } from "./workday-helpers";
import type { ScrapedJobMetadata } from "./types";

function readOgTitle(doc: Document): string | null {
  const og = doc.querySelector('meta[property="og:title"]')?.getAttribute("content")?.trim();
  return og && og.length > 2 ? og : null;
}

function isLinkedInUrl(url: string): boolean {
  return /linkedin\.com\/jobs\//i.test(url);
}

/** Fill missing company/location/title from careers metadata + known host labels. */
export function enrichScrapedJobMetadata(
  doc: Document,
  url: string,
  metadata: ScrapedJobMetadata,
): { metadata: ScrapedJobMetadata; enrichments: string[] } {
  const enrichments: string[] = [];
  const ogMeta = parseCareersOgTitleMeta(readOgTitle(doc));
  const docMeta = parseDocumentTitleCareersMeta(doc.title);
  const scrapedTitle = metadata.title?.trim() ?? "";

  let title = scrapedTitle || ogMeta.title || docMeta.title || metadata.title;
  if (
    ogMeta.title &&
    scrapedTitle &&
    /\s+in\s+.+/i.test(scrapedTitle) &&
    !/\s+in\s+.+/i.test(ogMeta.title)
  ) {
    title = ogMeta.title;
    enrichments.push("og:title.title");
  } else if (!scrapedTitle && docMeta.title) {
    title = docMeta.title;
    enrichments.push("document.title.title");
  }

  let company = metadata.company?.trim() || null;
  if (!company && ogMeta.company) {
    company = ogMeta.company;
    enrichments.push("og:title.company");
  }
  if (!company && docMeta.company) {
    company = docMeta.company;
    enrichments.push("document.title.company");
  }
  if (!company) {
    const fromDocPipe = parseCareersOgTitleMeta(doc.title);
    if (fromDocPipe.company) {
      company = fromDocPipe.company;
      enrichments.push("document.title.pipe");
    }
  }
  if (!company && isLinkedInUrl(url)) {
    const fromLinkedIn = parseLinkedInCompanyFromDoc(doc);
    if (fromLinkedIn) {
      company = fromLinkedIn;
      enrichments.push("linkedin.meta.company");
    }
  }
  if (!company && isWorkdayJobUrl(url)) {
    const fromWorkday = scrapeWorkdayCompany(doc, url);
    if (fromWorkday) {
      company = fromWorkday;
      enrichments.push("workday.company");
    }
  }
  if (!company) {
    const fromHost = parseCompanyFromJobHost(url);
    if (fromHost) {
      company = fromHost;
      enrichments.push("host.company");
    }
  }

  let location = metadata.location?.trim() || null;
  if (!location && ogMeta.location) {
    location = ogMeta.location;
    enrichments.push("og:title.location");
  }
  if (!location && docMeta.location) {
    location = docMeta.location;
    enrichments.push("document.title.location");
  }
  if (!location) {
    const fromUrl = parseLocationFromJobUrl(url);
    if (fromUrl) {
      location = fromUrl;
      enrichments.push("url.location");
    }
  }
  if (!location && isLinkedInUrl(url)) {
    const fromLinkedIn = parseLinkedInLocationFromDoc(doc);
    if (fromLinkedIn) {
      location = fromLinkedIn;
      enrichments.push("linkedin.meta.location");
    }
  }

  return {
    metadata: {
      ...metadata,
      title,
      company,
      location,
    },
    enrichments,
  };
}
