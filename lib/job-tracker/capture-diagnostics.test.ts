import { describe, expect, it, vi } from "vitest";
import {
  buildCaptureDiagnostics,
  logCaptureDiagnostics,
  JOB_CAPTURE_LOG_PREFIX,
} from "@/lib/job-tracker/capture-log";

describe("capture diagnostics", () => {
  it("records tiered gaps with scrape context", () => {
    const diagnostics = buildCaptureDiagnostics({
      url: "https://jobs.cvshealth.com/us/en/job/R0942300/example",
      title: "Lead Director",
      company: null,
      location: null,
      salaryText: null,
      description: "x".repeat(200),
      platform: "generic",
      metadata: { confidence: 72 },
      scrapePath: "detectJobPage",
      enrichmentsApplied: ["host.company"],
    });

    expect(diagnostics.missingCritical).toEqual(["Company"]);
    expect(diagnostics.missingOptional).toEqual(
      expect.arrayContaining(["Location", "Salary"]),
    );
    expect(diagnostics.scrapePath).toBe("detectJobPage");
    expect(diagnostics.nonBlocking).toBe(true);
    expect(
      diagnostics.fields.find((field) => field.field === "company")?.gapReason,
    ).toContain("fallbacks");
  });

  it("logs structured payload with JobCapture prefix", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    logCaptureDiagnostics(
      buildCaptureDiagnostics({
        url: "https://example.com/job/1",
        title: "Engineer",
        company: null,
        location: null,
        salaryText: null,
        description: null,
        platform: null,
        metadata: null,
      }),
      { phase: "server-save", userId: "user-1", entryId: "entry-1" },
    );

    expect(warn).toHaveBeenCalledWith(
      JOB_CAPTURE_LOG_PREFIX,
      expect.objectContaining({
        missingCritical: ["Company"],
        missingRequired: expect.arrayContaining(["Job description"]),
        phase: "server-save",
        userId: "user-1",
        entryId: "entry-1",
      }),
    );
    warn.mockRestore();
  });
});
