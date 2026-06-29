#!/usr/bin/env node
/**
 * Bundles MV3 extension into dist/extension/
 * Usage:
 *   npm run build:extension        — local dev (keeps localhost in manifest)
 *   npm run build:extension:store  — Chrome Web Store (strips localhost URLs)
 */
import { build } from "esbuild";
import { config as loadEnv } from "dotenv";
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateExtensionIcons } from "./generate-extension-icons.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const outDir = resolve(root, "dist/extension");
const extRoot = resolve(root, "extension");

loadEnv({ path: resolve(root, ".env.local") });

const storeBuild =
  process.env.EXTENSION_STORE_BUILD === "1" ||
  process.argv.includes("--store");

// Store builds: set NEXT_PUBLIC_* in shell or run `node scripts/run.mjs admin -- npm run build:extension:store`

// Shared analytics reads env via dynamic `process.env[key]` — define the whole object
// so esbuild inlines values for extension bundles (static `process.env.FOO` alone is not enough).
const extensionEnv = {
  NODE_ENV: "production",
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "",
  NEXT_PUBLIC_POSTHOG_HOST:
    process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
  NEXT_PUBLIC_ANALYTICS_ENABLED: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED ?? "false",
  NEXT_PUBLIC_ANALYTICS_ENV: process.env.NEXT_PUBLIC_ANALYTICS_ENV ?? "dev",
  NEXT_PUBLIC_ANALYTICS_INTERNAL_USER_IDS:
    process.env.NEXT_PUBLIC_ANALYTICS_INTERNAL_USER_IDS ?? "",
  NEXT_PUBLIC_POSTHOG_AUTOCAPTURE: "false",
};

const analyticsDefine = {
  "process.env": JSON.stringify(extensionEnv),
};

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

function writeManifest() {
  const raw = readFileSync(resolve(extRoot, "manifest.json"), "utf8");
  const manifest = JSON.parse(raw);
  const finalManifest = storeBuild ? manifestForStore(manifest) : manifest;
  writeFileSync(
    resolve(outDir, "manifest.json"),
    `${JSON.stringify(finalManifest, null, 2)}\n`,
  );
  if (storeBuild) {
    console.log("→ Store build: removed localhost from manifest (CWS requirement)");
  }
}

async function main() {
  await generateExtensionIcons();

  mkdirSync(outDir, { recursive: true });
  writeManifest();

  mkdirSync(resolve(outDir, "popup"), { recursive: true });
  cpSync(resolve(extRoot, "src/popup/popup.html"), resolve(outDir, "popup/popup.html"));
  cpSync(resolve(extRoot, "src/popup/popup.css"), resolve(outDir, "popup/popup.css"));

  const sharedAlias = {
    "@shared": resolve(root, "src/shared"),
    "@": root,
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
    entryPoints: [resolve(root, "src/shared/extension/api-intercept-page.ts")],
    outfile: resolve(outDir, "api-intercept-page.js"),
    format: "iife",
  });

  await build({
    ...commonBuild,
    entryPoints: [resolve(extRoot, "src/popup/popup.ts")],
    outfile: resolve(outDir, "popup/popup.js"),
    format: "esm",
  });

  console.log(`\nEasySubmit extension built → ${outDir}`);
  if (storeBuild) {
    console.log("Chrome Web Store: zip dist/extension and upload easysubmit-extension.zip");
  } else {
    console.log("Load unpacked in Chrome: chrome://extensions → dist/extension");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
