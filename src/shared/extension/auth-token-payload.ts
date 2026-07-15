export type ExtensionTokenPayloadView = {
  userId: string;
  exp: number;
  v: string;
};

function decodeBase64Url(body: string): string {
  const padded = body + "=".repeat((4 - (body.length % 4)) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");

  if (typeof globalThis.atob === "function") {
    const binary = globalThis.atob(base64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  return Buffer.from(base64, "base64").toString("utf8");
}

/** Decode extension token payload without signature verification (sync only). */
export function decodeExtensionTokenPayload(token: string): ExtensionTokenPayloadView | null {
  const dot = token.indexOf(".");
  if (dot <= 0) return null;

  try {
    const payload = JSON.parse(decodeBase64Url(token.slice(0, dot))) as ExtensionTokenPayloadView;
    if (typeof payload.userId !== "string" || payload.userId.length === 0) return null;
    return payload;
  } catch {
    return null;
  }
}

export function readExtensionTokenUserId(token: string | null | undefined): string | null {
  if (!token) return null;
  return decodeExtensionTokenPayload(token)?.userId ?? null;
}
