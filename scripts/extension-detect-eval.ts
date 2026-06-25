#!/usr/bin/env npx tsx
/**
 * Live URL detection eval — run without Chrome extension.
 *
 *   npm run extension:detect-eval -- --url "https://jobs.cvshealth.com/us/en/careerareas"
 */
import { parseHTML } from "linkedom";
import { classifyJobPage } from "@/src/shared/extension/page-classifier";
import { fingerprintAtsFromUrl } from "@/src/shared/extension/ats-fingerprint";
import { detectJobPage } from "@/src/shared/extension/detect-job-page";
import { isJobPage } from "@/src/shared/extension/is-job-page";
import { assessCaptureCompleteness } from "@/src/shared/extension/capture-fields";
import type { ExtensionRuntimeConfig } from "@/src/shared/extension/types";

const args = process.argv.slice(2);
const urlArgIndex = args.indexOf("--url");
const url = urlArgIndex >= 0 ? args[urlArgIndex + 1] : null;

if (!url) {
  console.error("Usage: npm run extension:detect-eval -- --url <job-or-hub-url>");
  process.exit(1);
}

const config: ExtensionRuntimeConfig = {
  extensionGlobalSwitch: true,
  jobCardEnabled: true,
  enabledPlatforms: [
    "linkedin",
    "indeed",
    "greenhouse",
    "workday",
    "lever",
    "ashby",
    "icims",
    "smartrecruiters",
    "taleo",
    "jobvite",
    "generic",
  ],
  genericFallbackEnabled: true,
  minConfidence: 55,
  apiBaseUrl: "http://localhost:3000",
};

async function fetchDocument(targetUrl: string): Promise<Document> {
  const response = await fetch(targetUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; EasySubmit-DetectEval/1.0; +https://easysubmit.ai)",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${targetUrl}`);
  }

  const html = await response.text();
  const { document, window } = parseHTML(html);
  window.location.href = targetUrl;
  Object.defineProperty(document, "defaultView", {
    value: window,
    configurable: true,
  });
  return document as unknown as Document;
}

function emptyDocument(targetUrl: string): Document {
  return {
    title: "",
    body: { innerText: "" },
    querySelector: () => null,
    querySelectorAll: () => [],
    defaultView: { location: { href: targetUrl } },
  } as unknown as Document;
}

async function main() {
  console.log(`\nEasySubmit detection eval\nURL: ${url}\n`);

  let doc: Document;
  try {
    doc = await fetchDocument(url!);
    console.log("Fetch: OK");
  } catch (error) {
    console.warn(
      `Fetch failed (${error instanceof Error ? error.message : error}) — URL-only mode`,
    );
    doc = emptyDocument(url!);
  }

  const classification = classifyJobPage(url!, doc);
  const fingerprint = fingerprintAtsFromUrl(url!);
  const isJob = isJobPage(doc, url!);
  const detected = detectJobPage(doc, url!, config);

  const completeness = detected
    ? assessCaptureCompleteness({
        url,
        title: detected.metadata.title,
        company: detected.metadata.company,
        location: detected.metadata.location,
        salaryText: detected.metadata.salaryText,
        description: detected.metadata.description,
        platform: detected.metadata.platform,
        metadata: { confidence: detected.metadata.confidence },
      })
    : null;

  console.log("\n--- Page classifier ---");
  console.log(JSON.stringify(classification, null, 2));

  console.log("\n--- ATS fingerprint ---");
  console.log(JSON.stringify(fingerprint, null, 2));

  console.log("\n--- Gates ---");
  console.log({ isJobPage: isJob, detectJobPage: detected ? "match" : null });

  if (detected) {
    console.log("\n--- Scraped metadata ---");
    console.log(JSON.stringify(detected.metadata, null, 2));
    console.log("\n--- Capture completeness ---");
    console.log(JSON.stringify(completeness, null, 2));
  }

  console.log("\n--- Verdict ---");
  const showCard = Boolean(detected);
  console.log(showCard ? "SHOW CARD" : "NO CARD");
  process.exit(showCard ? 0 : 2);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
