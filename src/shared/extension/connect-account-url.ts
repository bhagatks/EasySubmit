export function buildExtensionBridgePath(extensionId: string): string {
  return `/extension/bridge?extensionId=${encodeURIComponent(extensionId)}`;
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
