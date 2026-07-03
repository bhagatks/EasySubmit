export const DASHBOARD_EXTENSION_WELCOME_QUERY = "welcome=1" as const;

export const DASHBOARD_SETUP_QUERY = "setup=1" as const;

export const DASHBOARD_EXTENSION_HREF = "/dashboard/extension";

/** Auth handoff page — lives outside dashboard layout (no sidebar chrome). */
export const EXTENSION_BRIDGE_HREF = "/extension/bridge";

export function extensionBridgeHref(extensionId?: string | null): string {
  const id = extensionId?.trim();
  if (!id) return EXTENSION_BRIDGE_HREF;
  return `${EXTENSION_BRIDGE_HREF}?extensionId=${encodeURIComponent(id)}`;
}

export const DASHBOARD_EXTENSION_WELCOME_HREF =
  `${DASHBOARD_EXTENSION_HREF}?${DASHBOARD_EXTENSION_WELCOME_QUERY}` as const;

export const DASHBOARD_SETUP_HREF = `/dashboard?${DASHBOARD_SETUP_QUERY}` as const;

export function dashboardExtensionWelcomeHref(apiBaseUrl: string): string {
  const base = apiBaseUrl.replace(/\/$/, "");
  return `${base}${DASHBOARD_EXTENSION_WELCOME_HREF}`;
}

export function dashboardSetupHref(apiBaseUrl: string): string {
  const base = apiBaseUrl.replace(/\/$/, "");
  return `${base}${DASHBOARD_SETUP_HREF}`;
}
