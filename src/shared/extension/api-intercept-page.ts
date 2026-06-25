/**
 * Page-world fetch/XHR hook. Bundled to `api-intercept-page.js` and injected via
 * `script.src` so strict CSP sites (e.g. Workday) do not block inline scripts.
 */
import { INTERCEPT_MESSAGE_TYPE } from "./api-intercept-constants";

type AtsPlatform = "greenhouse" | "lever" | "ashby" | "smartrecruiters";

type AtsPattern = {
  platform: AtsPlatform;
  pattern: RegExp;
  parse: (data: Record<string, unknown>) => Record<string, string | null | undefined>;
};

declare global {
  interface Window {
    __easysubmit_intercept__?: boolean;
  }
}

function extractSection(html: string | null | undefined, keywords: string[]): string | null {
  if (!html) return null;
  const div = document.createElement("div");
  div.innerHTML = html;
  const headings = div.querySelectorAll("h1,h2,h3,h4,strong,b");
  for (const h of headings) {
    const text = h.textContent?.toLowerCase() ?? "";
    if (keywords.some((k) => text.includes(k))) {
      let content = "";
      let el = h.nextElementSibling;
      while (el && !["H1", "H2", "H3", "H4"].includes(el.tagName)) {
        content += `${el.textContent ?? ""} `;
        el = el.nextElementSibling;
      }
      return content.trim() || null;
    }
  }
  return null;
}

function flattenLeverContent(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "string") return val;
  if (Array.isArray(val)) {
    return val
      .map((v) => (typeof v === "string" ? v : ((v as { body?: string })?.body ?? "")))
      .join(" ");
  }
  return null;
}

function tryParse(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const ATS_PATTERNS: AtsPattern[] = [
  {
    platform: "greenhouse",
    pattern: /(?:boards-api|job-boards-api)\.greenhouse\.io\/v1\/boards\/[^/]+\/jobs\/\d+/i,
    parse: (data) => ({
      title: typeof data.title === "string" ? data.title : undefined,
      company: undefined,
      location: (data.location as { name?: string } | undefined)?.name,
      description: typeof data.content === "string" ? data.content : undefined,
      qualifications: extractSection(
        typeof data.content === "string" ? data.content : null,
        ["qualifications", "requirements"],
      ),
      responsibilities: extractSection(
        typeof data.content === "string" ? data.content : null,
        ["responsibilities", "what you"],
      ),
    }),
  },
  {
    platform: "greenhouse",
    pattern: /\/gh\/jobs\/[\w-]+/,
    parse: (data) => ({
      title: typeof data.title === "string" ? data.title : undefined,
      company:
        (data.departments as Array<{ name?: string }> | undefined)?.[0]?.name ??
        (data.company as { name?: string } | undefined)?.name,
      location:
        (data.location as { name?: string } | undefined)?.name ??
        (data.offices as Array<{ name?: string }> | undefined)?.[0]?.name,
      description: typeof data.content === "string" ? data.content : undefined,
      qualifications: extractSection(
        typeof data.content === "string" ? data.content : null,
        ["qualifications", "requirements"],
      ),
      responsibilities: extractSection(
        typeof data.content === "string" ? data.content : null,
        ["responsibilities", "what you"],
      ),
    }),
  },
  {
    platform: "lever",
    pattern: /\/v0\/postings\/[\w-]+/,
    parse: (data) => ({
      title: typeof data.text === "string" ? data.text : undefined,
      company: typeof data.company === "string" ? data.company : undefined,
      location:
        (data.categories as { location?: string } | undefined)?.location ??
        (typeof data.workplaceType === "string" ? data.workplaceType : undefined),
      description: flattenLeverContent(data.descriptionBody ?? data.description) ?? undefined,
      qualifications: flattenLeverContent(data.additionalPlain) ?? undefined,
      responsibilities: null,
    }),
  },
  {
    platform: "ashby",
    pattern: /\/api\/jobPosting\/[\w-]+/,
    parse: (data) => {
      const posting = (data.jobPosting as Record<string, unknown> | undefined) ?? data;
      return {
        title: typeof posting.title === "string" ? posting.title : undefined,
        company: (posting.organization as { name?: string } | undefined)?.name,
        location:
          (typeof posting.locationName === "string" ? posting.locationName : undefined) ??
          (posting.isRemote ? "Remote" : null),
        description:
          (typeof posting.descriptionHtml === "string" ? posting.descriptionHtml : undefined) ??
          (typeof posting.description === "string" ? posting.description : undefined),
        qualifications: null,
        responsibilities: null,
      };
    },
  },
  {
    platform: "smartrecruiters",
    pattern: /\/v1\/companies\/[\w-]+\/postings\/[\w-]+/,
    parse: (data) => ({
      title: typeof data.name === "string" ? data.name : undefined,
      company: (data.company as { name?: string } | undefined)?.name,
      location:
        [
          (data.location as { city?: string } | undefined)?.city,
          (data.location as { country?: string } | undefined)?.country,
        ]
          .filter(Boolean)
          .join(", ") || null,
      description: (data.jobAd as { sections?: { jobDescription?: { text?: string } } } | undefined)
        ?.sections?.jobDescription?.text,
      qualifications: (data.jobAd as { sections?: { qualifications?: { text?: string } } } | undefined)
        ?.sections?.qualifications?.text,
      responsibilities: (
        data.jobAd as { sections?: { jobResponsibilities?: { text?: string } } } | undefined
      )?.sections?.jobResponsibilities?.text,
    }),
  },
];

function matchAndBroadcast(url: string, responseText: string): void {
  for (const { platform, pattern, parse } of ATS_PATTERNS) {
    if (!pattern.test(url)) continue;
    const data = tryParse(responseText);
    if (!data) return;
    const fields = parse(data);
    if (!fields.title) return;
    window.postMessage({ type: INTERCEPT_MESSAGE_TYPE, platform, ...fields }, "*");
    return;
  }
}

function installApiIntercept(): void {
  if (window.__easysubmit_intercept__) return;
  window.__easysubmit_intercept__ = true;

  const origFetch = window.fetch;
  window.fetch = function fetchIntercept(...args: Parameters<typeof fetch>) {
    const url =
      typeof args[0] === "string"
        ? args[0]
        : args[0] instanceof Request
          ? args[0].url
          : "";
    const shouldIntercept = ATS_PATTERNS.some(({ pattern }) => pattern.test(url));
    const responsePromise = origFetch.apply(this, args);
    if (!shouldIntercept) return responsePromise;
    return responsePromise.then((res) => {
      const clone = res.clone();
      void clone.text().then((text) => matchAndBroadcast(url, text)).catch(() => undefined);
      return res;
    });
  };

  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function openIntercept(
    method: string,
    url: string | URL,
    ...rest: [boolean?, string?, string?]
  ) {
    (this as XMLHttpRequest & { __es_url__?: string }).__es_url__ = String(url);
    return origOpen.apply(this, [method, url, ...rest] as Parameters<typeof origOpen>);
  };

  XMLHttpRequest.prototype.send = function sendIntercept(...args: Parameters<XMLHttpRequest["send"]>) {
    const url = (this as XMLHttpRequest & { __es_url__?: string }).__es_url__ ?? "";
    const shouldIntercept = ATS_PATTERNS.some(({ pattern }) => pattern.test(url));
    if (shouldIntercept) {
      this.addEventListener("load", () => {
        try {
          matchAndBroadcast(url, this.responseText);
        } catch {
          /* ignore */
        }
      });
    }
    return origSend.apply(this, args);
  };
}

installApiIntercept();
