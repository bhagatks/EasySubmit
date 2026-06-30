#!/usr/bin/env node
/**
 * Smoke test: production web bundle has a non-empty PostHog project key inlined.
 * Run after deploy: npm run prod:verify-posthog
 */
const DEFAULT_ORIGIN = "https://www.easysubmit.ai";
const ORIGIN = (process.env.PROD_ORIGIN ?? DEFAULT_ORIGIN).replace(/\/$/, "");

async function fetchText(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.text();
}

function chunkPathsFromHtml(html) {
  return [...html.matchAll(/\/_next\/static\/chunks\/[^"']+\.js/g)].map((m) => m[0]);
}

function bundleHasPosthogKey(js) {
  if (/phc_[a-zA-Z0-9]{20,}/.test(js)) return true;
  if (/NEXT_PUBLIC_POSTHOG_KEY":"phc_[a-zA-Z0-9]+"/.test(js)) return true;
  if (/NEXT_PUBLIC_POSTHOG_KEY:'phc_[a-zA-Z0-9]+'/.test(js)) return true;
  if (/NEXT_PUBLIC_POSTHOG_KEY:\s*"phc_[a-zA-Z0-9]+"/.test(js)) return true;
  return false;
}

async function main() {
  console.log(`━━━ PostHog prod smoke (${ORIGIN}) ━━━\n`);

  const html = await fetchText(`${ORIGIN}/login`);
  const chunks = chunkPathsFromHtml(html);
  if (chunks.length === 0) {
    console.error("❌ No Next.js chunks found on /login");
    process.exit(1);
  }

  let analyticsChunk = null;
  let hasKey = false;

  for (const path of chunks) {
    const js = await fetchText(`${ORIGIN}${path}`);
    if (bundleHasPosthogKey(js)) {
      hasKey = true;
      analyticsChunk = path;
      break;
    }
    if (!analyticsChunk && /identified_only/.test(js) && /capture_pageview/.test(js)) {
      analyticsChunk = path;
    }
  }

  if (!analyticsChunk) {
    console.error("❌ Analytics client chunk not found in production bundle");
    process.exit(1);
  }

  if (!hasKey) {
    console.error("❌ PostHog project key (phc_…) not inlined in production bundle");
    console.error("   → Vercel Production NEXT_PUBLIC_POSTHOG_KEY missing at build time");
    console.error("   → npm run prod:repair-analytics   (sync key + force redeploy)");
    process.exit(1);
  }

  console.log(`✔ PostHog key present in bundle (${analyticsChunk})`);
  console.log("✔ Prod PostHog smoke passed");
}

main().catch((error) => {
  console.error("❌ PostHog prod smoke failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
