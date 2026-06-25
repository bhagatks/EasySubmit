import { isWorkdayApplyStepUrl, isWorkdayJobUrl } from "./workday-helpers";

const URL_PATTERNS: Record<string, RegExp> = {
  workday: /\/(applied|thank-you|complete|confirmation|thank|success)(\/|$|\?)/i,
  greenhouse: /\/confirmation(\/|$|\?)/i,
  lever: /\/(thanks|confirmation)(\/|$|\?)/i,
  linkedin: /linkedin\.com\/jobs\/.*\/(post-apply|success|applied)(\/|$|\?)/i,
  indeed: /indeed\.com\/.*(applyconfirm|confirmation)/i,
};

const BODY_PHRASES = [
  /application submitted/i,
  /thank you for applying/i,
  /we received your application/i,
  /successfully applied/i,
];

function matchesTerminalUrl(platform: string, url: string): boolean {
  const pattern = URL_PATTERNS[platform.toLowerCase()];
  if (pattern?.test(url)) return true;

  return Object.values(URL_PATTERNS).some((candidate) => candidate.test(url));
}

function matchesConfirmationText(doc: Document): boolean {
  const body = (doc.body?.innerText ?? "").slice(0, 8000);
  return BODY_PHRASES.some((phrase) => phrase.test(body));
}

function isElementVisible(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.hidden) return false;
  const style = el.ownerDocument.defaultView?.getComputedStyle(el);
  if (style?.display === "none" || style?.visibility === "hidden") return false;
  return el.getClientRects().length > 0;
}

/** True when no submit-type controls are visible in the main content area. */
function hasNoVisibleSubmitForm(doc: Document): boolean {
  const root = doc.querySelector("main") ?? doc.body;
  if (!root) return true;

  const submitControls = root.querySelectorAll(
    'form input[type="submit"], form button[type="submit"], form button:not([type])',
  );

  for (const control of submitControls) {
    if (isElementVisible(control)) return false;
  }

  return true;
}

function isWorkdayJobPostingUrl(url: string): boolean {
  return isWorkdayJobUrl(url) && !isWorkdayApplyStepUrl(url) && !matchesTerminalUrl("workday", url);
}

/** Score 3 confirmation signals; true when 2+ match. Test helper accepts explicit context. */
export function evaluateApplicationConfirmation(
  platform: string,
  url: string,
  doc: Document,
): boolean {
  const plat = platform.toLowerCase();

  if (plat === "workday" || isWorkdayJobUrl(url)) {
    if (isWorkdayJobPostingUrl(url)) return false;
    if (matchesTerminalUrl("workday", url)) {
      return matchesConfirmationText(doc) || hasNoVisibleSubmitForm(doc);
    }
    if (isWorkdayApplyStepUrl(url)) {
      let score = 0;
      if (matchesConfirmationText(doc)) score += 1;
      if (hasNoVisibleSubmitForm(doc)) score += 1;
      if (matchesTerminalUrl("workday", url)) score += 1;
      return score >= 2;
    }
    return false;
  }

  let score = 0;
  if (matchesTerminalUrl(plat, url)) score += 1;
  if (matchesConfirmationText(doc)) score += 1;
  if (hasNoVisibleSubmitForm(doc)) score += 1;
  return score >= 2;
}

/**
 * Detect ATS thank-you / confirmation pages for auto MARK_APPLIED.
 * Only meaningful during Stage 2 (`READY_TO_APPLY`).
 */
export function detectApplicationConfirmation(platform: string): boolean {
  if (typeof document === "undefined" || typeof location === "undefined") {
    return false;
  }

  return evaluateApplicationConfirmation(platform, location.href, document);
}

export type ConfirmationDetectResult = {
  isConfirmation: boolean;
  platform: string;
  matchedSignals: number;
};

/** @deprecated Use `detectApplicationConfirmation(platform)` — kept for transitional callers. */
export function detectApplicationConfirmationLegacy(
  url: string,
  doc: Document,
  platform = "generic",
): ConfirmationDetectResult {
  const isConfirmation = evaluateApplicationConfirmation(platform, url, doc);
  let matchedSignals = 0;
  if (matchesTerminalUrl(platform, url)) matchedSignals += 1;
  if (matchesConfirmationText(doc)) matchedSignals += 1;
  if (hasNoVisibleSubmitForm(doc)) matchedSignals += 1;

  return {
    isConfirmation,
    platform,
    matchedSignals,
  };
}
