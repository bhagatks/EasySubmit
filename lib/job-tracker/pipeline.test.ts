import { describe, expect, it } from "vitest";
import type { JobTrackerSummary } from "@/lib/job-tracker/types";
import {
  groupEntriesForKanban,
  JOB_TRACKER_KANBAN_COLUMNS,
  JOB_TRACKER_PIPELINE_STATUSES,
  kanbanColumnStatusForEntry,
} from "@/lib/job-tracker/pipeline";

function summary(
  overrides: Partial<JobTrackerSummary> & Pick<JobTrackerSummary, "id" | "status">,
): JobTrackerSummary {
  return {
    id: overrides.id,
    title: overrides.title ?? "Engineer",
    company: overrides.company ?? "Acme",
    location: overrides.location ?? null,
    salaryText: overrides.salaryText ?? null,
    status: overrides.status,
    platform: overrides.platform ?? null,
    canonicalUrl: overrides.canonicalUrl ?? "https://example.com/jobs/1",
    savedAt: overrides.savedAt ?? "2026-06-21T12:00:00.000Z",
    appliedAt: overrides.appliedAt ?? null,
  };
}

describe("job tracker pipeline", () => {
  it("defines four primary Kanban columns in apply order", () => {
    expect(JOB_TRACKER_KANBAN_COLUMNS.map((col) => col.status)).toEqual([
      "CAPTURED",
      "RESUME_READY",
      "READY_TO_APPLY",
      "APPLIED",
    ]);
  });

  it("includes post-apply statuses in pipeline count", () => {
    expect(JOB_TRACKER_PIPELINE_STATUSES).toContain("INTERVIEW");
    expect(JOB_TRACKER_PIPELINE_STATUSES).not.toContain("ARCHIVED");
  });

  it("maps outcome statuses to the Applied column", () => {
    expect(kanbanColumnStatusForEntry("INTERVIEW")).toBe("APPLIED");
    expect(kanbanColumnStatusForEntry("READY_TO_APPLY")).toBe("READY_TO_APPLY");
  });

  it("groups entries into columns newest-first", () => {
    const groups = groupEntriesForKanban([
      summary({ id: "a", status: "CAPTURED", savedAt: "2026-06-20T12:00:00.000Z" }),
      summary({ id: "b", status: "CAPTURED", savedAt: "2026-06-21T12:00:00.000Z" }),
      summary({ id: "c", status: "INTERVIEW", savedAt: "2026-06-19T12:00:00.000Z" }),
    ]);

    const captured = groups.find((g) => g.column.status === "CAPTURED");
    const applied = groups.find((g) => g.column.status === "APPLIED");

    expect(captured?.entries.map((e) => e.id)).toEqual(["b", "a"]);
    expect(applied?.entries.map((e) => e.id)).toEqual(["c"]);
  });
});
