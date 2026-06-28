import { describe, expect, it } from "vitest";
import { parseResumeHeuristics } from "@/lib/resume/heuristicParser";

const SAMPLE_RESUME = `
JANE DOE
jane.doe@example.com | (415) 555-0100

PROFESSIONAL EXPERIENCE

Senior Software Engineer at Acme Corp
Jan 2020 – Present
• Built scalable microservices platform
• Led team of five engineers

Software Engineer at Globex
2016 – 2019
• Developed customer-facing web applications

EDUCATION

UC Berkeley
B.S. Computer Science
2012 – 2016

SKILLS
TypeScript, React, Node.js, PostgreSQL, AWS, Docker
`;

describe("parseResumeHeuristics", () => {
  it("extracts contact fields and sections", () => {
    const parsed = parseResumeHeuristics(SAMPLE_RESUME);
    expect(parsed.name).toBe("JANE DOE");
    expect(parsed.email).toBe("jane.doe@example.com");
    expect(parsed.phone).toMatch(/415/);
    expect(parsed.experience.length).toBeGreaterThanOrEqual(2);
    expect(parsed.education.length).toBeGreaterThanOrEqual(1);
    expect(parsed.skills).toEqual(
      expect.arrayContaining(["TypeScript", "React", "Node.js"]),
    );
  });

  it("parses experience section into entries", () => {
    const parsed = parseResumeHeuristics(SAMPLE_RESUME);
    expect(parsed.experience.length).toBeGreaterThan(0);
    expect(parsed.experience.some((entry) => entry.description.length > 0)).toBe(true);
  });

  it("returns empty structure for blank input", () => {
    const parsed = parseResumeHeuristics("   \n  ");
    expect(parsed.name).toBeNull();
    expect(parsed.experience).toEqual([]);
    expect(parsed.skills).toEqual([]);
  });
});
