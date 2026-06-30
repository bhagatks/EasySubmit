import { describe, expect, it } from "vitest";
import {
  countOverviewPipeline,
  countOverviewWaitingJobs,
  formatOverviewTimeAgo,
  getTimeOfDayGreeting,
  overviewQueueCta,
  rankOverviewActionQueue,
  readAtsScoreFromEnhanceMeta,
  weeklyProgressBarPercent,
} from "@/lib/dashboard/overview-stats";
import type { OverviewActionQueueItem } from "@/lib/dashboard/overview-stats";

function queueItem(
  partial: Partial<OverviewActionQueueItem> & Pick<OverviewActionQueueItem, "id" | "status" | "savedAt">,
): OverviewActionQueueItem {
  return {
    title: "Engineer",
    company: "Acme",
    location: null,
    salaryText: null,
    platform: null,
    canonicalUrl: "https://example.com/job",
    appliedAt: null,
    atsScore: null,
    ...partial,
  };
}

describe("overview-stats", () => {
  it("formats relative time", () => {
    const now = Date.parse("2026-06-29T15:00:00.000Z");
    expect(formatOverviewTimeAgo("2026-06-29T13:00:00.000Z", now)).toBe("2h ago");
    expect(formatOverviewTimeAgo("2026-06-28T15:00:00.000Z", now)).toBe("1d ago");
  });

  it("reads ATS score from enhance meta", () => {
    expect(readAtsScoreFromEnhanceMeta({ readinessDelta: { before: 70, after: 88 } })).toBe(88);
    expect(readAtsScoreFromEnhanceMeta({})).toBeNull();
  });

  it("counts pipeline and waiting jobs", () => {
    const counts = {
      CAPTURED: 3,
      RESUME_READY: 2,
      READY_TO_APPLY: 1,
      APPLIED: 4,
    };
    expect(countOverviewPipeline(counts)).toEqual({
      captured: 3,
      resumePrepared: 2,
      autoSuggestReady: 1,
      applied: 4,
    });
    expect(countOverviewWaitingJobs(counts)).toBe(6);
  });

  it("ranks queue by ATS score then recency", () => {
    const ranked = rankOverviewActionQueue([
      queueItem({ id: "a", status: "CAPTURED", savedAt: "2026-06-29T10:00:00.000Z", atsScore: 60 }),
      queueItem({ id: "b", status: "RESUME_READY", savedAt: "2026-06-28T10:00:00.000Z", atsScore: 90 }),
      queueItem({ id: "c", status: "READY_TO_APPLY", savedAt: "2026-06-29T12:00:00.000Z", atsScore: 90 }),
      queueItem({ id: "d", status: "APPLIED", savedAt: "2026-06-29T13:00:00.000Z", atsScore: 99 }),
    ]);

    expect(ranked.map((entry) => entry.id)).toEqual(["c", "b", "a"]);
  });

  it("maps queue CTAs by stage", () => {
    expect(overviewQueueCta("READY_TO_APPLY")).toEqual({ label: "Apply now", purpose: "primary" });
    expect(overviewQueueCta("RESUME_READY").label).toBe("Review resume");
    expect(overviewQueueCta("CAPTURED").label).toBe("Prep resume");
  });

  it("picks greeting by time of day", () => {
    expect(getTimeOfDayGreeting(new Date("2026-06-29T09:00:00"))).toBe("Good morning");
    expect(getTimeOfDayGreeting(new Date("2026-06-29T14:00:00"))).toBe("Good afternoon");
    expect(getTimeOfDayGreeting(new Date("2026-06-29T19:00:00"))).toBe("Good evening");
  });

  it("computes weekly bar percent", () => {
    expect(weeklyProgressBarPercent(4, 10)).toBe(40);
    expect(weeklyProgressBarPercent(0, 0)).toBe(0);
  });
});
