import { parseCompanyFromJobHost, parseJobTitleFromUrl } from "./job-url-parse";

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
  if (scrapedTitle.length >= 2 && scrapedTitle !== "Job posting on this page") {
    const company =
      input.company?.trim() ||
      parseCompanyFromJobHost(input.url) ||
      null;
    return {
      title: scrapedTitle,
      company,
      titleSource: "scrape",
      companySource: input.company?.trim()
        ? "scrape"
        : company
          ? "host"
          : null,
    };
  }

  const fromUrl = parseJobTitleFromUrl(input.url);
  if (fromUrl) {
    const company = input.company?.trim() || parseCompanyFromJobHost(input.url) || null;
    return {
      title: fromUrl,
      company,
      titleSource: "url_slug",
      companySource: input.company?.trim() ? "scrape" : company ? "host" : null,
    };
  }

  const fromDescription = titleFromDescriptionFirstLine(input.description);
  if (fromDescription) {
    const company = input.company?.trim() || parseCompanyFromJobHost(input.url) || null;
    return {
      title: fromDescription,
      company,
      titleSource: "description",
      companySource: input.company?.trim() ? "scrape" : company ? "host" : null,
    };
  }

  const host = hostLabelFromUrl(input.url);
  return {
    title: `Role on ${host}`,
    company: input.company?.trim() || parseCompanyFromJobHost(input.url) || null,
    titleSource: "fallback_host",
    companySource: input.company?.trim() ? "scrape" : parseCompanyFromJobHost(input.url) ? "host" : null,
  };
}
