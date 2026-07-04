import { describe, expect, it } from "vitest";
import { detectDomain } from "@/lib/job-tracker/jd/jd-extractor";

describe("detectDomain", () => {
  it("classifies AI/ML and Data Architecture director roles", () => {
    const title = "Director, AI/ML and Data Architecture";
    const body = "Lead enterprise data platforms and generative AI initiatives.";
    expect(detectDomain(title, body)).toBe("ml-ai");
  });

  it("classifies data architecture without ML signals", () => {
    expect(detectDomain("Data Architecture Lead", "Own enterprise data architecture standards.")).toBe(
      "data-engineering",
    );
  });

  it("returns other for unrelated roles", () => {
    expect(detectDomain("Office Manager", "Schedule meetings and order supplies.")).toBe("other");
  });
});
