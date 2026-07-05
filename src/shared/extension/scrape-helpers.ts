import { scrapeLinkedInDescription } from "./linkedin-helpers";

const GENERIC_NAVIGATION_JOB_TITLES = new Set([
  "job",
  "jobs",
  "job search",
  "search jobs",
  "find jobs",
  "open jobs",
  "job openings",
  "careers",
  "career",
  "careers home",
  "job listings",
  "browse jobs",
  "explore jobs",
  "work with us",
  "join us",
  "hiring",
  "vacancies",
  "opportunities",
]);

/** Hub / nav labels that are not a specific role title (e.g. LinkedIn jobs browse h1). */
export function isGenericNavigationJobTitle(title: string | null | undefined): boolean {
  const normalized = title?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
  if (!normalized || normalized.length > 48) return false;
  if (GENERIC_NAVIGATION_JOB_TITLES.has(normalized)) return true;
  if (/^jobs?\s+(at|with|@)\s+/i.test(normalized)) return true;
  if (/^(search|find|browse|explore)\s+jobs?$/i.test(normalized)) return true;
  return false;
}

function text(el: Element | null | undefined): string {
  return el?.textContent?.trim() ?? "";
}

function firstText(doc: Document, selectors: string[]): string {
  for (const sel of selectors) {
    const value = text(doc.querySelector(sel));
    if (value) return value;
  }
  return "";
}

function firstLongText(doc: Document, selectors: string[], minLen = 80): string {
  for (const sel of selectors) {
    const el = doc.querySelector(sel);
    const value = text(el);
    if (value.length >= minLen) return value;
  }
  return "";
}

function stripHtml(html: string): string {
  try {
    if (typeof DOMParser !== "undefined") {
      const parsed = new DOMParser().parseFromString(html, "text/html");
      const value = parsed.body?.textContent?.trim();
      if (value) return value.replace(/\s+/g, " ");
    }
  } catch {
    // fall through to regex cleanup
  }
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function collectJobPostingNodes(data: unknown): Array<Record<string, unknown>> {
  if (!data || typeof data !== "object") return [];
  if (Array.isArray(data)) return data.flatMap(collectJobPostingNodes);

  const obj = data as Record<string, unknown>;
  const results: Array<Record<string, unknown>> = [];
  const type = obj["@type"];
  const types = Array.isArray(type) ? type : type ? [type] : [];
  if (types.some((entry) => entry === "JobPosting")) {
    results.push(obj);
  }
  if (Array.isArray(obj["@graph"])) {
    results.push(...obj["@graph"].flatMap(collectJobPostingNodes));
  }
  return results;
}

/** Extract structured JobPosting fields from JSON-LD (qualifications, responsibilities, incentives). */
export function parseJsonLdJobFields(doc: Document): {
  qualifications?: string;
  responsibilities?: string;
  incentives?: string;
} | undefined {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    const raw = script.textContent?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as unknown;
      for (const node of collectJobPostingNodes(parsed)) {
        const qual =
          typeof node["qualifications"] === "string"
            ? stripHtml(node["qualifications"]).trim()
            : undefined;
        const resp =
          typeof node["responsibilities"] === "string"
            ? stripHtml(node["responsibilities"]).trim()
            : undefined;
        const inc =
          typeof node["incentives"] === "string"
            ? stripHtml(node["incentives"]).trim()
            : undefined;

        if (qual || resp) {
          return {
            ...(qual ? { qualifications: qual } : {}),
            ...(resp ? { responsibilities: resp } : {}),
            ...(inc ? { incentives: inc } : {}),
          };
        }
      }
    } catch {
      // ignore malformed JSON-LD blocks
    }
  }
  return undefined;
}

