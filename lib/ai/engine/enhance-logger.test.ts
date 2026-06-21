import { describe, expect, it } from "vitest";
import {
  buildEnhanceTimeoutDiagnosis,
  sanitizeRouteForLog,
  summarizeFormForLog,
} from "@/src/lib/ai/engine/enhance-logger";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";

const emptyForm = (): HubRefineryForm => ({
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  phone: "",
  linkedIn: "",
  cityState: "",
  targetRole: "Engineer",
  professionalSummary: "Summary text",
  skillsText: "TypeScript, React",
  experience: [
    {
      id: "1",
      company: "Acme",
      title: "Dev",
      startYear: "2020",
      endYear: "Present",
      bullets: ["Built things"],
      hidden: false,
    },
    {
      id: "2",
      company: "Hidden Co",
      title: "Intern",
      startYear: "2019",
      endYear: "2020",
      bullets: [],
      hidden: true,
    },
  ],
  education: [],
  certifications: [],
  projects: [],
  languages: [],
});

describe("enhance-logger", () => {
  it("summarizeFormForLog counts sections without contact values", () => {
    const summary = summarizeFormForLog(emptyForm());
    expect(summary.professionalSummaryChars).toBe(12);
    expect(summary.skillCount).toBe(2);
    expect(summary.experienceVisible).toBe(1);
    expect(summary.experienceHidden).toBe(1);
    expect(summary.hasContactFields).toBe(true);
  });

  it("sanitizeRouteForLog never includes api keys", () => {
    const sanitized = sanitizeRouteForLog({
      mode: "system",
      modelId: "gemini-2.5-flash-lite",
    });
    expect(sanitized).toEqual({
      mode: "system",
      modelId: "gemini-2.5-flash-lite",
    });
  });

  it("buildEnhanceTimeoutDiagnosis points to server terminal", () => {
    const diagnosis = buildEnhanceTimeoutDiagnosis("abc12345", 10_000);
    expect(diagnosis.traceId).toBe("abc12345");
    expect(diagnosis.timeoutMs).toBe(10_000);
    expect(diagnosis.serverLogsLocation).toContain("terminal");
    expect(diagnosis.serverSearch).toContain("abc12345");
  });
});
