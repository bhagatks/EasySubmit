#!/usr/bin/env node
/**
 * Batched production smoke checks (no secrets required).
 * Run: node scripts/prod-batch-smoke.mjs
 */
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ORIGIN = (process.env.PROD_ORIGIN ?? "https://www.easysubmit.ai").replace(/\/$/, "");
const SUPA = "https://yofgnflcqajqsepbfdkc.supabase.co";

const pass = [];
const fail = [];
const warn = [];

function ok(message) {
  pass.push(message);
  console.log(`✔ ${message}`);
}

function bad(message) {
  fail.push(message);
  console.log(`❌ ${message}`);
}

function maybe(message) {
  warn.push(message);
  console.log(`⚠ ${message}`);
}

async function fetchStatus(url, method = "GET") {
  const res = await fetch(url, { method, redirect: "manual" });
  return { status: res.status, location: res.headers.get("location"), text: method === "GET" ? await res.text() : "" };
}

function chunkPathsFromHtml(html) {
  return [...html.matchAll(/\/_next\/static\/chunks\/[^"']+\.js/g)].map((m) => m[0]);
}

function bundleHasPosthogKey(js) {
  return /phc_[a-zA-Z0-9]{20,}/.test(js);
}

console.log(`━━━ EasySubmit prod batch smoke (${ORIGIN}) ━━━\n`);

const home = await fetchStatus(`${ORIGIN}/`);
home.status === 200 ? ok(`GET / → ${home.status}`) : bad(`GET / → ${home.status}`);

for (const path of ["dashboard", "onboarding"]) {
  const res = await fetchStatus(`${ORIGIN}/${path}`);
  if (res.status >= 300 && res.status < 400 && res.location?.includes("/login")) {
    ok(`GET /${path} → redirect ${res.location}`);
  } else {
    bad(`GET /${path} → expected /login redirect, got ${res.status} ${res.location ?? ""}`);
  }
}

const providers = JSON.parse((await fetchStatus(`${ORIGIN}/api/auth/providers`)).text);
if (providers.google?.callbackUrl?.includes("www.easysubmit.ai/api/auth/callback/google")) {
  ok("Google OAuth callback on prod domain");
} else {
  bad("Google OAuth callback missing or wrong");
}
if (providers.linkedin?.callbackUrl?.includes("www.easysubmit.ai/api/auth/callback/linkedin")) {
  ok("LinkedIn OAuth callback on prod domain");
} else {
  bad("LinkedIn OAuth callback missing or wrong");
}

const csrf = JSON.parse((await fetchStatus(`${ORIGIN}/api/auth/csrf`)).text);
csrf.csrfToken ? ok("NextAuth CSRF endpoint") : bad("NextAuth CSRF endpoint");

for (const path of ["sitemap.xml", "robots.txt", "support"]) {
  const res = await fetchStatus(`${ORIGIN}/${path}`);
  res.status === 200 ? ok(`GET /${path} → ${res.status}`) : bad(`GET /${path} → ${res.status}`);
}

const bucketProbe = await (await fetch(`${SUPA}/storage/v1/object/public/avatars/__probe__`)).text();
if (bucketProbe.includes("Object not found")) {
  ok('Supabase "avatars" bucket exists');
} else if (bucketProbe.includes("Bucket not found")) {
  bad('Supabase "avatars" bucket missing');
} else {
  maybe(`Supabase avatars bucket probe unexpected: ${bucketProbe.slice(0, 120)}`);
}

const loginHtml = (await fetchStatus(`${ORIGIN}/login`)).text;
const chunks = chunkPathsFromHtml(loginHtml);
let hasKey = false;
for (const chunk of chunks) {
  const js = (await fetchStatus(`${ORIGIN}${chunk}`)).text;
  if (bundleHasPosthogKey(js)) {
    hasKey = true;
    ok(`PostHog phc_ key in prod bundle (${chunk})`);
    break;
  }
}
if (!hasKey) bad("PostHog key missing from sampled login chunks");

try {
  const gh = execSync(
    'gh run list --workflow=deploy.yml --limit 1 --json conclusion,displayTitle,url',
    { encoding: "utf8" },
  );
  const [run] = JSON.parse(gh);
  run?.conclusion === "success"
    ? ok(`Extension CI latest: success — ${run.displayTitle}`)
    : maybe(`Extension CI latest: ${run?.conclusion ?? "unknown"} — ${run?.displayTitle ?? "n/a"}`);
} catch {
  maybe("Could not query extension CI (gh)");
}

try {
  const gh = execSync('gh run list --workflow=ci.yml --limit 1 --json conclusion,displayTitle,url', {
    encoding: "utf8",
  });
  const [run] = JSON.parse(gh);
  run?.conclusion === "success"
    ? ok(`Web CI latest: success — ${run.displayTitle}`)
    : maybe(`Web CI latest: ${run?.conclusion ?? "unknown"} — ${run?.displayTitle ?? "n/a"}`);
} catch {
  maybe("Could not query web CI (gh)");
}

const authDiff = execSync("git diff --quiet lib/auth.ts; echo $?", { encoding: "utf8" }).trim();
authDiff === "0"
  ? ok("Avatar session fix: no local diff (may already be committed)")
  : maybe("Avatar session fix in lib/auth.ts NOT deployed yet — commit + push needed");

const migrationsDir = resolve(process.cwd(), "prisma/migrations");
const localMigrations = readdirSync(migrationsDir).filter((name) => /^\d/.test(name)).sort();
const pendingUntracked = localMigrations.filter((name) => {
  const path = resolve(migrationsDir, name, "migration.sql");
  return existsSync(path) && execSync(`git ls-files --error-unmatch "${path}" 2>/dev/null; echo $?`, {
    encoding: "utf8",
    shell: "/bin/bash",
  }).trim().endsWith("1");
});
if (pendingUntracked.length > 0) {
  maybe(`Uncommitted migrations not on prod yet: ${pendingUntracked.join(", ")}`);
} else {
  ok("All local migrations are tracked in git");
}

console.log(`\nSummary: ${pass.length} passed, ${fail.length} failed, ${warn.length} warnings`);
if (fail.length > 0) process.exit(1);
