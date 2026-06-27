#!/usr/bin/env node
/**
 * Bundles MV3 extension into dist/extension/
 * Usage: npm run build:extension
 */
import { build } from "esbuild";
import { config as loadEnv } from "dotenv";
import { cpSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateExtensionIcons } from "./generate-extension-icons.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const outDir = resolve(root, "dist/extension");
const extRoot = resolve(root, "extension");

loadEnv({ path: resolve(root, ".env.local") });
loadEnv({ path: resolve(root, ".env") });

const analyticsDefine = {
  "process.env.NEXT_PUBLIC_POSTHOG_KEY": JSON.stringify(process.env.NEXT_PUBLIC_POSTHOG_KEY ?? ""),
  "process.env.NEXT_PUBLIC_POSTHOG_HOST": JSON.stringify(
    process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
  ),
  "process.env.NEXT_PUBLIC_ANALYTICS_ENABLED": JSON.stringify(
    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED ?? "false",
  ),
  "process.env.NEXT_PUBLIC_ANALYTICS_ENV": JSON.stringify(
    process.env.NEXT_PUBLIC_ANALYTICS_ENV ?? "dev",
  ),
  "process.env.NEXT_PUBLIC_ANALYTICS_INTERNAL_USER_IDS": JSON.stringify(
    process.env.NEXT_PUBLIC_ANALYTICS_INTERNAL_USER_IDS ?? "",
  ),
  "process.env.NEXT_PUBLIC_POSTHOG_AUTOCAPTURE": JSON.stringify("false"),
};

async function main() {
  await generateExtensionIcons();

  cpSync(resolve(extRoot, "manifest.json"), resolve(outDir, "manifest.json"));

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
  console.log("Load unpacked in Chrome: chrome://extensions → dist/extension");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
