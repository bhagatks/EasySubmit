import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/extension/job-service", () => ({
  MAX_JOB_DESCRIPTION_CHARS: 48_000,
}));

import { normalizeSaveJobInput } from "@/lib/extension/normalize-save-job";

describe("normalizeSaveJobInput", () => {
  it("requires url and description", () => {
    const result = normalizeSaveJobInput({
      url: "https://jobs.example.com/1",
      title: "Engineer",
      description: "short",
    });
    expect(result).toEqual({ error: "url and job description (min 120 chars) are required" });
  });

  it("derives title when missing", () => {
    const result = normalizeSaveJobInput({
      url: "https://jobs.example.com/job/senior-engineer",
      title: "",
      description: "x".repeat(150),
    });
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.title.length).toBeGreaterThan(2);
    expect(result.description!.length).toBeGreaterThanOrEqual(120);
  });

  it("requires explicit title for manual capture", () => {
    const result = normalizeSaveJobInput({
      url: "https://jobs.example.com/1",
      title: "",
      description: "x".repeat(150),
      metadata: { captureMode: "manual" },
    });
    expect(result).toEqual({ error: "role title is required for manual capture" });
  });
});
