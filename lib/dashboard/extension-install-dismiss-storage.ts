export const EXTENSION_INSTALL_DISMISS_SESSION_KEY =
  "easysubmit-extension-install-dismiss-v1";

export function isExtensionInstallDismissed(
  storage: Pick<Storage, "getItem">,
): boolean {
  return storage.getItem(EXTENSION_INSTALL_DISMISS_SESSION_KEY) === "1";
}

export function dismissExtensionInstallForSession(
  storage: Pick<Storage, "setItem">,
): void {
  storage.setItem(EXTENSION_INSTALL_DISMISS_SESSION_KEY, "1");
}

export function clearExtensionInstallDismiss(
  storage: Pick<Storage, "removeItem">,
): void {
  storage.removeItem(EXTENSION_INSTALL_DISMISS_SESSION_KEY);
}
