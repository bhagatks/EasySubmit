/** Allow only same-site relative paths (no open redirects). */
export function resolveSafeCallbackUrl(
  callbackUrl: string | null | undefined,
  fallback = "/onboarding",
): string {
  if (!callbackUrl) return fallback;

  const trimmed = callbackUrl.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  return trimmed;
}
