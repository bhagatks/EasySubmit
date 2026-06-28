import { parseCompanyFromJobHost, parseJobTitleFromUrl } from "./job-url-parse";
import { isGenericNavigationJobTitle } from "./scrape-helpers";
import { isWorkdayJobUrl, parseWorkdayCompanyFromUrl } from "./workday-helpers";

export type ResolvedJobIdentity = {
  title: string;
  company: string | null;
  titleSource: string;
  companySource: string | null;
};

function hostLabelFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "this site";
  }
}

function resolveCompanyFallback(
  url: string,
  scrapedCompany?: string | null,
): { company: string | null; source: string | null } {
  const trimmed = scrapedCompany?.trim();
  if (trimmed) {
    return { company: trimmed, source: "scrape" };
  }

  if (isWorkdayJobUrl(url)) {
    const fromWorkday = parseWorkdayCompanyFromUrl(url);
    if (fromWorkday) {
      return { company: fromWorkday, source: "workday_url" };
    }
  }

  const fromHost = parseCompanyFromJobHost(url);
  if (fromHost) {
    return { company: fromHost, source: "host" };
  }

  return { company: null, source: null };
}

function titleFromDescriptionFirstLine(description: string | null | undefined): string | null {
  const line = description?.trim().split(/\n/).find((row) => row.trim().length > 2)?.trim();
  if (!line || line.length > 120) return null;
  if (/^[-•*]\s/.test(line)) return null;
  const colonSplit = line.match(/^([^:]{3,80}):\s*.+$/);
  if (colonSplit?.[1]) return colonSplit[1].trim();
  return line;
}

/** Display identity for tracker rows — URL remains dedup key. */
export function resolveJobIdentity(input: {
  url: string;
  title?: string | null;
  company?: string | null;
  description?: string | null;
}): ResolvedJobIdentity {
  const scrapedTitle = input.title?.trim() ?? "";
  if (
    scrapedTitle.length >= 2 &&
    scrapedTitle !== "Job posting on this page" &&
    !isGenericNavigationJobTitle(scrapedTitle)
  ) {
    const { company, source: companySource } = resolveCompanyFallback(
      input.url,
      input.company,
    );
    return {
      title: scrapedTitle,
      company,
      titleSource: "scrape",
      companySource,
    };
  }

  const fromUrl = parseJobTitleFromUrl(input.url);
  if (fromUrl) {
    const { company, source: companySource } = resolveCompanyFallback(
      input.url,
      input.company,
    );
    return {
      title: fromUrl,
      company,
      titleSource: "url_slug",
      companySource,
    };
  }

  const fromDescription = titleFromDescriptionFirstLine(input.description);
  if (fromDescription) {
    const { company, source: companySource } = resolveCompanyFallback(
      input.url,
      input.company,
    );
    return {
      title: fromDescription,
      company,
      titleSource: "description",
      companySource,
    };
  }

  const host = hostLabelFromUrl(input.url);
  const { company, source: companySource } = resolveCompanyFallback(input.url, input.company);
  return {
    title: `Role on ${host}`,
    company,
    titleSource: "fallback_host",
    companySource,
  };
}
