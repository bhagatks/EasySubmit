import {
  isJobReviewStudioContext,
  isJobReviewStudioRoute,
} from "@/lib/job-tracker/review-screen-ui";

/** Resume Studio profile editor — treated as a detail screen for header auth controls. */
export function isDashboardDetailScreen(
  pathname: string,
  fromParam?: string | null,
): boolean {
  if (pathname.startsWith("/dashboard/resume-profiles/") && pathname.endsWith("/edit")) {
    return true;
  }
  if (isJobReviewStudioContext(pathname, fromParam ?? null)) {
    return true;
  }
  return false;
}

/** Full-page job resume Studio launched from Review Screen — no dashboard sidebar. */
export function isJobReviewStudioScreen(
  pathname: string,
  fromParam?: string | null,
): boolean {
  return isJobReviewStudioContext(pathname, fromParam ?? null);
}

export { isJobReviewStudioRoute };

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
