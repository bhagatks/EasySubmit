import { describe, it, expect } from "vitest";
import type { PrimeResumeData } from "@/components/onboarding/PrimeResume";
import { simulateAtsParse } from "@/lib/job-tracker/ats/ats-parse-simulator";
import { analyzeKeywordGap } from "@/lib/job-tracker/ats/keyword-gap";
import { analyzeBulletQuality } from "@/lib/job-tracker/ats/bullet-quality";
import { computeResumeReadiness } from "@/lib/job-tracker/ats/resume-readiness-score";

const FULL_RESUME: PrimeResumeData = {
  fullName: "Jane Smith",
  email: "jane@example.com",
  phone: "+1 415 555 0100",
  location: "San Francisco, CA",
  linkedIn: "linkedin.com/in/janesmith",
  summary: "Senior software engineer with 8 years building scalable TypeScript systems.",
  skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "AWS", "Docker"],
  experience: [
    {
      id: "1",
      title: "Senior Software Engineer",
      company: "Acme Corp",
      location: "San Francisco, CA",
      startDate: "Jan 2020",
      endDate: "Present",
      bullets: [
        "Led migration to microservices reducing API latency by 40%",
        "Built CI/CD pipeline cutting deploy time from 2 hours to 8 minutes",
        "Mentored 3 junior engineers on TypeScript best practices",
      ],
    },
  ],
  education: [
    { id: "1", school: "UC Berkeley", degree: "B.S. Computer Science", startDate: "2012", endDate: "2016" },
  ],
  certifications: ["AWS Certified Solutions Architect"],
  projects: [],
  languages: [],
  customSections: [],
};

// ─── ATS parse simulator ──────────────────────────────────────────────────────

describe("simulateAtsParse", () => {
  it("produces sections in correct ATS document order", () => {
    const result = simulateAtsParse(FULL_RESUME, "Senior Software Engineer");
    const ids = result.sections.map((s) => s.id);
    expect(ids[0]).toBe("header");
    expect(ids).toContain("summary");
    expect(ids).toContain("skills");
    expect(ids).toContain("experience");
    expect(ids).toContain("education");
  });

  it("includes name and contact in header", () => {
    const result = simulateAtsParse(FULL_RESUME, "");
    const header = result.sections.find((s) => s.id === "header")!;
    expect(header.lines[0]?.text).toBe("Jane Smith");
    expect(header.lines[1]?.text).toContain("jane@example.com");
  });

  it("warns when email is missing", () => {
    const noEmail: PrimeResumeData = { ...FULL_RESUME, email: "" };
    const result = simulateAtsParse(noEmail, "");
    expect(result.warnings.some((w) => w.toLowerCase().includes("email"))).toBe(true);
  });

  it("warns when skills are empty", () => {
    const noSkills: PrimeResumeData = { ...FULL_RESUME, skills: [] };
    const result = simulateAtsParse(noSkills, "");
    expect(result.warnings.some((w) => w.toLowerCase().includes("skills"))).toBe(true);
  });

  it("returns zero warnings for a complete resume", () => {
    const result = simulateAtsParse(FULL_RESUME, "Senior Software Engineer");
    expect(result.warnings).toHaveLength(0);
  });
});

// ─── Keyword gap ──────────────────────────────────────────────────────────────

describe("analyzeKeywordGap", () => {
  const jd = `We are looking for a Senior Software Engineer with strong TypeScript and React skills.
    Experience with Node.js, PostgreSQL, and AWS is required. Docker knowledge is a plus.
    The ideal candidate has TypeScript and TypeScript experience at scale. React React React.`;

  it("returns 0% coverage with empty JD", () => {
    const result = analyzeKeywordGap(FULL_RESUME, "", "");
    expect(result.coveragePercent).toBe(0);
  });

  it("matches skills that appear in both JD and resume", () => {
    const result = analyzeKeywordGap(FULL_RESUME, "Senior Software Engineer", jd);
    const matchedKeywords = result.matched.map((m) => m.keyword);
    expect(matchedKeywords).toContain("typescript");
    expect(matchedKeywords).toContain("react");
  });

  it("coverage is between 0 and 100", () => {
    const result = analyzeKeywordGap(FULL_RESUME, "Senior Software Engineer", jd);
    expect(result.coveragePercent).toBeGreaterThan(0);
    expect(result.coveragePercent).toBeLessThanOrEqual(100);
  });

  it("topMissing contains at most 10 items", () => {
    const result = analyzeKeywordGap(FULL_RESUME, "", jd);
    expect(result.topMissing.length).toBeLessThanOrEqual(10);
  });
});

// ─── Bullet quality ───────────────────────────────────────────────────────────

describe("analyzeBulletQuality", () => {
  it("detects action verbs on strong bullets", () => {
    const result = analyzeBulletQuality(FULL_RESUME);
    // "Led", "Built", "Mentored" are all action verbs
    expect(result.actionVerbRate).toBe(100);
  });

  it("detects quantification on metric bullets", () => {
    const result = analyzeBulletQuality(FULL_RESUME);
    // "40%", "2 hours to 8 minutes", "3 junior engineers" have metrics
    expect(result.quantificationRate).toBeGreaterThan(50);
  });

  it("flags weak phrase 'responsible for'", () => {
    const weak: PrimeResumeData = {
      ...FULL_RESUME,
      experience: [{
        ...FULL_RESUME.experience![0]!,
        bullets: ["Responsible for the backend services"],
      }],
    };
    const result = analyzeBulletQuality(weak);
    const issues = result.entries[0]!.bullets[0]!.issues;
    expect(issues.some((i) => i.type === "weak-phrase")).toBe(true);
  });

  it("returns 0 bullets and 0 score for empty experience", () => {
    const empty: PrimeResumeData = { ...FULL_RESUME, experience: [] };
    const result = analyzeBulletQuality(empty);
    expect(result.totalBullets).toBe(0);
    expect(result.overallScore).toBe(0);
  });
});

// ─── Readiness score ──────────────────────────────────────────────────────────

describe("computeResumeReadiness", () => {
  const jd = "Looking for Senior Software Engineer with TypeScript React Node.js AWS experience. TypeScript TypeScript.";

  it("total is 0–100", () => {
    const result = computeResumeReadiness(FULL_RESUME, "Senior Software Engineer", jd);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
  });

  it("complete resume scores an A or B", () => {
    const result = computeResumeReadiness(FULL_RESUME, "Senior Software Engineer", jd);
    expect(["A", "B"]).toContain(result.grade);
  });

  it("empty resume scores an F", () => {
    const empty: PrimeResumeData = {
      fullName: "", email: "", phone: "", location: "",
      skills: [], experience: [], education: [],
    };
    const result = computeResumeReadiness(empty, "", "");
    expect(result.grade).toBe("F");
  });

  it("topActions is non-empty for a weak resume", () => {
    const empty: PrimeResumeData = { fullName: "", skills: [] };
    const result = computeResumeReadiness(empty, "", "");
    expect(result.topActions.length).toBeGreaterThan(0);
  });

  it("pillars sum to total", () => {
    const result = computeResumeReadiness(FULL_RESUME, "Senior Software Engineer", jd);
    const sum = Object.values(result.pillars).reduce((s, p) => s + p.score, 0);
    expect(sum).toBe(result.total);
  });
});
