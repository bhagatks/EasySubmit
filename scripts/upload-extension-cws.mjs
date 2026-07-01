/**
 * Upload easysubmit-extension.crx to Chrome Web Store (Verified CRX listings).
 *
 * Required env:
 *   CHROME_EXTENSION_ID, CHROME_CLIENT_ID, CHROME_CLIENT_SECRET, CHROME_REFRESH_TOKEN
 *
 * Optional:
 *   CWS_PACKAGE_PATH (default: easysubmit-extension.crx at repo root)
 *   CWS_PUBLISH=true|false (default true)
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import chromeWebstoreUpload from "chrome-webstore-upload";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packagePath = resolve(root, process.env.CWS_PACKAGE_PATH?.trim() || "easysubmit-extension.crx");
const publish = (process.env.CWS_PUBLISH ?? "true").toLowerCase() !== "false";

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing env ${name}`);
  }
  return value;
}

async function main() {
  if (!existsSync(packagePath)) {
    throw new Error(`Package not found: ${packagePath}. Run scripts/pack-extension-crx.mjs first.`);
  }

  const extensionId = requireEnv("CHROME_EXTENSION_ID");
  const clientId = requireEnv("CHROME_CLIENT_ID");
  const clientSecret = requireEnv("CHROME_CLIENT_SECRET");
  const refreshToken = requireEnv("CHROME_REFRESH_TOKEN");
  const fileName = packagePath.split("/").pop() ?? "easysubmit-extension.crx";

  console.log("→ upload-extension-cws start");
  console.log(`   extensionId=${extensionId}`);
  console.log(`   package=${packagePath}`);

  const store = chromeWebstoreUpload({
    extensionId,
    clientId,
    clientSecret,
    refreshToken,
  });

  const packageBuffer = readFileSync(packagePath);
  const upload = await store.uploadExisting(packageBuffer, {
    uploadHeaders: {
      "X-Goog-Upload-Protocol": "raw",
      "X-Goog-Upload-File-Name": fileName,
    },
  });

  console.log(`→ uploaded itemVersion=${upload.itemVersion ?? "unknown"}`);

  if (publish) {
    await store.publish();
    console.log("→ published to Chrome Web Store");
  } else {
    console.log("→ upload only (CWS_PUBLISH=false)");
  }

  console.log("→ upload-extension-cws done");
}

main().catch((err) => {
  console.error("→ upload-extension-cws fail:", err instanceof Error ? err.message : err);
  process.exit(1);
});
