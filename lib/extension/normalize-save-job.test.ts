import { describe, expect, it } from "vitest";
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
    expect(result.description.length).toBeGreaterThanOrEqual(120);
  });
});
