#!/usr/bin/env node
/**
 * Dev + prod-QA extension builds for `run easy` (step 5).
 * - dist/extension/      → main Chrome profile + localhost
 * - dist/extension-prod/ → separate Chrome profile + www.easysubmit.ai
 *
 * Does not touch .env.local or pull Vercel prod secrets.
 */
import {
  EXTENSION_DEV_OUT_DIR,
  EXTENSION_PROD_QA_OUT_DIR,
  buildExtension,
} from "./build-extension.mjs";
import { generateExtensionIcons } from "./generate-extension-icons.mjs";

async function main() {
  console.log("→ Extension builds: dev + prod QA (isolated output folders)\n");

  await generateExtensionIcons();

  await buildExtension({
    outDir: EXTENSION_DEV_OUT_DIR,
    storeBuild: false,
    skipIcons: true,
    label: "dev",
  });

  await buildExtension({
    outDir: EXTENSION_PROD_QA_OUT_DIR,
    storeBuild: true,
    appUrl: "https://www.easysubmit.ai",
    analyticsEnv: "prod",
    skipIcons: true,
    label: "prod-qa",
  });

  console.log("\n✔ Extensions ready");
  console.log(`   Dev:     chrome://extensions → Load unpacked → ${EXTENSION_DEV_OUT_DIR}/`);
  console.log("            Use your main Chrome profile + http://localhost:3000");
  console.log(`   Prod QA: separate Chrome profile → Load unpacked → ${EXTENSION_PROD_QA_OUT_DIR}/`);
  console.log("            Connect on https://www.easysubmit.ai/extension/bridge");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