/** Parse JobPosting.description from JSON-LD when DOM selectors miss (common on LinkedIn). */
export function parseJobDescriptionFromJsonLd(doc: Document, minLen = 80): string {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    const raw = script.textContent?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as unknown;
      for (const node of collectJobPostingNodes(parsed)) {
        const description = node.description;
        if (typeof description !== "string") continue;
        const value = stripHtml(description);
        if (value.length >= minLen) return value;
      }
    } catch {
      // ignore malformed JSON-LD blocks
    }
  }
  return "";
}

const JD_SELECTORS = [
  ".show-more-less-html__markup",
  "[data-testid='expandable-text-box']",
  ".jobs-description__content",
  ".jobs-description-content__text",
  ".jobs-description-content__text--stretch",
  ".jobs-box__html-content",
  "#jobDescriptionText",
  ".jobsearch-JobComponent-description",
  "[data-automation-id='jobDescriptionText']",
  "[data-automation-id='jobPostingDescription']",
  "[data-ph-at-id='job-description-text']",
  "#jobdescription",
  ".jobdescription",
  ".posting-page",
  ".content .posting-headline",
  ".job-post",
  ".job-description",
  ".section.page-centered",
  '[class*="JobPosting"]',
  '[class*="jobPosting"]',
  '[class*="job-description"]',
  ".content .section-wrapper",
  ".iCIMS_InfoMsg",
  "[data-testid='job-description']",
];

/** Footer / chrome blocks that pollute Workday and careers-site body scrapes. */
const JD_FOOTER_SECTION_PATTERNS = [
  /\s+privacy(?:\s+notice|\s+policy)?\b[\s\S]*$/i,
  /\s+equal\s+(?:employment|opportunity)\b[\s\S]*$/i,
  /\s+cookie(?:\s+policy|\s+preferences)?\b[\s\S]*$/i,
  /\s+terms\s+(?:of\s+use|and\s+conditions)\b[\s\S]*$/i,
  /\s+accessibility\b[\s\S]*$/i,
  /\s+©\s*\d{4}\b[\s\S]*$/i,
];

const JD_BODY_FALLBACK_MAX_CHARS = 12_000;

const GENERIC_LOCATION_LABELS = new Set([
  "students",
  "interns",
  "internships",
  "early career",
  "campus",
  "job search",
  "careers",
]);

/** Strip page chrome from scraped JD text (Workday body fallback, noisy selectors). */
export function stripJobDescriptionFooterNoise(text: string): string {
  let out = text.replace(/\r/g, "").replace(/\s+/g, " ").trim();
  if (!out) return out;

  for (const pattern of JD_FOOTER_SECTION_PATTERNS) {
    out = out.replace(pattern, "").trim();
  }

  if (out.length > JD_BODY_FALLBACK_MAX_CHARS) {
    out = out.slice(0, JD_BODY_FALLBACK_MAX_CHARS).trim();
  }

  return out;
}

function isWorkdayJobUrl(url: string): boolean {
  return /myworkdayjobs\.com|myworkdaysite\.com/i.test(url);
}

function sanitizeScrapedDescription(text: string): string {
  const cleaned = stripJobDescriptionFooterNoise(text);
  return cleaned.length >= 80 ? cleaned : text.trim();
}

function isGenericLocationLabel(value: string): boolean {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized || normalized.length > 80) return false;
  if (GENERIC_LOCATION_LABELS.has(normalized)) return true;
  return /^(students?|interns?|campus|early\s+career)$/i.test(normalized);
}

export function scrapeDescription(doc: Document): string {
  const url = doc.defaultView?.location?.href ?? "";
  if (/linkedin\.com\/jobs\//i.test(url)) {
    const linkedIn = scrapeLinkedInDescription(doc);
    if (linkedIn.length >= 80) return sanitizeScrapedDescription(linkedIn);
  }

  if (isWorkdayJobUrl(url)) {
    const fromJsonLd = parseJobDescriptionFromJsonLd(doc);
    if (fromJsonLd.length >= 80) return sanitizeScrapedDescription(fromJsonLd);
  }

  const fromSelectors = firstLongText(doc, JD_SELECTORS, 80);
  if (fromSelectors.length >= 80) return sanitizeScrapedDescription(fromSelectors);

  const fromJsonLd = parseJobDescriptionFromJsonLd(doc);
  if (fromJsonLd.length >= 80) return sanitizeScrapedDescription(fromJsonLd);

  const body = doc.body?.innerText?.trim() ?? "";
  if (body.length >= 120 && hasJobSectionKeywords(doc)) {
    return sanitizeScrapedDescription(body);
  }

  return sanitizeScrapedDescription(fromSelectors);
}

