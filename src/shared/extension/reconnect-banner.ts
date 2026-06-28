export type ExtensionReconnectBanner = {
  message: string;
  ctaLabel: string;
};

export function isExtensionReconnectRequiredError(
  error: string | null | undefined,
  code?: string | null,
): boolean {
  if (code === "EXTENSION_RECONNECT_REQUIRED") return true;
  const text = error?.trim() ?? "";
  if (!text) return false;
  return /session is out of date|sign in again and reconnect/i.test(text);
}

/** Card-header banner when the extension bearer token no longer matches a live user row. */
export function resolveExtensionReconnectBanner(
  error: string | null | undefined,
  code?: string | null,
): ExtensionReconnectBanner | null {
  if (!isExtensionReconnectRequiredError(error, code)) return null;
  return {
    message: "Your extension session is out of date.",
    ctaLabel: "Reconnect",
  };
}

export function shouldHideSaveErrorForReconnectBanner(
  banner: ExtensionReconnectBanner | null,
  saveError: string | null | undefined,
): boolean {
  if (!banner || !saveError?.trim()) return false;
  return isExtensionReconnectRequiredError(saveError);
}
