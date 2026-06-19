import { describe, expect, it } from "vitest";
import {
  extractTrailingDateRange,
  formatLocationLabel,
  formatDateRangeParts,
  parseDateRangeString,
  parseLocationLabel,
} from "@/lib/resume/dates";
import { parseQualificationBullets } from "@/lib/resume/openResume/extract-resume-from-sections/parse-qualification-bullets";

describe("dates", () => {
  it("formats location as City, state & Zipcode", () => {
    expect(formatLocationLabel("Prosper", "Texas", "75078")).toBe(
      "Prosper, Texas & 75078",
    );
  });

  it("parses legacy parenthesis zip labels", () => {
    expect(parseLocationLabel("Prosper, Texas (75078)")).toEqual({
      city: "Prosper",
      state: "Texas",
      zip: "75078",
    });
  });

  it("parses year-only ranges into start/end years", () => {
    expect(parseDateRangeString("2024 – 2026")).toEqual({
      start: { month: "", year: "2024" },
      end: { month: "", year: "2026" },
    });
  });

  it("formats month-year ranges", () => {
    expect(
      formatDateRangeParts({
        start: { month: "Jan", year: "2024" },
        end: { month: "Mar", year: "2026" },
      }),
    ).toBe("Jan 2024 – Mar 2026");
  });

  it("extracts trailing date from piped job header lines", () => {
    expect(
      extractTrailingDateRange(
        "Senior Engineering Manager | Solution Architect - 7Now Delivery Platform | 2024 – 2026",
      ),
    ).toEqual({
      title:
        "Senior Engineering Manager | Solution Architect - 7Now Delivery Platform",
      date: "2024 – 2026",
    });
  });
});

describe("parseQualificationBullets", () => {
  it("splits education, certifications, and toolkit skills", () => {
    const result = parseQualificationBullets([
      "AWS Certified Solutions Architect – Professional | Credential Verification Link",
      "Applied Agentic AI for Organizational Transformation | MIT Professional Education (2026)",
      "Bachelor of Technology (B.Tech) in Computer Science & Engineering | Kakatiya University, India",
      "Technical & Consulting Toolkit: Solution Design, Agile/Scrum, AWS",
    ]);

    expect(result.educations).toHaveLength(1);
    expect(result.educations[0].school).toContain("Kakatiya University");
    expect(result.certifications.length).toBeGreaterThanOrEqual(2);
    expect(result.skills.join(", ")).toMatch(/Solution Design/);
  });
});
