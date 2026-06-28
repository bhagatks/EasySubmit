import type { ScreenId } from "@/src/shared/observability/screen-diagnostics-catalog";

type RouteMatcher = {
  screenId: ScreenId;
  test: (pathname: string) => boolean;
};

/** Order matters — first match wins (specific before general). */
const ROUTE_MATCHERS: RouteMatcher[] = [
  { screenId: "marketing_landing", test: (p) => p === "/" },
  { screenId: "pricing", test: (p) => p === "/pricing" },
  { screenId: "select_plan", test: (p) => p === "/select-plan" },
  { screenId: "extension_bridge", test: (p) => p === "/extension/bridge" },
  { screenId: "extension_landing", test: (p) => p === "/extension" },
  { screenId: "login", test: (p) => p === "/login" },
  { screenId: "signup_legacy", test: (p) => p.startsWith("/auth/signup") },
  { screenId: "terms", test: (p) => p === "/terms" },
  { screenId: "privacy", test: (p) => p === "/privacy" },
  { screenId: "onboarding_step4_legacy", test: (p) => p === "/onboarding/step-4" },
  { screenId: "onboarding_workbench", test: (p) => p.startsWith("/onboarding") },
  { screenId: "resume_profile_new", test: (p) => p === "/dashboard/resume-profiles/new" },
  {
    screenId: "resume_studio",
    test: (p) => p.startsWith("/dashboard/resume-profiles/") && p.endsWith("/edit"),
  },
  {
    screenId: "job_review_studio",
    test: (p) => /^\/dashboard\/job-tracker\/[^/]+\/resume$/.test(p),
  },
  { screenId: "resume_profiles_list", test: (p) => p === "/dashboard/resume-profiles" },
  { screenId: "job_tracker", test: (p) => p === "/dashboard/job-tracker" || p.startsWith("/dashboard/applications") },
  { screenId: "ats_scores", test: (p) => p === "/dashboard/ats-scores" },
  { screenId: "ats_guidelines", test: (p) => p === "/dashboard/ats-guidelines" },
  { screenId: "dashboard_extension", test: (p) => p === "/dashboard/extension" },
  { screenId: "video_tutorials", test: (p) => p === "/dashboard/tutorials" },
  { screenId: "settings", test: (p) => p.startsWith("/dashboard/settings") || p.startsWith("/dashboard/keys") },
  { screenId: "about", test: (p) => p === "/dashboard/about" },
  { screenId: "testing_resume", test: (p) => p === "/dashboard/testing-resume" },
  { screenId: "dashboard_overview", test: (p) => p === "/dashboard" },
];

export function resolveScreenIdFromPath(pathname: string): ScreenId {
  const normalized = pathname.split("?")[0]?.trim() || "/";
  for (const matcher of ROUTE_MATCHERS) {
    if (matcher.test(normalized)) {
      return matcher.screenId;
    }
  }
  return "unknown";
}

/** Query param keys only (no values) for light-tier logging. */
export function sanitizeQueryKeys(search: string): string[] {
  if (!search || search === "?") return [];
  const raw = search.startsWith("?") ? search.slice(1) : search;
  return raw
    .split("&")
    .map((part) => part.split("=")[0]?.trim())
    .filter(Boolean) as string[];
}
