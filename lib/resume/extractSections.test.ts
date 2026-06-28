import { describe, expect, it } from "vitest";
import {
  extractExperiencesFromText,
  extractLocationFromText,
  extractNameFromText,
  extractProjectsFromText,
  splitLocationField,
} from "@/lib/resume/extractSections";

const SAMPLE = `
Jane Doe
San Francisco, CA
jane@example.com

Professional Experience
Senior Engineer at Acme Corp (2020 – Present)
Built scalable APIs

Projects
Portfolio Site — Personal engineering blog
`;

describe("extractSections", () => {
  it("extractNameFromText finds likely name on early lines", () => {
    expect(extractNameFromText(SAMPLE)).toBe("Jane Doe");
  });

  it("extractLocationFromText finds city/state", () => {
    expect(extractLocationFromText(SAMPLE)).toContain("San Francisco");
  });

  it("extractExperiencesFromText parses role at company", () => {
    const rows = extractExperiencesFromText(SAMPLE);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].title).toContain("Senior Engineer");
    expect(rows[0].company).toContain("Acme");
  });

  it("extractProjectsFromText parses project lines", () => {
    const rows = extractProjectsFromText(SAMPLE);
    expect(rows.some((row) => /Portfolio/i.test(row.name))).toBe(true);
  });

  it("splitLocationField splits city and country", () => {
    expect(splitLocationField("Austin, TX, USA")).toEqual({
      city: "Austin",
      country: "TX, USA",
    });
    expect(splitLocationField("Remote")).toEqual({ city: "Remote", country: "" });
  });
});
