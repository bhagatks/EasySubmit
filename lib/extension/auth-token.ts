import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_VERSION = "v1";
const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type ExtensionTokenPayload = {
  userId: string;
  exp: number;
  v: typeof TOKEN_VERSION;
};

function getExtensionSecret(): string {
  const secret = process.env.EXTENSION_TOKEN_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("EXTENSION_TOKEN_SECRET or NEXTAUTH_SECRET is required for extension tokens");
  }
  return secret;
}

function signBody(body: string): string {
  return createHmac("sha256", getExtensionSecret()).update(body).digest("base64url");
}

/** Issue a bearer token for the Chrome extension (after web login). */
export function createExtensionToken(userId: string, ttlMs = DEFAULT_TTL_MS): string {
  const payload: ExtensionTokenPayload = {
    userId,
    exp: Date.now() + ttlMs,
    v: TOKEN_VERSION,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = signBody(body);
  return `${body}.${sig}`;
}

/** Verify bearer token; returns userId or null. */
export function verifyExtensionToken(token: string | null | undefined): string | null {
  if (!token?.includes(".")) return null;

  const [body, sig] = token.split(".", 2);
  if (!body || !sig) return null;

  const expected = signBody(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as ExtensionTokenPayload;

    if (payload.v !== TOKEN_VERSION || typeof payload.userId !== "string") return null;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;

    return payload.userId;
  } catch {
    return null;
  }
}

export function readBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length).trim() || null;
}
