/** Show Chrome Web Store / install CTAs only when the dashboard ping confirms no extension. */
export function shouldShowExtensionInstallCta(
  extensionConnected: boolean | null,
): extensionConnected is false {
  return extensionConnected === false;
}
