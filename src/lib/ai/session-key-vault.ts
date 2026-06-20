/**
 * Session-scoped BYOK vault — API keys never touch localStorage.
 * Uses AES-GCM with a per-tab vault key stored in sessionStorage.
 */

const VAULT_KEY_STORAGE = "easysubmit-ignition-vault-key";
const API_KEY_CIPHER_STORAGE = "easysubmit-ignition-api-key-cipher";

function hasWebCrypto(): boolean {
  return typeof window !== "undefined" && Boolean(window.crypto?.subtle);
}

function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]!);
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function encodePayload(payload: { iv: string; cipher: string }): string {
  return `v1:${payload.iv}:${payload.cipher}`;
}

function decodePayload(encoded: string): { iv: string; cipher: string } | null {
  const parts = encoded.split(":");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  return { iv: parts[1]!, cipher: parts[2]! };
}

/** Fallback obfuscation when Web Crypto is unavailable (tests / legacy). */
function obfuscateFallback(plain: string): string {
  return `fb:${toBase64(new TextEncoder().encode(plain))}`;
}

function deobfuscateFallback(encoded: string): string | null {
  if (!encoded.startsWith("fb:")) return null;
  try {
    return new TextDecoder().decode(fromBase64(encoded.slice(3)));
  } catch {
    return null;
  }
}

function toCryptoBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(bytes);
}

async function getOrCreateVaultKey(): Promise<CryptoKey | null> {
  if (!hasWebCrypto()) return null;

  const existing = sessionStorage.getItem(VAULT_KEY_STORAGE);
  if (existing) {
    const raw = toCryptoBytes(fromBase64(existing));
    return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
  }

  const raw = crypto.getRandomValues(new Uint8Array(32));
  sessionStorage.setItem(VAULT_KEY_STORAGE, toBase64(raw));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptSessionApiKey(plainKey: string): Promise<string> {
  const trimmed = plainKey.trim();
  if (!trimmed) return "";

  const vaultKey = await getOrCreateVaultKey();
  if (!vaultKey) {
    return obfuscateFallback(trimmed);
  }

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    vaultKey,
    new TextEncoder().encode(trimmed),
  );

  return encodePayload({
    iv: toBase64(iv),
    cipher: toBase64(new Uint8Array(cipherBuffer)),
  });
}

export async function decryptSessionApiKey(encoded: string): Promise<string | null> {
  if (!encoded) return null;

  if (encoded.startsWith("fb:")) {
    return deobfuscateFallback(encoded);
  }

  const payload = decodePayload(encoded);
  if (!payload || !hasWebCrypto()) return null;

  try {
    const vaultKey = await getOrCreateVaultKey();
    if (!vaultKey) return null;

    const plainBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: toCryptoBytes(fromBase64(payload.iv)) },
      vaultKey,
      toCryptoBytes(fromBase64(payload.cipher)),
    );

    return new TextDecoder().decode(plainBuffer);
  } catch {
    return null;
  }
}

export function readSessionApiKeyCipher(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(API_KEY_CIPHER_STORAGE) ?? "";
}

export function writeSessionApiKeyCipher(cipher: string): void {
  if (typeof window === "undefined") return;
  if (!cipher) {
    sessionStorage.removeItem(API_KEY_CIPHER_STORAGE);
    return;
  }
  sessionStorage.setItem(API_KEY_CIPHER_STORAGE, cipher);
}

export function clearSessionApiKeyVault(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(API_KEY_CIPHER_STORAGE);
  sessionStorage.removeItem(VAULT_KEY_STORAGE);
}

export async function getDecryptedSessionApiKey(
  encryptedFromState?: string,
): Promise<string | null> {
  const cipher = encryptedFromState || readSessionApiKeyCipher();
  if (!cipher) return null;
  return decryptSessionApiKey(cipher);
}
