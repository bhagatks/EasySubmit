#!/usr/bin/env node
/**
 * Dev + prod extension builds for `run easy` (step 5).
 * - dist/extension-dev/ → localhost:3000 (main Chrome profile)
 * - dist/extension/     → www.easysubmit.ai (store-ready; separate profile for prod QA)
 */
import { cpSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  EXTENSION_DEV_OUT_DIR,
  EXTENSION_PROD_OUT_DIR,
  EXTENSION_ROOT,
  buildExtension,
} from "./build-extension.mjs";
import { generateExtensionIcons } from "./generate-extension-icons.mjs";

async function main() {
  console.log("→ Extension builds: dev + prod (isolated output folders)\n");

  const devIconsDir = resolve(EXTENSION_ROOT, EXTENSION_DEV_OUT_DIR, "icons");
  const prodIconsDir = resolve(EXTENSION_ROOT, EXTENSION_PROD_OUT_DIR, "icons");

  await generateExtensionIcons(devIconsDir);
  mkdirSync(prodIconsDir, { recursive: true });
  cpSync(devIconsDir, prodIconsDir, { recursive: true });

  await buildExtension({
    outDir: EXTENSION_DEV_OUT_DIR,
    storeBuild: false,
    skipIcons: true,
    label: "dev",
  });

  await buildExtension({
    outDir: EXTENSION_PROD_OUT_DIR,
    storeBuild: true,
    appUrl: "https://www.easysubmit.ai",
    analyticsEnv: "prod",
    skipIcons: true,
    label: "prod",
  });

  console.log("\n✔ Extensions ready");
  console.log(`   Dev:  chrome://extensions → Load unpacked → ${EXTENSION_DEV_OUT_DIR}/`);
  console.log("         API base http://localhost:3000");
  console.log(`   Prod: separate Chrome profile → Load unpacked → ${EXTENSION_PROD_OUT_DIR}/`);
  console.log("         API base https://www.easysubmit.ai");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
