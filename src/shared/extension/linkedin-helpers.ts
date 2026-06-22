function text(el: Element | null | undefined): string {
  return el?.textContent?.trim() ?? "";
}

const LINKEDIN_JD_SELECTORS = [
  ".show-more-less-html__markup",
  "[data-testid='expandable-text-box']",
  "[data-testid='job-description']",
  ".jobs-description-content__text--stretch",
  ".jobs-description-content__text",
  ".jobs-description__content",
  ".jobs-box__html-content",
  ".jobs-description",
  '[class*="jobs-description"]',
];

/** LinkedIn job description — prefers stable data-testid / show-more-less markup over legacy classes. */
export function scrapeLinkedInDescription(doc: Document, minLen = 80): string {
  for (const selector of LINKEDIN_JD_SELECTORS) {
    const value = text(doc.querySelector(selector));
    if (value.length >= minLen) return value;
  }
  return "";
}

/** LinkedIn-specific metadata fallbacks when DOM selectors miss. */
export function parseLinkedInCompanyFromDoc(doc: Document): string | null {
  const og = doc.querySelector('meta[property="og:title"]')?.getAttribute("content")?.trim();
  if (og) {
    const primary = og.split("|")[0]?.trim() ?? og;
    if (!/\|\s*LinkedIn/i.test(og) && primary.includes(" in ")) {
      return null;
    }

    const hiringMatch = primary.match(/^(.+?)\s+hiring\s+/i);
    if (hiringMatch?.[1]) return hiringMatch[1].trim();

    const atMatch = primary.match(/\bat\s+(.+)$/i);
    if (atMatch?.[1]) return atMatch[1].trim();
  }

  const pageTitle = doc.title?.trim();
  if (pageTitle) {
    const primary = pageTitle.split("|")[0]?.trim() ?? pageTitle;
    const atMatch = primary.match(/\bat\s+(.+?)(?:\s*-|\s*$)/i);
    if (atMatch?.[1]) return atMatch[1].replace(/\s*\|\s*LinkedIn.*$/i, "").trim();
  }

  return null;
}

export function parseLinkedInLocationFromDoc(doc: Document): string | null {
  for (const selector of [
    ".job-details-jobs-unified-top-card__bullet",
    ".jobs-unified-top-card__bullet",
    "[data-testid='inlineHeader-companyLocation']",
  ]) {
    const value = doc.querySelector(selector)?.textContent?.trim();
    if (value && value.length > 2 && !/^\d+\s+(minute|hour|day|week)/i.test(value)) {
      return value.split("·").pop()?.trim() ?? value;
    }
  }
  return null;
}