export function scrapeTitle(doc: Document, fallbacks: string[]): string {
  const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute("content")?.trim();
  if (ogTitle && ogTitle.length > 2) {
    const cleaned = ogTitle.split("|")[0]?.trim();
    if (cleaned && cleaned.length > 2 && !isGenericNavigationJobTitle(cleaned)) return cleaned;
  }

  const h1 = text(doc.querySelector("h1"));
  if (h1.length > 2 && !isGenericNavigationJobTitle(h1)) return h1;

  for (const sel of fallbacks) {
    const value = text(doc.querySelector(sel));
    if (value.length > 2 && !isGenericNavigationJobTitle(value)) return value;
  }

  return "";
}

export function scrapeCompany(doc: Document, selectors: string[]): string | null {
  const value = firstText(doc, selectors);
  return value || null;
}

export function parseLocationFromBodyText(body: string): string | null {
  const normalized = body.replace(/\r/g, "");
  const labelMatch = normalized.match(/(?:^|\n)\s*Location[s]?\s*:?\s*\n+\s*([^\n]+)/i);
  if (labelMatch?.[1]) {
    const value = labelMatch[1].replace(/^[-•]\s*/, "").trim();
    if (value.length > 2) return value;
  }

  const bulletMatch = normalized.match(/(?:^|\n)\s*Locations?\s*\n+\s*[-•]\s*([^\n]+)/i);
  if (bulletMatch?.[1]) {
    const value = bulletMatch[1].trim();
    if (value.length > 2) return value;
  }

  return null;
}

export function scrapeLocation(doc: Document, selectors: string[]): string | null {
  for (const sel of selectors) {
    const value = text(doc.querySelector(sel));
    if (value && !isGenericLocationLabel(value)) return value;
  }
  const body = doc.body?.innerText ?? "";
  const parsed = parseLocationFromBodyText(body);
  if (parsed && !isGenericLocationLabel(parsed)) return parsed;
  return null;
}

export function scrapeSalary(doc: Document, selectors: string[]): string | null {
  for (const sel of selectors) {
    const value = text(doc.querySelector(sel));
    if (/\$|USD|salary|year|hour/i.test(value)) return value;
  }
  const body = doc.body?.innerText ?? "";
  const match = body.match(/\$[\d,]+(?:\s*[-–]\s*\$[\d,]+)?(?:\s*USD)?(?:\s*\/?\s*(?:year|hr|hour))?/i);
  return match?.[0] ?? null;
}

export function hasApplyAction(doc: Document): boolean {
  const buttons = Array.from(doc.querySelectorAll("button, a, [role='button']"));
  const applyPattern =
    /^(apply|apply now|easy apply|quick apply|submit application|apply for this job)$/i;
  return buttons.some((btn) => {
    const label = text(btn);
    const aria = btn.getAttribute("aria-label")?.trim() ?? "";
    return applyPattern.test(label) || /apply/i.test(aria);
  });
}

export function hasJobSectionKeywords(doc: Document): boolean {
  const lower = doc.body?.innerText?.toLowerCase() ?? "";
  const keywords = [
    "job description",
    "responsibilities",
    "qualifications",
    "requirements",
    "what you will do",
    "about the role",
  ];
  return keywords.filter((kw) => lower.includes(kw)).length >= 2;
}

export { firstText, firstLongText };
