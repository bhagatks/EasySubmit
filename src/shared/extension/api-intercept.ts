/**
 * Network API Intercept Layer
 *
 * Injects a page-world script that hooks fetch/XHR to capture ATS API responses
 * before the page processes them. Sends intercepted job data back to the content
 * script via postMessage. Zero competitors do this — they all rely on DOM scraping
 * which breaks with every ATS UI update.
 *
 * Supported ATS APIs:
 *   Greenhouse:      /gh/jobs/:id  (boards.greenhouse.io)
 *   Lever:           /v0/postings/:id  (jobs.lever.co)
 *   Ashby:           /api/jobPosting/:id  (jobs.ashbyhq.com)
 *   SmartRecruiters: /v1/companies/:co/postings/:id  (careers.smartrecruiters.com)
 */

export const INTERCEPT_MESSAGE_TYPE = "__easysubmit_api_intercept__";

export type InterceptedJobData = {
  type: typeof INTERCEPT_MESSAGE_TYPE;
  platform: "greenhouse" | "lever" | "ashby" | "smartrecruiters";
  title?: string;
  company?: string;
  location?: string;
  description?: string;
  qualifications?: string;
  responsibilities?: string;
};

/**
 * The page-world script source injected via <script> tag.
 * Runs in the page's JavaScript context (not isolated content script world)
 * so it can override window.fetch and XMLHttpRequest.
 */
export function buildInterceptScript(): string {
  return `(function() {
  if (window.__easysubmit_intercept__) return;
  window.__easysubmit_intercept__ = true;

  const MSG = "${INTERCEPT_MESSAGE_TYPE}";

  const ATS_PATTERNS = [
    {
      platform: "greenhouse",
      pattern: /\\/gh\\/jobs\\/[\\w-]+/,
      parse: (data) => ({
        title: data.title,
        company: data.departments?.[0]?.name ?? data.company?.name,
        location: data.location?.name ?? data.offices?.[0]?.name,
        description: data.content,
        qualifications: extractSection(data.content, ["qualifications", "requirements"]),
        responsibilities: extractSection(data.content, ["responsibilities", "what you"]),
      }),
    },
    {
      platform: "lever",
      pattern: /\\/v0\\/postings\\/[\\w-]+/,
      parse: (data) => ({
        title: data.text,
        company: data.company,
        location: data.categories?.location ?? data.workplaceType,
        description: flattenLeverContent(data.descriptionBody ?? data.description),
        qualifications: flattenLeverContent(data.additionalPlain),
        responsibilities: null,
      }),
    },
    {
      platform: "ashby",
      pattern: /\\/api\\/jobPosting\\/[\\w-]+/,
      parse: (data) => {
        const posting = data.jobPosting ?? data;
        return {
          title: posting.title,
          company: posting.organization?.name,
          location: posting.locationName ?? posting.isRemote ? "Remote" : null,
          description: posting.descriptionHtml ?? posting.description,
          qualifications: null,
          responsibilities: null,
        };
      },
    },
    {
      platform: "smartrecruiters",
      pattern: /\\/v1\\/companies\\/[\\w-]+\\/postings\\/[\\w-]+/,
      parse: (data) => ({
        title: data.name,
        company: data.company?.name,
        location: [data.location?.city, data.location?.country].filter(Boolean).join(", ") || null,
        description: data.jobAd?.sections?.jobDescription?.text,
        qualifications: data.jobAd?.sections?.qualifications?.text,
        responsibilities: data.jobAd?.sections?.jobResponsibilities?.text,
      }),
    },
  ];

  function extractSection(html, keywords) {
    if (!html) return null;
    const div = document.createElement("div");
    div.innerHTML = html;
    const headings = div.querySelectorAll("h1,h2,h3,h4,strong,b");
    for (const h of headings) {
      const text = h.textContent?.toLowerCase() ?? "";
      if (keywords.some(k => text.includes(k))) {
        let content = "";
        let el = h.nextElementSibling;
        while (el && !["H1","H2","H3","H4"].includes(el.tagName)) {
          content += el.textContent + " ";
          el = el.nextElementSibling;
        }
        return content.trim() || null;
      }
    }
    return null;
  }

  function flattenLeverContent(val) {
    if (!val) return null;
    if (typeof val === "string") return val;
    if (Array.isArray(val)) return val.map(v => typeof v === "string" ? v : v?.body ?? "").join(" ");
    return null;
  }

  function tryParse(text) {
    try { return JSON.parse(text); } catch { return null; }
  }

  function matchAndBroadcast(url, responseText) {
    for (const { platform, pattern, parse } of ATS_PATTERNS) {
      if (!pattern.test(url)) continue;
      const data = tryParse(responseText);
      if (!data) return;
      const fields = parse(data);
      if (!fields.title) return;
      window.postMessage({ type: MSG, platform, ...fields }, "*");
      return;
    }
  }

  // Hook fetch
  const origFetch = window.fetch;
  window.fetch = function(...args) {
    const url = typeof args[0] === "string" ? args[0] : (args[0] instanceof Request ? args[0].url : "");
    const shouldIntercept = ATS_PATTERNS.some(({ pattern }) => pattern.test(url));
    const p = origFetch.apply(this, args);
    if (!shouldIntercept) return p;
    return p.then(res => {
      const clone = res.clone();
      clone.text().then(text => matchAndBroadcast(url, text)).catch(() => undefined);
      return res;
    });
  };

  // Hook XMLHttpRequest
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this.__es_url__ = String(url);
    return origOpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function(...args) {
    const url = this.__es_url__ ?? "";
    const shouldIntercept = ATS_PATTERNS.some(({ pattern }) => pattern.test(url));
    if (shouldIntercept) {
      this.addEventListener("load", () => {
        try { matchAndBroadcast(url, this.responseText); } catch { /* ignore */ }
      });
    }
    return origSend.apply(this, args);
  };
})();`;
}

/**
 * Inject the intercept script into the page world.
 * Must be called from content script context.
 * The script tag self-removes after execution.
 */
export function injectApiInterceptScript(): void {
  try {
    const existing = document.getElementById("__easysubmit_intercept_script__");
    if (existing) return;

    const script = document.createElement("script");
    script.id = "__easysubmit_intercept_script__";
    script.textContent = buildInterceptScript();
    (document.head ?? document.documentElement).appendChild(script);
    script.remove();
  } catch {
    // Non-fatal: falls back to DOM scraping
  }
}

/**
 * Listen for intercepted job data from the page world.
 * Returns a cleanup function.
 */
export function onApiIntercept(
  handler: (data: InterceptedJobData) => void,
): () => void {
  const listener = (event: MessageEvent) => {
    if (
      event.source === window &&
      event.data?.type === INTERCEPT_MESSAGE_TYPE &&
      event.data?.title
    ) {
      handler(event.data as InterceptedJobData);
    }
  };
  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
}
