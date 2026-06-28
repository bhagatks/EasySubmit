import { describe, expect, it } from "vitest";
import {
  buildIngestionLogLines,
  buildProcessingLogLines,
} from "@/lib/resume/ingestionLog";
import type { StructuredResume } from "@/lib/resume/heuristicParser";

const DATA: StructuredResume = {
  name: "Jane Doe",
  email: null,
  phone: null,
  location: null,
  linkedIn: null,
  summary: null,
  experience: [{ role: "Engineer", company: "Acme", date: "", description: [] }],
  education: [],
  skills: ["Python"],
  certifications: [],
  projects: [],
  languages: [],
};

describe("ingestionLog", () => {
  it("buildIngestionLogLines includes parser and summary lines", () => {
    const lines = buildIngestionLogLines(DATA, {
      parser: "open-resume-pdf",
      jobCount: 1,
      skillCount: 1,
      educationCount: 0,
    });
    expect(lines.some((line) => line.message.includes("Open-Resume PDF"))).toBe(true);
    expect(lines.some((line) => line.message.includes("Jane Doe"))).toBe(true);
    expect(lines.at(-1)?.message).toMatch(/ready for refinery/i);
  });

  it("buildProcessingLogLines returns active scan step", () => {
    const lines = buildProcessingLogLines();
    expect(lines[0].status).toBe("active");
    expect(lines.length).toBeGreaterThan(1);
  });
});
