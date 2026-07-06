import { describe, expect, it } from "vitest";
import {
  canApplyCapture,
  canDashboardManualJobSave,
  canManualCaptureSave,
  applyCaptureBlockReason,
  dashboardManualJobBlockReason,
  isApplyJobUrl,
  manualCaptureBlockReason,
} from "@/src/shared/extension/apply-gate";

describe("canApplyCapture", () => {
  it("requires url and description >= 120 chars", () => {
    expect(canApplyCapture({ url: "https://jobs.example.com/1", description: "x".repeat(120) })).toBe(
      true,
    );
    expect(canApplyCapture({ url: "", description: "x".repeat(120) })).toBe(false);
    expect(canApplyCapture({ url: "https://jobs.example.com/1", description: "short" })).toBe(false);
  });

  it("returns helpful block reason", () => {
    expect(applyCaptureBlockReason({ url: "", description: "" })).toMatch(/job URL/i);
  });
});

describe("canManualCaptureSave", () => {
  it("requires url, description, and role title", () => {
    const base = { url: "https://jobs.example.com/1", description: "x".repeat(120) };
    expect(canManualCaptureSave({ ...base, title: "Senior Engineer" })).toBe(true);
    expect(canManualCaptureSave({ ...base, title: "" })).toBe(false);
    expect(canManualCaptureSave({ ...base, title: "A" })).toBe(false);
  });

  it("returns role block reason after url and description pass", () => {
    expect(
      manualCaptureBlockReason({
        url: "https://jobs.example.com/1",
        description: "x".repeat(120),
        title: "",
      }),
    ).toMatch(/role title/i);
  });
});

describe("canDashboardManualJobSave", () => {
  it("allows save without url when title and description are present", () => {
    expect(
      canDashboardManualJobSave({
        url: "",
        title: "Director",
        description: "x".repeat(120),
      }),
    ).toBe(true);
  });

  it("rejects invalid url when provided", () => {
    expect(
      dashboardManualJobBlockReason({
        url: "not-a-url",
        title: "Director",
        description: "x".repeat(120),
      }),
    ).toMatch(/valid job posting URL/i);
  });
});

describe("isApplyJobUrl", () => {
  it("rejects dashboard placeholder urls", () => {
    expect(isApplyJobUrl("easysubmit://dashboard-manual/abc")).toBe(false);
    expect(isApplyJobUrl("https://jobs.example.com/1")).toBe(true);
  });
});
