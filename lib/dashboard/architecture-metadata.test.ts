import { describe, expect, it } from "vitest";
import {
  averageCalibrationScores,
  countApplicationsSent,
  parseArchitectureMetadata,
} from "@/lib/dashboard/architecture-metadata";
import {
  formatDashboardInteger,
  formatDashboardPercent,
  formatDashboardUsd,
} from "@/lib/dashboard/format-stats";

describe("architecture-metadata", () => {
  it("parses verification metrics from metadata", () => {
    const meta = parseArchitectureMetadata({
      metadata: {
        parseIntegrity: 100,
        keywordMatch: 96,
        recruiterReadability: 95,
      },
    });

    expect(meta.parseIntegrity).toBe(100);
    expect(meta.keywordMatch).toBe(96);
    expect(meta.recruiterReadability).toBe(95);
  });

  it("parses applications and counts sent rows", () => {
    const meta = parseArchitectureMetadata({
      applications: [
        { role: "PM", company: "Linear", status: "Applied", score: 98 },
        { role: "Designer", company: "Raycast", status: "Draft", score: 91 },
      ],
    });

    expect(meta.applications).toHaveLength(2);
    expect(countApplicationsSent(meta.applications ?? [])).toBe(1);
  });

  it("averages column and JSONB calibration scores", () => {
    const avg = averageCalibrationScores(92, {
      calibrationScores: [88, 96],
    });
    expect(avg).toBe(92);
  });
});

describe("format-stats", () => {
  it("formats integers and USD for mono display", () => {
    expect(formatDashboardInteger(1284)).toBe("1,284");
    expect(formatDashboardUsd(2.41)).toBe("$2.41");
    expect(formatDashboardPercent(null)).toBe("—");
    expect(formatDashboardPercent(96)).toBe("96");
  });
});
