import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  resolveScreenIdFromPath,
  sanitizeQueryKeys,
} from "@/src/shared/observability/resolve-screen-from-path";
import { logScreenView } from "@/src/shared/observability/screen-diagnostics";

describe("resolveScreenIdFromPath", () => {
  it("maps public routes", () => {
    expect(resolveScreenIdFromPath("/")).toBe("marketing_landing");
    expect(resolveScreenIdFromPath("/pricing")).toBe("pricing");
    expect(resolveScreenIdFromPath("/login")).toBe("login");
    expect(resolveScreenIdFromPath("/extension")).toBe("extension_landing");
    expect(resolveScreenIdFromPath("/extension/bridge")).toBe("extension_bridge");
  });

  it("maps dashboard routes with specificity", () => {
    expect(resolveScreenIdFromPath("/dashboard")).toBe("dashboard_overview");
    expect(resolveScreenIdFromPath("/dashboard/job-tracker")).toBe("job_tracker");
    expect(resolveScreenIdFromPath("/dashboard/resume-profiles")).toBe("resume_profiles_list");
    expect(resolveScreenIdFromPath("/dashboard/resume-profiles/new")).toBe("resume_profile_new");
    expect(resolveScreenIdFromPath("/dashboard/resume-profiles/abc/edit")).toBe("resume_studio");
    expect(resolveScreenIdFromPath("/dashboard/job-tracker/job1/resume")).toBe("job_review_studio");
    expect(resolveScreenIdFromPath("/dashboard/settings")).toBe("settings");
    expect(resolveScreenIdFromPath("/dashboard/keys")).toBe("settings");
  });

  it("maps onboarding", () => {
    expect(resolveScreenIdFromPath("/onboarding")).toBe("onboarding_workbench");
    expect(resolveScreenIdFromPath("/onboarding/step-4")).toBe("onboarding_step4_legacy");
  });

  it("returns unknown for unmatched paths", () => {
    expect(resolveScreenIdFromPath("/api/foo")).toBe("unknown");
  });
});

describe("sanitizeQueryKeys", () => {
  it("returns param names without values", () => {
    expect(sanitizeQueryKeys("?setup=1&panel=resume")).toEqual(["setup", "panel"]);
    expect(sanitizeQueryKeys("")).toEqual([]);
  });
});

describe("logScreenView", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits high, low, and light lines for a screen visit", () => {
    logScreenView({
      screenId: "marketing_landing",
      route: "/",
      flags: { queryKeys: null },
    });

    const calls = vi.mocked(console.log).mock.calls.filter(
      (call) => call[0] === "[ScreenDiag]",
    );
    expect(calls).toHaveLength(3);

    const levels = calls.map((call) => (call[1] as { level: string }).level);
    expect(levels).toEqual(["high", "low", "light"]);

    const events = calls.map((call) => (call[1] as { event: string }).event);
    expect(events).toEqual(["screen.enter", "screen.ready", "screen.context"]);
  });
});
