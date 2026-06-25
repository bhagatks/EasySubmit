export const SETTINGS_AI_AUTO_QUERY = "aiSource=auto" as const;

export const SETTINGS_AI_AUTO_HREF = `/dashboard/settings?${SETTINGS_AI_AUTO_QUERY}`;

export function dashboardSettingsAiAutoHref(apiBaseUrl: string): string {
  const base = apiBaseUrl.replace(/\/$/, "");
  return `${base}${SETTINGS_AI_AUTO_HREF}`;
}
