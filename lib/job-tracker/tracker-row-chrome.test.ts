import { describe, expect, it } from "vitest";
import { resolveDashboardTrackerRowChrome } from "@/lib/job-tracker/tracker-row-chrome";
import { resolveJourneyDisplay } from "@/src/shared/journey-display";
import { TAILOR_STALL_MS } from "@/lib/job-tracker/tailor-stall";

const savedAt = "2026-06-30T02:54:49.805Z";

describe("resolveDashboardTrackerRowChrome", () => {
  it("keeps apply slots disabled while optimizing", () => {
    const chrome = resolveDashboardTrackerRowChrome({
      status: "CAPTURED",
      hasTailoredResume: false,
      savedAt,
      journey: resolveJourneyDisplay("CAPTURED", false),
      rowBusy: false,
      nowMs: Date.parse(savedAt) + 30_000,
    });

    expect(chrome.showSpinner).toBe(true);
    expect(chrome.showMarkApplied).toBe(true);
    expect(chrome.markAppliedDisabled).toBe(true);
    expect(chrome.applyDisabled).toBe(true);
    expect(chrome.showResumeStudio).toBe(true);
    expect(chrome.resumeStudioEnabled).toBe(false);
    expect(chrome.applyLabel).toBe("Apply assist");
  });

  it("surfaces retry optimize when tailor stalled", () => {
    const chrome = resolveDashboardTrackerRowChrome({
      status: "CAPTURED",
      hasTailoredResume: false,
      savedAt,
      journey: resolveJourneyDisplay("CAPTURED", false),
      rowBusy: false,
      nowMs: Date.parse(savedAt) + TAILOR_STALL_MS,
    });

    expect(chrome.showRetryOptimize).toBe(true);
    expect(chrome.applyDisabled).toBe(true);
  });

  it("enables apply assist on READY_TO_APPLY", () => {
    const chrome = resolveDashboardTrackerRowChrome({
      status: "READY_TO_APPLY",
      hasTailoredResume: true,
      savedAt,
      journey: resolveJourneyDisplay("READY_TO_APPLY", false),
      rowBusy: false,
    });

    expect(chrome.applyInteractive).toBe(true);
    expect(chrome.resumeStudioEnabled).toBe(true);
    expect(chrome.applyLabel).toBe("Apply assist");
  });
});
