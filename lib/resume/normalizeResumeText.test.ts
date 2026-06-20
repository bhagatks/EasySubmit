import { describe, expect, it } from "vitest";
import {
  normalizeBulletLine,
  normalizeBulletLines,
  normalizeBulletText,
  normalizeDateRangeString,
  normalizeResumeLine,
  normalizeStructuredResume,
  stripLeadingBulletMarker,
  stripResumeJunkChars,
} from "@/lib/resume/normalizeResumeText";

describe("stripResumeJunkChars", () => {
  it("removes zero-width spaces and replacement characters", () => {
    expect(stripResumeJunkChars("Led\u200Bteam\uFFFD")).toBe("Led team");
  });

  it("converts non-breaking spaces to regular spaces", () => {
    expect(stripResumeJunkChars("Hello\u00A0world")).toBe("Hello world");
  });
});

describe("stripLeadingBulletMarker", () => {
  it("strips common unicode bullets", () => {
    expect(stripLeadingBulletMarker("• Increased revenue by 15%")).toBe(
      "Increased revenue by 15%",
    );
    expect(stripLeadingBulletMarker("● Built C++ parsers")).toBe("Built C++ parsers");
  });

  it("strips ascii dash and asterisk bullets", () => {
    expect(stripLeadingBulletMarker("- Led migration")).toBe("Led migration");
    expect(stripLeadingBulletMarker("* Owned roadmap")).toBe("Owned roadmap");
  });

  it("strips numbered list prefixes", () => {
    expect(stripLeadingBulletMarker("1. First achievement")).toBe("First achievement");
    expect(stripLeadingBulletMarker("2) Second achievement")).toBe(
      "Second achievement",
    );
  });

  it("does not strip hyphens inside technical terms", () => {
    expect(stripLeadingBulletMarker("Built CI/CD pipelines")).toBe(
      "Built CI/CD pipelines",
    );
  });
});

describe("normalizeBulletLine", () => {
  it("normalizes smart quotes and bullets together", () => {
    expect(normalizeBulletLine("• Drove “platform” launch\u200B")).toBe(
      'Drove "platform" launch',
    );
  });
});

describe("normalizeBulletText", () => {
  it("cleans each line and drops empties", () => {
    expect(
      normalizeBulletText("• Line one\n\n- Line two\n   \n• Line three"),
    ).toBe("Line one\nLine two\nLine three");
  });
});

describe("normalizeResumeLine", () => {
  it("preserves legitimate symbols in company and skill names", () => {
    expect(normalizeResumeLine("AT&T — Platform & DevOps (C#/.NET)")).toBe(
      "AT&T — Platform & DevOps (C#/.NET)",
    );
  });

  it("preserves accented characters in names", () => {
    expect(normalizeResumeLine("José Müller")).toBe("José Müller");
  });
});

describe("normalizeDateRangeString", () => {
  it("normalizes mixed dash separators", () => {
    expect(normalizeDateRangeString("Jan 2020 — Dec 2023")).toBe(
      "Jan 2020 – Dec 2023",
    );
    expect(normalizeDateRangeString("2020 to Present")).toBe("2020 – Present");
  });
});

describe("normalizeStructuredResume", () => {
  it("cleans nested experience bullets", () => {
    const result = normalizeStructuredResume({
      name: "Jane\u200BDoe",
      email: "jane@example.com",
      phone: null,
      location: null,
      linkedIn: null,
      summary: "• Should not stay",
      experience: [
        {
          company: "7-Eleven",
          role: "Engineer",
          date: "2020—2023",
          description: ["• Built parsers", "- Improved ATS score by 20%"],
        },
      ],
      education: [],
      skills: ["C++", "Node.js"],
      certifications: ["• AWS Certified"],
      projects: [],
      languages: [],
    });

    expect(result.name).toBe("Jane Doe");
    expect(result.experience[0].date).toBe("2020 – 2023");
    expect(result.experience[0].description).toEqual([
      "Built parsers",
      "Improved ATS score by 20%",
    ]);
    expect(result.summary).toBe("Should not stay");
    expect(result.certifications).toEqual(["AWS Certified"]);
  });
});

describe("normalizeBulletLines", () => {
  it("returns empty array when all lines are junk", () => {
    expect(normalizeBulletLines(["   ", "•", ""])).toEqual([]);
  });
});
