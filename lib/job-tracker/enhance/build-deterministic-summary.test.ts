import { describe, it, expect } from "vitest";
import {
  buildDeterministicSummary,
  deriveYearsOfExperience,
} from "./build-deterministic-summary";
import { SUMMARY_BANNED_WORDS, countSummaryWords, countSummarySentences } from "@/lib/resume/summary-rules";

const MOCK_EXPERIENCE = [
  {
    title: "Software Engineer",
    company: "Acme Corp",
    bullets: "Reduced deployment time by 40% by migrating to containerized pipeline.\nBuilt REST APIs serving 1M daily requests.",
    startYear: "2018",
    endYear: "2023",
  },
];

const MOCK_SKILLS = ["Python", "AWS", "Terraform", "React", "PostgreSQL", "Docker", "Kubernetes"];


describe("deriveYearsOfExperience", () => {
  it("returns years since earliest startYear", () => {
    const years = deriveYearsOfExperience([{ startYear: "2018" }]);
    expect(years).toBe(new Date().getFullYear() - 2018);
  });

  it("returns undefined when no valid dates", () => {
    expect(deriveYearsOfExperience([])).toBeUndefined();
    expect(deriveYearsOfExperience([{ startYear: "not-a-year" }])).toBeUndefined();
  });

  it("caps at 20 years", () => {
    expect(deriveYearsOfExperience([{ startYear: "1970" }])).toBe(20);
  });

  it("uses earliest startYear when multiple entries", () => {
    const years = deriveYearsOfExperience([
      { startYear: "2020" },
      { startYear: "2015" },
      { startYear: "2018" },
    ]);
    expect(years).toBe(new Date().getFullYear() - 2015);
  });
});

describe("buildDeterministicSummary", () => {
  it("returns existing summary unchanged when it already passes validation (idempotent)", () => {
    // Generate a valid summary first, then verify a second pass returns it unchanged
    const first = buildDeterministicSummary({
      currentSummary: "Too short.",
      skills: MOCK_SKILLS,
      experience: MOCK_EXPERIENCE,
      targetRole: "Software Engineer",
    });
    const second = buildDeterministicSummary({
      currentSummary: first,
      skills: MOCK_SKILLS,
      experience: MOCK_EXPERIENCE,
      targetRole: "Software Engineer",
    });
    expect(second).toBe(first);
  });

  it("rewrites a 2-sentence summary", () => {
    const result = buildDeterministicSummary({
      currentSummary: "I am a software engineer. I build things.",
      skills: MOCK_SKILLS,
      experience: MOCK_EXPERIENCE,
      targetRole: "Software Engineer",
    });
    expect(countSummarySentences(result)).toBe(4);
  });

  it("rewrites an empty summary", () => {
    const result = buildDeterministicSummary({
      currentSummary: "",
      skills: MOCK_SKILLS,
      experience: MOCK_EXPERIENCE,
      targetRole: "Software Engineer",
    });
    expect(countSummarySentences(result)).toBe(4);
  });

  it("produces exactly 4 sentences", () => {
    const result = buildDeterministicSummary({
      currentSummary: "Too short.",
      skills: MOCK_SKILLS,
      experience: MOCK_EXPERIENCE,
      targetRole: "Software Engineer",
    });
    expect(countSummarySentences(result)).toBe(4);
  });

  it("produces 70–80 words", () => {
    const result = buildDeterministicSummary({
      currentSummary: "Too short.",
      skills: MOCK_SKILLS,
      experience: MOCK_EXPERIENCE,
      targetRole: "Software Engineer",
    });
    const wc = countSummaryWords(result);
    expect(wc).toBeGreaterThanOrEqual(70);
    expect(wc).toBeLessThanOrEqual(80);
  });

  it("contains no banned words", () => {
    const result = buildDeterministicSummary({
      currentSummary: "Proven track record of leveraging innovative solutions.",
      skills: MOCK_SKILLS,
      experience: MOCK_EXPERIENCE,
      targetRole: "Software Engineer",
    });
    const lower = result.toLowerCase();
    for (const banned of SUMMARY_BANNED_WORDS) {
      expect(lower).not.toContain(banned.toLowerCase());
    }
  });

  it("uses a metric bullet for sentence 4 when available", () => {
    const result = buildDeterministicSummary({
      currentSummary: "Too short.",
      skills: MOCK_SKILLS,
      experience: MOCK_EXPERIENCE,
      targetRole: "Software Engineer",
    });
    expect(result).toContain("40%");
  });

  it("falls back to first bullet when no metric bullet exists", () => {
    const experience = [
      {
        title: "Engineer",
        company: "Acme",
        bullets: "Built REST APIs.\nDesigned microservices architecture.",
        startYear: "2020",
      },
    ];
    const result = buildDeterministicSummary({
      currentSummary: "Too short.",
      skills: MOCK_SKILLS,
      experience,
      targetRole: "Software Engineer",
    });
    expect(result).toContain("Built REST APIs");
  });

  it("uses summaryTheme in sentence 2 when provided", () => {
    const result = buildDeterministicSummary({
      currentSummary: "Too short.",
      skills: MOCK_SKILLS,
      experience: MOCK_EXPERIENCE,
      targetRole: "Software Engineer",
      summaryTheme: "scale enterprise data pipelines",
    });
    expect(result).toContain("scale enterprise data pipelines");
  });

  it("works with no skills and no experience", () => {
    const result = buildDeterministicSummary({
      currentSummary: "",
      skills: [],
      experience: [],
      targetRole: "Product Manager",
    });
    expect(countSummarySentences(result)).toBe(4);
  });
});
