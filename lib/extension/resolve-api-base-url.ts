/**
 * API base URL for the Chrome extension.
 * Prefer the request origin from `/api/extension/config` so local dev saves hit the
 * same host as the dashboard even when NEXT_PUBLIC_APP_URL points elsewhere.
 */
export function resolveExtensionApiBaseUrl(requestOrigin?: string | null): string {
  const fromRequest = requestOrigin?.trim();
  if (fromRequest && /^https?:\/\//i.test(fromRequest)) {
    return fromRequest.replace(/\/$/, "");
  }

  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000";

  return fromEnv.replace(/\/$/, "");
}
