import { describe, expect, it } from "vitest";
import {
  buildDashboardManualJobInput,
  resolveDashboardManualJobProfileId,
} from "@/lib/job-tracker/dashboard-manual-capture";

const PROFILES = [
  { id: "profile-default", label: "Default profile", isDefault: true },
  { id: "profile-alt", label: "Alt profile", isDefault: false },
];

describe("resolveDashboardManualJobProfileId", () => {
  it("prefers an explicit valid selection", () => {
    expect(resolveDashboardManualJobProfileId(PROFILES, "profile-alt")).toBe("profile-alt");
  });

  it("falls back to default profile", () => {
    expect(resolveDashboardManualJobProfileId(PROFILES, null)).toBe("profile-default");
  });
});

describe("buildDashboardManualJobInput", () => {
  it("builds save input with dashboard manual metadata", () => {
    const result = buildDashboardManualJobInput({
      url: "https://jobs.example.com/role-123",
      title: "Software Engineer",
      company: "Acme Corp",
      description: "a".repeat(120),
      sourceProfileId: "profile-default",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.input.platform).toBe("dashboard_manual");
    expect(result.input.sourceProfileId).toBe("profile-default");
    expect(result.input.metadata).toEqual({
      captureMode: "manual",
      captureSource: "dashboard",
      sourceProfileId: "profile-default",
    });
    expect(result.input.company).toBe("Acme Corp");
  });

  it("rejects missing resume profile", () => {
    const result = buildDashboardManualJobInput({
      url: "https://jobs.example.com/role-123",
      title: "Software Engineer",
      company: "",
      description: "a".repeat(120),
      sourceProfileId: "",
    });

    expect(result).toEqual({ ok: false, error: "Select a resume profile to tailor from." });
  });

  it("rejects missing role title", () => {
    const result = buildDashboardManualJobInput({
      url: "https://jobs.example.com/role-123",
      title: " ",
      company: "",
      description: "a".repeat(120),
      sourceProfileId: "profile-default",
    });

    expect(result).toEqual({ ok: false, error: "Add a role title to continue." });
  });

  it("rejects short job description", () => {
    const result = buildDashboardManualJobInput({
      url: "https://jobs.example.com/role-123",
      title: "Software Engineer",
      company: "",
      description: "too short",
      sourceProfileId: "profile-default",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("120");
  });
});
