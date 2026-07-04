import {
  hasApplyAction,
  hasJobSectionKeywords,
  scrapeDescription,
  firstText,
} from "./scrape-helpers";
import { parseCompanyFromJobHost } from "./job-url-parse";

const REQUISITION_ID = /^R-[\d\w-]+$/i;
const LOCATION_COUNT_SUMMARY = /^\d+\s+locations?$/i;

function text(el: Element | null | undefined): string {
  return el?.textContent?.trim() ?? "";
}

const WORKDAY_HOST = /myworkday(?:jobs|site)\.com/i;

/** Workday posting URLs include locale/site segments before `/job/` or `/details/`. */
export const WORKDAY_JOB_URL =
  /myworkday(?:jobs|site)\.com\/(?:[^/]+\/)+(?:job|details)\//i;

export function isWorkdayJobUrl(url: string): boolean {
  return WORKDAY_JOB_URL.test(url);
}

export function isWorkdayApplyStepUrl(url: string): boolean {
  return /myworkday(?:jobs|site)\.com\/.*\/job\/(?:[^/]+\/)+apply\/?$/i.test(url);
}

const WORKDAY_LOCALE_SEGMENT = /^(en-us|en-gb|en-ca|fr-fr|de-de)$/i;

function formatWorkdaySiteSegment(site: string): string | null {
  const trimmed = site.trim();
  if (trimmed.length < 2) return null;
  if (/^R-[\w-]+$/i.test(trimmed) || trimmed.includes("_R-")) return null;

  if (/^[a-z][a-zA-Z0-9]*[A-Z]/.test(trimmed)) {
    return trimmed;
  }

  const spaced = trimmed
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
  if (spaced.length < 2) return null;
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Best-effort company/site label from the career site segment before `/job/` or `/details/`. */
export function parseWorkdayCompanyFromUrl(url: string): string | null {
  if (!WORKDAY_HOST.test(url)) return null;

  try {
    const pathname = new URL(url).pathname;

    if (/myworkdaysite\.com/i.test(url)) {
      const recruitingMatch = pathname.match(/\/recruiting\/(?:[^/]+\/)*([^/]+)\/job\//i);
      if (recruitingMatch?.[1]) {
        return formatWorkdaySiteSegment(recruitingMatch[1]);
      }
    }

    const siteMatch = pathname.match(/\/([^/]+)\/(?:job|details)\//i);
    if (!siteMatch?.[1]) return null;

    let site = siteMatch[1];
    if (WORKDAY_LOCALE_SEGMENT.test(site)) {
      const afterLocale = pathname.match(/^\/[^/]+\/([^/]+)\/(?:job|details)\//i);
      site = afterLocale?.[1] ?? site;
    }

    if (
      WORKDAY_LOCALE_SEGMENT.test(site) ||
      site === "job" ||
      site === "details"
    ) {
      return null;
    }

    return formatWorkdaySiteSegment(site);
  } catch {
    return null;
  }
}

/** Decode a title from the last `/job/.../` path segment when the SPA has not hydrated yet. */
export function parseWorkdayTitleFromUrl(url: string): string | null {
  if (!WORKDAY_HOST.test(url)) return null;

  try {
    const pathname = new URL(url).pathname;
    if (/\/apply\/?$/i.test(pathname)) return null;

    const match =
      pathname.match(/\/job\/[^/]+\/([^/?#]+)/i) ??
      pathname.match(/\/details\/([^/?#]+)/i);
    if (!match?.[1] || match[1].toLowerCase() === "apply") return null;

    const slug = match[1].replace(/_R-[\w-]+$/i, "");
    const title = decodeURIComponent(slug.replace(/--/g, ", ").replace(/-/g, " ")).trim();
    return title.length > 2 ? title : null;
  } catch {
    return null;
  }
}

export function hasWorkdayApplyAction(doc: Document): boolean {
  return Boolean(findWorkdayApplyButton(doc)) || hasApplyAction(doc);
}

export function findWorkdayApplyButton(doc: Document): HTMLElement | null {
  const selector =
    '[data-automation-id="applyButton"], [data-automation-id="adventureButton"]';
  const direct = doc.querySelector<HTMLElement>(selector);
  if (direct) return direct;

  const candidates = Array.from(doc.querySelectorAll<HTMLElement>("button, a[role='button'], a"));
  return (
    candidates.find((el) => /apply/i.test(el.textContent?.trim() ?? "")) ?? null
  );
}

export function humanizeWorkdaySiteName(siteName: string): string {
  const normalized = siteName.trim();
  if (/^walmart/i.test(normalized)) return "Walmart";
  if (/cvs/i.test(normalized)) return "CVS Health";
  if (/^irhythm/i.test(normalized)) return "iRhythm";
  if (/fidelity/i.test(normalized)) return "Fidelity";
  return normalized.replace(/\s+External$/i, "").trim() || normalized;
}

function cleanCompanyLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || REQUISITION_ID.test(trimmed)) return null;
  return trimmed;
}

function cleanLocationLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed || trimmed.length < 3) return null;
  if (REQUISITION_ID.test(trimmed)) return null;
  if (LOCATION_COUNT_SUMMARY.test(trimmed)) return null;
  if (/^locations\d+/i.test(trimmed)) return null;
  if (/^locations$/i.test(trimmed)) return null;
  return trimmed;
}

function looksLikeLocation(value: string): boolean {
  return (
    /,\s*[A-Z]{2}\b/.test(value) ||
    /\d{5}/.test(value) ||
    /united states/i.test(value) ||
    /\bremote\b/i.test(value)
  );
}

/** Pull "Primary Location…" line from Workday JD text when the header is collapsed. */
export function parsePrimaryLocationFromDescription(description: string): string | null {
  const match = description.match(/Primary Location[.\s…]*([^\n]+)/i);
  if (!match?.[1]) return null;
  const cleaned = match[1].replace(/…+/g, "").replace(/\s+/g, " ").trim();
  return cleaned.length > 3 ? cleaned : null;
}

export function scrapeWorkdayCompany(doc: Document, url: string): string | null {
  const fromCompany = cleanCompanyLabel(text(doc.querySelector("[data-automation-id='company']")));
  if (fromCompany) return humanizeWorkdaySiteName(fromCompany);

  if (!isWorkdayJobUrl(url)) {
    return parseCompanyFromJobHost(url);
  }

  const fromUrl = parseWorkdayCompanyFromUrl(url);
  if (fromUrl) return humanizeWorkdaySiteName(fromUrl);

  return parseCompanyFromJobHost(url);
}

export function scrapeWorkdayLocations(doc: Document, description?: string | null): string | null {
  const locationNodes = Array.from(
    doc.querySelectorAll(
      "[data-automation-id='location'], [data-automation-id='locationItem'], li[data-automation-id='location']",
    ),
  );

  const locations = [
    ...new Set(
      locationNodes
        .map((el) => cleanLocationLabel(text(el)))
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  if (locations.length > 0) {
    return locations.join(", ");
  }

  const subtitle = cleanLocationLabel(text(doc.querySelector("[data-automation-id='subtitle']")));
  if (subtitle && looksLikeLocation(subtitle)) {
    return subtitle;
  }

  if (description?.trim()) {
    const fromDescription = parsePrimaryLocationFromDescription(description);
    if (fromDescription) return fromDescription;
  }

  return null;
}

export function scrapeWorkdaySalary(doc: Document, description?: string | null): string | null {
  const fromComp = text(doc.querySelector("[data-automation-id='compensationText']"));
  if (fromComp && /\$/.test(fromComp)) return fromComp;

  if (description?.trim()) {
    const rangeMatch = description.match(
      /annual salary range[^$]*(\$[\d,.]+(?:\s*[-–]\s*\$[\d,.]+)?)/i,
    );
    if (rangeMatch?.[1]) return rangeMatch[1].replace(/\s+/g, " ");
  }

  return null;
}

export function scrapeWorkdayTitle(doc: Document, url: string): string {
  const fromDom = firstText(doc, [
    "[data-automation-id='jobPostingHeader']",
    "h1",
    "h2",
  ]);
  if (fromDom) return fromDom;
  return parseWorkdayTitleFromUrl(url) ?? "";
}

export function detectWorkdayConfidence(doc: Document, url: string): number {
  if (!isWorkdayJobUrl(url)) {
    return /myworkday(?:jobs|site)\.com\/.*\/(?:job|details)\//i.test(url) ? 40 : 0;
  }

  let score = 78;
  if (scrapeDescription(doc).length >= 80) score = Math.max(score, 88);
  if (hasWorkdayApplyAction(doc)) score = Math.max(score, 85);
  if (hasJobSectionKeywords(doc)) score = Math.min(100, score + 5);
  if (scrapeWorkdayTitle(doc, url)) score = Math.max(score, 80);
  return score;
}
