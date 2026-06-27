export const SETTINGS_AI_AUTO_QUERY = "aiSource=auto" as const;

export const SETTINGS_AI_AUTO_HREF = `/dashboard/settings?${SETTINGS_AI_AUTO_QUERY}`;

export const SETTINGS_ADD_KEY_QUERY = "addKey=1" as const;

export const SETTINGS_ADD_KEY_HREF = `/dashboard/settings?${SETTINGS_ADD_KEY_QUERY}`;

export const SETTINGS_KEYS_HREF = "/dashboard/settings";

export function dashboardSettingsAiAutoHref(apiBaseUrl: string): string {
  const base = apiBaseUrl.replace(/\/$/, "");
  return `${base}${SETTINGS_AI_AUTO_HREF}`;
}

export function dashboardSettingsAddKeyHref(apiBaseUrl: string): string {
  const base = apiBaseUrl.replace(/\/$/, "");
  return `${base}${SETTINGS_ADD_KEY_HREF}`;
}
