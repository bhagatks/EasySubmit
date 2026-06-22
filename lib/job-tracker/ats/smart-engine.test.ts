import { describe, it, expect } from "vitest";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { analyzeJobIntelligence } from "@/lib/job-tracker/ats/job-intelligence";
import { deterministicEnhance } from "@/lib/job-tracker/ats/deterministic-enhancer";

// ─── Fixture ─────────────────────────────────────────────────────────────────

const BASE_FORM: HubRefineryForm = {
  firstName: "Jane",
  lastName: "Smith",
  email: "jane@example.com",
  phone: "+1 415 555 0100",
  cityState: "San Francisco, CA",
  linkedIn: "linkedin.com/in/janesmith",
  professionalSummary: "Senior software engineer with 8 years building scalable systems.",
  skillsText: "TypeScript, React, Node.js, PostgreSQL",
  experience: [
    {
      id: "exp-0",
      title: "Senior Software Engineer",
      company: "Acme Corp",
      location: "San Francisco, CA",
      startMonth: "Jan",
      startYear: "2020",
      endMonth: "",
      endYear: "Present",
      bullets: [
        "Responsible for the backend microservices platform",
        "Helped with CI/CD pipeline deployments",
        "Built monitoring dashboard used by 3 teams",
      ].join("\n"),
      hidden: false,
    },
  ],
  education: [
    {
      id: "edu-0",
      school: "UC Berkeley",
      degree: "B.S. Computer Science",
      startMonth: "",
      startYear: "2012",
      endMonth: "",
      endYear: "2016",
      hidden: false,
    },
  ],
  certifications: [],
  projects: [],
  languages: [],
  customSections: [],
};

const JD_WITH_MISSING = `
  We are looking for a Senior Software Engineer with strong Python and AWS skills.
  Must have Python experience, AWS experience, and Docker containerization.
  Python Python Python. AWS AWS. Docker Docker Docker.
  Experience with Kubernetes and Terraform is a plus. Kubernetes Kubernetes.
`;

// ─── JobIntelligence ─────────────────────────────────────────────────────────

describe("analyzeJobIntelligence", () => {
  it("identifies missing keywords from JD", () => {
    const intel = analyzeJobIntelligence(BASE_FORM, "Senior Software Engineer", JD_WITH_MISSING);
    expect(intel.missingKeywords.length).toBeGreaterThan(0);
    expect(intel.missingKeywords).toContain("python");
  });

  it("classifies skills vs content keywords", () => {
    const intel = analyzeJobIntelligence(BASE_FORM, "Senior Software Engineer", JD_WITH_MISSING);
    // python, aws, docker, kubernetes are skills (short tokens)
    expect(intel.skillsToAdd.length).toBeGreaterThan(0);
  });

  it("identifies weak bullets", () => {
    const intel = analyzeJobIntelligence(BASE_FORM, "Senior Software Engineer", JD_WITH_MISSING);
    // "Responsible for..." and "Helped with..." should be flagged
    expect(intel.weakBullets.length).toBeGreaterThanOrEqual(2);
  });

  it("reports coverage percent", () => {
    const intel = analyzeJobIntelligence(BASE_FORM, "Senior Software Engineer", JD_WITH_MISSING);
    expect(intel.coveragePercent).toBeGreaterThanOrEqual(0);
    expect(intel.coveragePercent).toBeLessThanOrEqual(100);
  });

  it("returns empty analysis for empty JD", () => {
    const intel = analyzeJobIntelligence(BASE_FORM, "Senior Software Engineer", "");
    expect(intel.missingKeywords).toHaveLength(0);
    expect(intel.skillsToAdd).toHaveLength(0);
  });

  it("sets hasMinimumContent true when experience present", () => {
    const intel = analyzeJobIntelligence(BASE_FORM, "Senior Software Engineer", JD_WITH_MISSING);
    expect(intel.hasMinimumContent).toBe(true);
  });
});

// ─── DeterministicEnhancer ───────────────────────────────────────────────────

describe("deterministicEnhance", () => {
  it("injects missing skills into skillsText", () => {
    const intel = analyzeJobIntelligence(BASE_FORM, "Senior Software Engineer", JD_WITH_MISSING);
    const result = deterministicEnhance(BASE_FORM, intel);

    expect(result.changes.skillsAdded.length).toBeGreaterThan(0);
    // At least one of python/aws/docker should be added
    const addedLower = result.changes.skillsAdded.map((s) => s.toLowerCase());
    expect(addedLower.some((s) => ["python", "aws", "docker", "kubernetes"].includes(s))).toBe(true);
  });

  it("does not duplicate existing skills", () => {
    const intel = analyzeJobIntelligence(BASE_FORM, "Senior Software Engineer", JD_WITH_MISSING);
    const result = deterministicEnhance(BASE_FORM, intel);

    const skillsList = result.form.skillsText
      .split(/[,;\n|]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const uniqueSkills = new Set(skillsList);
    expect(skillsList.length).toBe(uniqueSkills.size);
  });

  it("rewrites weak bullets", () => {
    const intel = analyzeJobIntelligence(BASE_FORM, "Senior Software Engineer", JD_WITH_MISSING);
    const result = deterministicEnhance(BASE_FORM, intel);

    expect(result.changes.bulletsRewritten).toBeGreaterThan(0);
    const bullets = (result.form.experience[0]?.bullets ?? "").split("\n").filter(Boolean);
    // Responsible for → should be replaced
    expect(bullets.some((b) => /^responsible for/i.test(b))).toBe(false);
    // Helped with → should be replaced
    expect(bullets.some((b) => /^helped (to |with )?/i.test(b))).toBe(false);
  });

  it("returns a non-empty summary", () => {
    const intel = analyzeJobIntelligence(BASE_FORM, "Senior Software Engineer", JD_WITH_MISSING);
    const result = deterministicEnhance(BASE_FORM, intel);
    expect(result.summary.length).toBeGreaterThan(10);
  });

  it("no-ops on skills when JD is empty (no keywords to add)", () => {
    const emptyIntel = analyzeJobIntelligence(BASE_FORM, "Senior Software Engineer", "");
    const result = deterministicEnhance(BASE_FORM, emptyIntel);
    // No JD → no missing keywords → no skills injected
    expect(result.changes.skillsAdded).toHaveLength(0);
    // Weak bullets still detected from bullet quality (independent of JD)
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it("preserves contact fields", () => {
    const intel = analyzeJobIntelligence(BASE_FORM, "Senior Software Engineer", JD_WITH_MISSING);
    const result = deterministicEnhance(BASE_FORM, intel);
    expect(result.form.firstName).toBe(BASE_FORM.firstName);
    expect(result.form.email).toBe(BASE_FORM.email);
    expect(result.form.phone).toBe(BASE_FORM.phone);
  });

  it("preserves experience metadata (id, company, dates)", () => {
    const intel = analyzeJobIntelligence(BASE_FORM, "Senior Software Engineer", JD_WITH_MISSING);
    const result = deterministicEnhance(BASE_FORM, intel);
    const exp = result.form.experience[0]!;
    expect(exp.id).toBe("exp-0");
    expect(exp.company).toBe("Acme Corp");
    expect(exp.startYear).toBe("2020");
  });
});
