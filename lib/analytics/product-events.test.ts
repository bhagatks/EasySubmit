import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const captureMock = vi.fn();

vi.mock("@/src/shared/analytics/browser", () => ({
  captureAnalyticsEvent: (...args: unknown[]) => captureMock(...args),
}));

describe("product action events", () => {
  beforeEach(() => {
    captureMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("trackPlanSelected emits plan_selected", async () => {
    const { trackPlanSelected } = await import("@/src/shared/analytics/product-events");
    trackPlanSelected({ planId: "free", surface: "select_plan" });
    expect(captureMock).toHaveBeenCalledWith("plan_selected", {
      plan_id: "free",
      surface: "select_plan",
    });
  });

  it("trackResumeExported emits resume_exported", async () => {
    const { trackResumeExported } = await import("@/src/shared/analytics/product-events");
    trackResumeExported({ surface: "review_resume", format: "pdf", entryId: "job-1" });
    expect(captureMock).toHaveBeenCalledWith("resume_exported", {
      surface: "review_resume",
      format: "pdf",
      entry_id: "job-1",
    });
  });

  it("trackStudioTabChanged emits studio_tab_changed", async () => {
    const { trackStudioTabChanged } = await import("@/src/shared/analytics/product-events");
    trackStudioTabChanged({ surface: "dashboard_studio", tab: "layout" });
    expect(captureMock).toHaveBeenCalledWith("studio_tab_changed", {
      surface: "dashboard_studio",
      tab: "layout",
    });
  });
});
