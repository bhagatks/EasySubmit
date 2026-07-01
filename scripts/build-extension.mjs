#!/usr/bin/env node
/**
 * Bundles MV3 extension into fixed output folders:
 *   dist/extension-dev/  — local dev (http://localhost:3000, localhost in manifest)
 *   dist/extension/      — prod + Chrome Web Store (https://www.easysubmit.ai)
 *
 * Usage:
 *   npm run build:extension        — dev → dist/extension-dev
 *   npm run build:extension:store  — prod → dist/extension (CWS-safe manifest)
 *   npm run build:extensions       — both folders (run easy step 5)
 */
import { build } from "esbuild";
import { config as loadEnv } from "dotenv";
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateExtensionIcons } from "./generate-extension-icons.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const EXTENSION_ROOT = resolve(__dirname, "..");
/** Prod + Chrome Web Store — always https://www.easysubmit.ai */
export const EXTENSION_PROD_OUT_DIR = "dist/extension";
/** Local dev — always http://localhost:3000 */
export const EXTENSION_DEV_OUT_DIR = "dist/extension-dev";
const extRoot = resolve(EXTENSION_ROOT, "extension");
/** Must match BRAND.extension.devManifestName in src/shared/brand.ts */
const EXTENSION_DEV_DISPLAY_NAME = "Dev Easy";

loadEnv({ path: resolve(EXTENSION_ROOT, ".env.local") });

function isStoreBuildFlag() {
  return process.env.EXTENSION_STORE_BUILD === "1" || process.argv.includes("--store");
}

function defaultOutDir(storeBuild) {
  return storeBuild ? EXTENSION_PROD_OUT_DIR : EXTENSION_DEV_OUT_DIR;
}

function parseOutDirArg(storeBuild) {
  const flag = process.argv.find((arg) => arg.startsWith("--out-dir="));
  if (flag) return flag.slice("--out-dir=".length);
  return process.env.EXTENSION_OUT_DIR?.trim() || defaultOutDir(storeBuild);
}

function isLocalhostMatch(url) {
  return /localhost|127\.0\.0\.1/i.test(url);
}

/** Chrome Web Store rejects localhost in host_permissions and externally_connectable. */
const MV3_FORBIDDEN_PATTERNS = [
  "__PosthogExtensions__.loadExternalDependency=",
  "loadExternalDependency=(t,e,i)",
];

function assertExtensionBundleMv3Safe(outDir) {
  const bundles = ["content.js", "popup/popup.js", "background.js"];
  for (const relativePath of bundles) {
    const source = readFileSync(resolve(outDir, relativePath), "utf8");
    for (const pattern of MV3_FORBIDDEN_PATTERNS) {
      if (source.includes(pattern)) {
        throw new Error(
          `[${relativePath}] MV3 violation: found forbidden PostHog remote-loader pattern "${pattern}"`,
        );
      }
    }
  }
}

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
  const resolvedAppUrl = storeBuild
    ? (appUrl ?? defaultAppUrl)
    : (appUrl ??
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.NEXTAUTH_URL ??
      defaultAppUrl);

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
  const outDir = resolve(EXTENSION_ROOT, options.outDir ?? parseOutDirArg(storeBuild));
  const label = options.label ?? (storeBuild ? "prod" : "dev");

  if (!options.skipIcons) {
    await generateExtensionIcons(resolve(outDir, "icons"));
  }

  const extensionEnv = resolveExtensionEnv({
    storeBuild,
    appUrl: options.appUrl,
    analyticsEnv: options.analyticsEnv,
    analyticsEnabled: options.analyticsEnabled,
  });

  const extensionApiBase = extensionEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

  const analyticsDefine = {
    "process.env": JSON.stringify(extensionEnv),
    __EASYSUBMIT_EXTENSION_API_BASE__: JSON.stringify(extensionApiBase),
  };

  mkdirSync(outDir, { recursive: true });

  const raw = readFileSync(resolve(extRoot, "manifest.json"), "utf8");
  const manifest = JSON.parse(raw);
  if (!storeBuild) {
    manifest.name = EXTENSION_DEV_DISPLAY_NAME;
    if (manifest.action) {
      manifest.action.default_title = EXTENSION_DEV_DISPLAY_NAME;
    }
  }
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
    // MV3: never bundle posthog-js (CWS rejects loadExternalDependency remote loaders).
    "@/src/shared/analytics/browser": resolve(
      EXTENSION_ROOT,
      "src/shared/analytics/browser-extension.ts",
    ),
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

  assertExtensionBundleMv3Safe(outDir);

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
    console.log("\nLoad unpacked in Chrome: chrome://extensions → dist/extension-dev");
  }
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
