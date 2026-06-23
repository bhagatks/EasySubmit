#!/usr/bin/env node
/**
 * Bundles MV3 extension into dist/extension/
 * Usage: npm run build:extension
 */
import { build } from "esbuild";
import { cpSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateExtensionIcons } from "./generate-extension-icons.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const outDir = resolve(root, "dist/extension");
const extRoot = resolve(root, "extension");

async function main() {
  await generateExtensionIcons();

  cpSync(resolve(extRoot, "manifest.json"), resolve(outDir, "manifest.json"));

  mkdirSync(resolve(outDir, "popup"), { recursive: true });
  cpSync(resolve(extRoot, "src/popup/popup.html"), resolve(outDir, "popup/popup.html"));
  cpSync(resolve(extRoot, "src/popup/popup.css"), resolve(outDir, "popup/popup.css"));

  const sharedAlias = {
    "@shared": resolve(root, "src/shared"),
  };

  await build({
    entryPoints: [resolve(extRoot, "src/background/index.ts")],
    outfile: resolve(outDir, "background.js"),
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "chrome109",
    alias: sharedAlias,
    logLevel: "info",
  });

  await build({
    entryPoints: [resolve(extRoot, "src/content/index.ts")],
    outfile: resolve(outDir, "content.js"),
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "chrome109",
    alias: sharedAlias,
    logLevel: "info",
  });

  await build({
    entryPoints: [resolve(root, "src/shared/extension/api-intercept-page.ts")],
    outfile: resolve(outDir, "api-intercept-page.js"),
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "chrome109",
    logLevel: "info",
  });

  await build({
    entryPoints: [resolve(extRoot, "src/popup/popup.ts")],
    outfile: resolve(outDir, "popup/popup.js"),
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "chrome109",
    alias: sharedAlias,
    logLevel: "info",
  });

  console.log(`\nEasySubmit extension built → ${outDir}`);
  console.log("Load unpacked in Chrome: chrome://extensions → dist/extension");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
