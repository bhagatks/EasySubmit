import { describe, expect, it } from "vitest";
import { sanitizeProperties } from "@/src/shared/analytics/sanitize";

describe("sanitizeProperties", () => {
  it("passes safe scalar properties", () => {
    expect(
      sanitizeProperties({
        surface: "review_resume",
        trace_id: "abc12345",
        duration_ms: 1200,
        ai_enabled: true,
      }),
    ).toEqual({
      surface: "review_resume",
      trace_id: "abc12345",
      duration_ms: 1200,
      ai_enabled: true,
    });
  });

  it("strips PII and secret keys", () => {
    expect(
      sanitizeProperties({
        email: "user@example.com",
        resumeText: "secret resume",
        apiKey: "sk-test",
        surface: "extension",
      }),
    ).toEqual({ surface: "extension" });
  });

  it("truncates long strings", () => {
    const long = "x".repeat(300);
    const result = sanitizeProperties({ note: long });
    expect(result.note).toHaveLength(201);
    expect(String(result.note).endsWith("…")).toBe(true);
  });
});
