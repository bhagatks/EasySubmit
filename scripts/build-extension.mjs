#!/usr/bin/env node
/**
 * Bundles MV3 extension into dist/extension/ (or --out-dir).
 * Usage:
 *   npm run build:extension              — local dev (keeps localhost in manifest)
 *   npm run build:extension:store        — Chrome Web Store (strips localhost URLs)
 *   npm run build:extensions             — dev + prod-QA folders (run easy step 5)
 */
import { build } from "esbuild";
import { config as loadEnv } from "dotenv";
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateExtensionIcons } from "./generate-extension-icons.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const EXTENSION_ROOT = resolve(__dirname, "..");
export const EXTENSION_DEV_OUT_DIR = "dist/extension";
export const EXTENSION_PROD_QA_OUT_DIR = "dist/extension-prod";
const extRoot = resolve(EXTENSION_ROOT, "extension");

loadEnv({ path: resolve(EXTENSION_ROOT, ".env.local") });

function parseOutDirArg() {
  const flag = process.argv.find((arg) => arg.startsWith("--out-dir="));
  if (flag) return flag.slice("--out-dir=".length);
  return process.env.EXTENSION_OUT_DIR?.trim() || EXTENSION_DEV_OUT_DIR;
}

function isStoreBuildFlag() {
  return process.env.EXTENSION_STORE_BUILD === "1" || process.argv.includes("--store");
}

function isLocalhostMatch(url) {
  return /localhost|127\.0\.0\.1/i.test(url);
}

/** Chrome Web Store rejects localhost in host_permissions and externally_connectable. */
function manifestForStore(manifest) {
  const out = structuredClone(manifest);
  if (Array.isArray(out.host_permissions)) {
    out.host_permissions = out.host_permissions.filter((p) => !isLocalhostMatch(p));
  }
  if (out.externally_connectable?.matches) {
    out.externally_connectable.matches = out.externally_connectable.matches.filter(
      (p) => !isLocalhostMatch(p),
    );
  }
  return out;
}

function resolveExtensionEnv({ storeBuild, appUrl, analyticsEnv, analyticsEnabled }) {
  const defaultAppUrl = storeBuild ? "https://www.easysubmit.ai" : "http://localhost:3000";
  const resolvedAppUrl =
    appUrl ??
    process.env.NEXT_PUBLIC_APP_URL ??
    (storeBuild ? undefined : process.env.NEXTAUTH_URL) ??
    defaultAppUrl;

  return {
    NODE_ENV: "production",
    NEXT_PUBLIC_APP_URL: resolvedAppUrl.replace(/\/$/, ""),
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "",
    NEXT_PUBLIC_POSTHOG_HOST:
      process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    NEXT_PUBLIC_ANALYTICS_ENABLED:
      analyticsEnabled ?? process.env.NEXT_PUBLIC_ANALYTICS_ENABLED ?? "false",
    NEXT_PUBLIC_ANALYTICS_ENV:
      analyticsEnv ?? process.env.NEXT_PUBLIC_ANALYTICS_ENV ?? (storeBuild ? "prod" : "dev"),
    NEXT_PUBLIC_ANALYTICS_INTERNAL_USER_IDS:
      process.env.NEXT_PUBLIC_ANALYTICS_INTERNAL_USER_IDS ?? "",
    NEXT_PUBLIC_POSTHOG_AUTOCAPTURE: "false",
  };
}

/**
 * @param {object} [options]
 * @param {string} [options.outDir] — relative to repo root
 * @param {boolean} [options.storeBuild]
 * @param {string} [options.appUrl]
 * @param {string} [options.analyticsEnv]
 * @param {string} [options.analyticsEnabled]
 * @param {boolean} [options.skipIcons]
 * @param {string} [options.label] — log prefix
 */
export async function buildExtension(options = {}) {
  const storeBuild = options.storeBuild ?? isStoreBuildFlag();
  const outDir = resolve(EXTENSION_ROOT, options.outDir ?? parseOutDirArg());
  const label = options.label ?? (storeBuild ? "store" : "dev");

  if (!options.skipIcons) {
    await generateExtensionIcons();
  }

  const extensionEnv = resolveExtensionEnv({
    storeBuild,
    appUrl: options.appUrl,
    analyticsEnv: options.analyticsEnv,
    analyticsEnabled: options.analyticsEnabled,
  });

  const analyticsDefine = {
    "process.env": JSON.stringify(extensionEnv),
  };

  mkdirSync(outDir, { recursive: true });

  const raw = readFileSync(resolve(extRoot, "manifest.json"), "utf8");
  const manifest = JSON.parse(raw);
  const finalManifest = storeBuild ? manifestForStore(manifest) : manifest;
  writeFileSync(resolve(outDir, "manifest.json"), `${JSON.stringify(finalManifest, null, 2)}\n`);
  if (storeBuild) {
    console.log(`→ [${label}] Store manifest: removed localhost (CWS requirement)`);
  }

  mkdirSync(resolve(outDir, "popup"), { recursive: true });
  cpSync(resolve(extRoot, "src/popup/popup.html"), resolve(outDir, "popup/popup.html"));
  cpSync(resolve(extRoot, "src/popup/popup.css"), resolve(outDir, "popup/popup.css"));

  const sharedAlias = {
    "@shared": resolve(EXTENSION_ROOT, "src/shared"),
    "@": EXTENSION_ROOT,
  };

  const commonBuild = {
    bundle: true,
    platform: "browser",
    target: "chrome109",
    alias: sharedAlias,
    logLevel: "info",
    define: analyticsDefine,
  };

  await build({
    ...commonBuild,
    entryPoints: [resolve(extRoot, "src/background/index.ts")],
    outfile: resolve(outDir, "background.js"),
    format: "esm",
  });

  await build({
    ...commonBuild,
    entryPoints: [resolve(extRoot, "src/content/job-realtime-impl.ts")],
    outfile: resolve(outDir, "job-realtime-impl.js"),
    format: "esm",
  });

  await build({
    ...commonBuild,
    entryPoints: [resolve(extRoot, "src/content/index.ts")],
    outfile: resolve(outDir, "content.js"),
    format: "iife",
  });

  await build({
    ...commonBuild,
    entryPoints: [resolve(EXTENSION_ROOT, "src/shared/extension/api-intercept-page.ts")],
    outfile: resolve(outDir, "api-intercept-page.js"),
    format: "iife",
  });

  await build({
    ...commonBuild,
    entryPoints: [resolve(extRoot, "src/popup/popup.ts")],
    outfile: resolve(outDir, "popup/popup.js"),
    format: "esm",
  });

  console.log(`→ [${label}] Built → ${outDir}`);
  console.log(`   API base: ${extensionEnv.NEXT_PUBLIC_APP_URL}`);
  return { outDir, extensionEnv, storeBuild };
}

async function main() {
  const storeBuild = isStoreBuildFlag();
  const result = await buildExtension({ storeBuild });

  if (result.storeBuild) {
    console.log("\nChrome Web Store: zip dist/extension and upload easysubmit-extension.zip");
  } else {
    console.log("\nLoad unpacked in Chrome: chrome://extensions → dist/extension");
  }
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
