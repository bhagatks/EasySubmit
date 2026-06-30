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
  if (pathname === "/dashboard/testing-resume") {
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

/** Legacy route — redirects to Settings. */
export function isDashboardKeysScreen(pathname: string): boolean {
  return pathname.startsWith("/dashboard/keys");
}

/** BYOK management is on-screen in Settings (or active badge when vaulted). */
export function dashboardScreenHasByokUi(
  pathname: string,
  vaultKeyId?: string | null,
): boolean {
  return Boolean(vaultKeyId) || isDashboardSettingsScreen(pathname);
}

export function shouldShowDashboardSignOut(pathname: string): boolean {
  return isDashboardSettingsScreen(pathname);
}

export function shouldShowDashboardProfileMenu(
  pathname: string,
  fromParam?: string | null,
): boolean {
  if (isDashboardSettingsScreen(pathname)) {
    return false;
  }
  if (isDashboardDetailScreen(pathname, fromParam)) {
    return false;
  }
  return true;
}

function isOverview(pathname: string): boolean {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard?");
}

export function shouldShowDashboardExtensionBadge(pathname: string): boolean {
  return !isOverview(pathname);
}

export function shouldShowDashboardOpenJobTracker(pathname: string): boolean {
  return !isOverview(pathname) && !pathname.startsWith("/dashboard/job-tracker");
}

export function shouldShowDashboardByokKeyButton(
  pathname: string,
  vaultKeyId?: string | null,
): boolean {
  return !dashboardScreenHasByokUi(pathname, vaultKeyId);
}

/** Workspace header label — detail screens override the generic "Dashboard" label. */
export function getDashboardHeaderLabel(pathname: string, isStudioEdit: boolean): string {
  if (isStudioEdit) {
    return "Resume Studio";
  }
  if (pathname.startsWith("/dashboard/help")) {
    return "Help Center";
  }
  if (pathname.startsWith("/dashboard/about")) {
    return "About";
  }
  if (pathname.startsWith("/dashboard/extension")) {
    return "Extension";
  }
  if (pathname.startsWith("/dashboard/tutorials")) {
    return "Video Tutorials";
  }
  if (pathname.startsWith("/dashboard/ats-guidelines")) {
    return "ATS Guidelines";
  }
  if (pathname.startsWith("/dashboard/settings") || pathname.startsWith("/dashboard/keys")) {
    return "Settings";
  }
  if (pathname.startsWith("/dashboard/resume-profiles")) {
    return "Resume profiles";
  }
  if (pathname.startsWith("/dashboard/job-tracker")) {
    return "Job Tracker";
  }
  if (pathname.startsWith("/dashboard/ats-scores")) {
    return "ATS Scores";
  }
  if (pathname === "/dashboard") {
    return "Overview";
  }
  return "Dashboard";
}
