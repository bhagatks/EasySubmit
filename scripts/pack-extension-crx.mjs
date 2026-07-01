/**
 * Pack dist/extension as a signed CRX3 (+ zip) for Chrome Web Store Verified CRX uploads.
 *
 * Key resolution (first match):
 *   1. CHROME_CRX_PRIVATE_KEY env (PEM text — used in CI from GitHub secret)
 *   2. CHROME_CRX_PRIVATE_KEY_PATH env
 *   3. easysubmit_private.pem at repo root (local dev)
 */
import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import crx3 from "crx3";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const extensionDir = resolve(root, "dist/extension");
const crxOut = resolve(root, "easysubmit-extension.crx");
const zipOut = resolve(root, "easysubmit-extension.zip");
const defaultKeyPath = resolve(root, "easysubmit_private.pem");

function resolvePrivateKeyPath() {
  const inline = process.env.CHROME_CRX_PRIVATE_KEY?.trim();
  if (inline) {
    const dir = mkdtempSync(join(tmpdir(), "easysubmit-crx-key-"));
    const path = join(dir, "private.pem");
    writeFileSync(path, inline.endsWith("\n") ? inline : `${inline}\n`, { mode: 0o600 });
    return { path, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
  }

  const configured = process.env.CHROME_CRX_PRIVATE_KEY_PATH?.trim();
  if (configured) {
    if (!existsSync(configured)) {
      throw new Error(`CHROME_CRX_PRIVATE_KEY_PATH not found: ${configured}`);
    }
    return { path: configured, cleanup: () => {} };
  }

  if (existsSync(defaultKeyPath)) {
    return { path: defaultKeyPath, cleanup: () => {} };
  }

  throw new Error(
    "CRX private key missing. Set CHROME_CRX_PRIVATE_KEY (CI) or add easysubmit_private.pem at repo root.",
  );
}

function toPkcs8Pem(keyPath) {
  const pem = readFileSync(keyPath, "utf8");
  if (pem.includes("BEGIN PRIVATE KEY")) {
    return { path: keyPath, cleanup: () => {} };
  }
  if (!pem.includes("BEGIN RSA PRIVATE KEY")) {
    throw new Error(`Unsupported private key format in ${keyPath}`);
  }

  const dir = mkdtempSync(join(tmpdir(), "easysubmit-crx-pkcs8-"));
  const pkcs8Path = join(dir, "private_pkcs8.pem");
  execSync(
    `openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in "${keyPath}" -out "${pkcs8Path}"`,
    { stdio: "pipe" },
  );
  return { path: pkcs8Path, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

async function main() {
  if (!existsSync(join(extensionDir, "manifest.json"))) {
    throw new Error(`Extension build missing at ${extensionDir}. Run npm run build:extension:store first.`);
  }

  console.log("→ pack-extension-crx start");
  const key = resolvePrivateKeyPath();
  const pkcs8 = toPkcs8Pem(key.path);

  try {
    await crx3([join(extensionDir, "manifest.json")], {
      keyPath: pkcs8.path,
      crxPath: crxOut,
      zipPath: zipOut,
    });
    console.log(`→ CRX  ${crxOut}`);
    console.log(`→ ZIP  ${zipOut}`);
    console.log("→ pack-extension-crx done");
  } finally {
    pkcs8.cleanup();
    key.cleanup();
  }
}

main().catch((err) => {
  console.error("→ pack-extension-crx fail:", err instanceof Error ? err.message : err);
  process.exit(1);
});
