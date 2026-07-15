export function buildExtensionBridgePath(extensionId: string): string {
  return `/extension/bridge?extensionId=${encodeURIComponent(extensionId)}`;
}

export const EXTENSION_BRIDGE_PATH = "/extension/bridge";

/** Login handoff for extension popup / reconnect flows. */
export function buildExtensionLoginCallbackPath(): string {
  return `/login?callbackUrl=${encodeURIComponent(EXTENSION_BRIDGE_PATH)}`;
}

/** Sign-in first, then hand off the extension token on the bridge page. */
export function buildExtensionConnectUrl(apiBase: string, extensionId: string): string {
  const base = apiBase.replace(/\/$/, "");
  const bridgePath = buildExtensionBridgePath(extensionId);
  return `${base}/login?callbackUrl=${encodeURIComponent(bridgePath)}`;
}

/** Reconnect when the user may already be signed in on the dashboard. */
export function buildExtensionBridgeUrl(apiBase: string, extensionId: string): string {
  const base = apiBase.replace(/\/$/, "");
  return `${base}${buildExtensionBridgePath(extensionId)}`;
}
