export function isExtensionContextInvalidatedMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("extension context invalidated") ||
    normalized.includes("could not establish connection") ||
    normalized.includes("receiving end does not exist")
  );
}

export function isExtensionContextInvalidatedError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof Error) {
    return isExtensionContextInvalidatedMessage(error.message);
  }
  return isExtensionContextInvalidatedMessage(String(error));
}

export function isChromeExtensionContextValid(): boolean {
  try {
    return Boolean(chrome.runtime?.id);
  } catch {
    return false;
  }
}
