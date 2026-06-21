import { describe, expect, it } from "vitest";
import {
  getTodayPacificDateString,
  nextPacificMidnight,
} from "@/src/lib/ai/engine/pacific-time";

describe("pacific-time", () => {
  it("formats YYYY-MM-DD in America/Los_Angeles", () => {
    const formatted = getTodayPacificDateString(new Date("2026-06-20T12:00:00Z"));
    expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns a future instant for nextPacificMidnight", () => {
    const from = new Date("2026-06-20T12:00:00Z");
    const next = nextPacificMidnight(from);
    expect(next.getTime()).toBeGreaterThan(from.getTime());
    expect(getTodayPacificDateString(next)).not.toBe(getTodayPacificDateString(from));
  });
});
