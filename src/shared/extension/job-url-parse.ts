import { parseWorkdayTitleFromUrl, isWorkdayJobUrl, isWorkdayApplyStepUrl } from "./workday-helpers";

export function slugToTitle(slug: string): string {
  const decoded = decodeURIComponent(slug).trim();
  if (!decoded || decoded.length < 3) return "";

  return decoded
    .replace(/_R-[\w-]+$/i, "")
    .replace(/--/g, ", ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export type IcimsUrlParse = {
  title: string;
  location: string | null;
};

/** iCIMS `/job/{City-Title-ST-Zip}/{numericId}/` slug parsing (Optimum, etc.). */
export function parseIcimsJobFromUrl(url: string): IcimsUrlParse | null {
  try {
    const match = new URL(url).pathname.match(/\/job\/([^/]+)\/(\d+)\/?/i);
    if (!match?.[1] || !/^\d+$/.test(match[2])) return null;

    const slug = decodeURIComponent(match[1]);
    const withGeo = slug.match(/^([A-Za-z]+)-(.+)-([A-Z]{2})-(\d{5})$/);
    if (withGeo) {
      const [, city, titleSlug, state, zip] = withGeo;
      return {
        title: slugToTitle(titleSlug),
        location: `${slugToTitle(city)}, ${state} ${zip}`,
      };
    }

    const title = slugToTitle(slug);
    return title.length > 2 ? { title, location: null } : null;
  } catch {
    return null;
  }
}

export function parseLocationFromJobUrl(url: string): string | null {
  return parseIcimsJobFromUrl(url)?.location ?? null;
}

/** Best-effort job title decoded from posting URL slugs (pre-SPA hydration). */
export function parseJobTitleFromUrl(url: string): string | null {
  const workdayTitle = parseWorkdayTitleFromUrl(url);
  if (workdayTitle) return workdayTitle;

  const icims = parseIcimsJobFromUrl(url);
  if (icims?.title) return icims.title;

  try {
    const { pathname } = new URL(url);

    // Two-segment /job/{a}/{b}/ — disambiguate iCIMS vs Phenom by segment shape.
    const twoPart = pathname.match(/\/job\/([^/]+)\/([^/]+)\/?$/i);
    if (twoPart?.[1] && twoPart[2]) {
      const [first, second] = [twoPart[1], twoPart[2]];
      if (/^\d+$/.test(second)) {
        const icimsParsed = parseIcimsJobFromUrl(url);
        if (icimsParsed?.title) return icimsParsed.title;
        const title = slugToTitle(first);
        if (title.length > 2) return title;
      }
      if (/^R-?\d+[\w-]*$/i.test(first) && !/^\d+$/.test(second)) {
        const title = slugToTitle(second);
        if (title.length > 2) return title;
      }
    }

    // /job/slug-only
    const jobSlug = pathname.match(/\/job\/([^/]+)\/?$/i);
    if (jobSlug?.[1] && !/^\d+$/.test(jobSlug[1])) {
      const title = slugToTitle(jobSlug[1]);
      if (title.length > 2) return title;
    }
  } catch {
    return null;
  }

  return null;
}

const KNOWN_CAREER_HOSTS: Record<string, string> = {
  "jobs.slalom.com": "Slalom",
  "jobs.cvshealth.com": "CVS Health",
  "optimumcareers.com": "Optimum",
  "www.optimumcareers.com": "Optimum",
};

/** Company label from careers host when DOM company is missing. */
export function parseCompanyFromJobHost(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, "");
    if (KNOWN_CAREER_HOSTS[host]) return KNOWN_CAREER_HOSTS[host];

    const jobsSubdomain = host.match(/^jobs\.([^.]+)\./i);
    if (jobsSubdomain?.[1] && jobsSubdomain[1] !== "wd1") {
      return slugToTitle(jobsSubdomain[1]);
    }
  } catch {
    return null;
  }

  return null;
}

/** High-trust job posting URL — enough to show the card before SPA hydration. */
export function hasStrongJobUrlSignal(url: string): boolean {
  const lower = url.toLowerCase();

  if (isWorkdayJobUrl(url) && parseWorkdayTitleFromUrl(url)) return true;
  if (isWorkdayApplyStepUrl(url)) return true;
  if (/linkedin\.com\/jobs\/(view|collections)/i.test(lower)) return true;
  if (/\/jobdetail\b/i.test(lower) && /[?&]jobid=/i.test(lower)) return true;
  if (/\/job\/[^/]+\/\d+\/?(?:\?|$)/i.test(lower)) return true;
  if (/jobs\.[a-z0-9.-]+\/[a-z]{2}(?:_[a-z]{2})?\/[a-z]{2}\/job\//i.test(lower)) return true;

  return parseJobTitleFromUrl(url) != null;
}
