import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const captureMock = vi.fn();

vi.mock("@/src/shared/analytics/browser", () => ({
  captureAnalyticsEvent: (...args: unknown[]) => captureMock(...args),
}));

describe("trackScreenView", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    captureMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits ScreenDiag console lines and PostHog screen_viewed", async () => {
    const { trackScreenView } = await import("@/src/shared/analytics/screen-events");

    trackScreenView({
      screenId: "dashboard_overview",
      route: "/dashboard",
      params: { hasQuery: false, queryKeyCount: 0 },
      flags: { queryKeys: null },
    });

    const diagCalls = vi.mocked(console.log).mock.calls.filter(
      (call) => call[0] === "[ScreenDiag]",
    );
    expect(diagCalls).toHaveLength(3);

    expect(captureMock).toHaveBeenCalledTimes(1);
    expect(captureMock).toHaveBeenCalledWith("screen_viewed", {
      screen_id: "dashboard_overview",
      screen_label: "Overview",
      zone: "dashboard",
      route: "/dashboard",
      hasQuery: false,
      queryKeyCount: 0,
      queryKeys: null,
    });
  });
});

describe("trackScreenOverlay", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    captureMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits ScreenDiag and PostHog for overlay screens", async () => {
    const { trackScreenOverlay } = await import("@/src/shared/analytics/screen-events");

    trackScreenOverlay("review_screen", {
      route: "/dashboard/job-tracker?job=abc",
      params: { entryId: "abc", panel: "resume" },
      flags: { tabChange: true },
    });

    const diagCalls = vi.mocked(console.log).mock.calls.filter(
      (call) => call[0] === "[ScreenDiag]",
    );
    expect(diagCalls).toHaveLength(3);

    expect(captureMock).toHaveBeenCalledWith("screen_viewed", {
      screen_id: "review_screen",
      screen_label: "Review Screen",
      zone: "overlay",
      route: "/dashboard/job-tracker?job=abc",
      entryId: "abc",
      panel: "resume",
      tabChange: true,
    });
  });
});
