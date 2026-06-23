/**
 * Network API Intercept Layer
 *
 * Injects a page-world script that hooks fetch/XHR to capture ATS API responses
 * before the page processes them. Sends intercepted job data back to the content
 * script via postMessage.
 *
 * Supported ATS APIs:
 *   Greenhouse:      /gh/jobs/:id  (boards.greenhouse.io)
 *   Lever:           /v0/postings/:id  (jobs.lever.co)
 *   Ashby:           /api/jobPosting/:id  (jobs.ashbyhq.com)
 *   SmartRecruiters: /v1/companies/:co/postings/:id  (careers.smartrecruiters.com)
 */

import { INTERCEPT_MESSAGE_TYPE } from "./api-intercept-constants";

export { INTERCEPT_MESSAGE_TYPE };

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

const PAGE_SCRIPT_PATH = "api-intercept-page.js";
const PAGE_SCRIPT_ID = "__easysubmit_intercept_script__";

/**
 * Inject the intercept script into the page world via extension URL (CSP-safe).
 * Must be called from content script context.
 */
export function injectApiInterceptScript(): void {
  try {
    if (document.getElementById(PAGE_SCRIPT_ID)) return;
    if (typeof chrome === "undefined" || !chrome.runtime?.getURL) return;

    const script = document.createElement("script");
    script.id = PAGE_SCRIPT_ID;
    script.src = chrome.runtime.getURL(PAGE_SCRIPT_PATH);
    script.async = false;
    script.onload = () => script.remove();
    script.onerror = () => script.remove();
    (document.head ?? document.documentElement).appendChild(script);
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
