/** Resume Studio profile editor — treated as a detail screen for header auth controls. */
export function isDashboardDetailScreen(pathname: string): boolean {
  return (
    pathname.startsWith("/dashboard/resume-profiles/") && pathname.endsWith("/edit")
  );
}

export function isDashboardSettingsScreen(pathname: string): boolean {
  return pathname.startsWith("/dashboard/settings");
}

export function isDashboardKeysScreen(pathname: string): boolean {
  return pathname.startsWith("/dashboard/keys");
}

/** BYOK management is already on-screen (keys page, settings section, or active badge). */
export function dashboardScreenHasByokUi(
  pathname: string,
  vaultKeyId?: string | null,
): boolean {
  return (
    Boolean(vaultKeyId) ||
    isDashboardKeysScreen(pathname) ||
    isDashboardSettingsScreen(pathname)
  );
}

export function shouldShowDashboardSignOut(pathname: string): boolean {
  return isDashboardSettingsScreen(pathname);
}

export function shouldShowDashboardByokKeyButton(
  pathname: string,
  vaultKeyId?: string | null,
): boolean {
  return !dashboardScreenHasByokUi(pathname, vaultKeyId);
}
