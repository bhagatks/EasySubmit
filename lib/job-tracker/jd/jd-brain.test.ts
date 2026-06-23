import { describe, it, expect } from "vitest";
import { cleanJobDescription } from "@/lib/job-tracker/jd/jd-cleaner";
import { segmentJobDescription } from "@/lib/job-tracker/jd/jd-segmenter";
import {
  detectSeniority,
  detectScope,
  extractYearsExp,
  extractTieredKeywords,
  extractJDIntelligenceSync,
} from "@/lib/job-tracker/jd/jd-extractor";
import { buildResumeEnhanceDirective } from "@/lib/job-tracker/jd/jd-directive";
import { analyzeJobDescriptionSync, hashJobDescription } from "@/lib/job-tracker/jd/jd-brain";
import { makeEmptyIntelligence } from "@/lib/job-tracker/jd/jd-intelligence";

// ─── Cleaner tests ─────────────────────────────────────────────────────────────

describe("cleanJobDescription", () => {
  it("strips EEO boilerplate", () => {
    const raw = "We need a React developer.\n\nWe are an equal opportunity employer and do not discriminate on the basis of race, color, religion.";
    const { cleaned, strippedTypes } = cleanJobDescription(raw);
    expect(cleaned).not.toContain("equal opportunity employer");
    expect(strippedTypes).toContain("eeo");
  });

  it("preserves meaningful job content when stripping EEO", () => {
    const raw = "Requirements: 5 years TypeScript.\n\nEqual opportunity employer. We do not discriminate.";
    const { cleaned } = cleanJobDescription(raw);
    expect(cleaned).toContain("TypeScript");
  });

  it("detects likely-truncated JD (< 80 words)", () => {
    const raw = "Software Engineer. Some experience required.";
    const { likelyTruncated } = cleanJobDescription(raw);
    expect(likelyTruncated).toBe(true);
  });

  it("does not flag truncation for a full JD", () => {
    const raw = Array(100).fill("word").join(" ");
    const { likelyTruncated } = cleanJobDescription(raw);
    expect(likelyTruncated).toBe(false);
  });

  it("never throws on empty string", () => {
    expect(() => cleanJobDescription("")).not.toThrow();
  });
});

// ─── Segmenter tests ───────────────────────────────────────────────────────────

describe("segmentJobDescription", () => {
  it("uses JSON-LD fields when present (source = json-ld)", () => {
    const cleaned = "Some job posting text about software engineering.";
    const result = segmentJobDescription(cleaned, {
      qualifications: "5+ years Python. BS Computer Science required.",
      responsibilities: "Build and maintain APIs. Lead technical design.",
    });
    expect(result.source).toBe("json-ld");
    expect(result.requirements).toContain("Python");
    expect(result.responsibilities).toContain("Build");
  });

  it("detects Requirements header (source = header)", () => {
    const jd = [
      "About the Role",
      "We are building great software.",
      "",
      "Requirements",
      "- 5+ years Python",
      "- Strong SQL skills",
      "",
      "Responsibilities",
      "- Build REST APIs",
      "- Review code",
    ].join("\n");
    const result = segmentJobDescription(jd);
    expect(result.source).toBe("header");
    expect(result.requirements).toContain("Python");
    expect(result.responsibilities).toContain("REST APIs");
  });

  it("detects Qualifications header variant", () => {
    const jd = "Qualifications\n- 3 years React\n\nWhat You'll Do\n- Build UI components";
    const result = segmentJobDescription(jd);
    expect(result.source).toBe("header");
    expect(result.requirements).toContain("React");
  });

  it("detects Preferred header for preferred section", () => {
    const jd = "Requirements\n- Java required\n\nPreferred Qualifications\n- Go is a plus";
    const result = segmentJobDescription(jd);
    expect(result.preferred).toContain("Go");
  });

  it("falls back to heuristic when no headers found (source = heuristic)", () => {
    const jd =
      "We are looking for someone with at least 5 years of experience in Python. " +
      "You will be responsible for building backend services.";
    const result = segmentJobDescription(jd);
    expect(["heuristic", "full-text"]).toContain(result.source);
  });

  it("source field is correct for full-text fallback", () => {
    const result = segmentJobDescription("This is a vague job description with nothing structured.");
    expect(["heuristic", "full-text"]).toContain(result.source);
  });

  it("never throws on empty string", () => {
    expect(() => segmentJobDescription("")).not.toThrow();
  });
});

// ─── Extractor tests ───────────────────────────────────────────────────────────

describe("detectSeniority", () => {
  it("returns senior for Senior Engineer title", () => {
    expect(detectSeniority("Senior Software Engineer", "")).toBe("senior");
  });

  it("returns director for Director title", () => {
    expect(detectSeniority("Director of Engineering", "")).toBe("director");
  });

  it("returns staff for Staff Engineer title", () => {
    expect(detectSeniority("Staff Engineer", "")).toBe("staff");
  });

  it("returns entry for Junior Developer title", () => {
    expect(detectSeniority("Junior Developer", "")).toBe("entry");
  });

  it("returns manager for Engineering Manager title", () => {
    expect(detectSeniority("Engineering Manager", "")).toBe("manager");
  });

  it("infers senior from 8+ years in requirements", () => {
    expect(detectSeniority("Software Engineer", "8+ years of experience required")).toBe("senior");
  });
});

describe("detectScope", () => {
  it("returns manager when manage a team is mentioned", () => {
    expect(detectScope("Engineering Manager", "You will manage a team of 8 engineers")).toBe(
      "manager",
    );
  });

  it("returns ic when individual contributor pattern is found", () => {
    expect(detectScope("Software Engineer", "This is an individual contributor role")).toBe("ic");
  });

  it("returns ic for plain IC title with no management language", () => {
    expect(detectScope("Backend Engineer", "Build and maintain our core services")).toBe("ic");
  });
});

describe("extractYearsExp", () => {
  it("extracts 5 from '5+ years of experience'", () => {
    expect(extractYearsExp("5+ years of experience in Python")).toBe(5);
  });

  it("extracts minimum years from 'at least 3 years'", () => {
    expect(extractYearsExp("at least 3 years of professional experience")).toBe(3);
  });

  it("returns null when no years mentioned", () => {
    expect(extractYearsExp("Strong knowledge of Python required")).toBeNull();
  });
});

describe("extractTieredKeywords", () => {
  const segments = {
    requirements: "Required: Python, Kubernetes, Docker, PostgreSQL, microservices architecture",
    responsibilities: "You will build APIs using FastAPI. Deploy to AWS ECS.",
    preferred: "Experience with Terraform and Datadog is a plus.",
    context: "",
    source: "header" as const,
    wordCount: { requirements: 10, responsibilities: 10, preferred: 8 },
  };

  it("tier1 keywords come from requirements", () => {
    const { tier1 } = extractTieredKeywords(segments);
    expect(tier1).toContain("python");
    expect(tier1).toContain("kubernetes");
  });

  it("tier2 keywords come from responsibilities", () => {
    const { tier2 } = extractTieredKeywords(segments);
    expect(tier2).toContain("fastapi");
  });

  it("tier3 keywords come from preferred", () => {
    const { tier3 } = extractTieredKeywords(segments);
    expect(tier3).toContain("terraform");
  });
});

// ─── Brain public API tests ────────────────────────────────────────────────────

describe("analyzeJobDescriptionSync", () => {
  it("never throws on empty string", () => {
    expect(() => analyzeJobDescriptionSync("", "Software Engineer")).not.toThrow();
  });

  it("returns empty intelligence for empty description", () => {
    const result = analyzeJobDescriptionSync("", "Software Engineer");
    expect(result.intelligence.tier1Keywords).toHaveLength(0);
    expect(result.cacheHit).toBe(false);
  });

  it("returns a stable hash for the same description", () => {
    const desc = "Looking for a Senior Python Engineer with 5+ years experience.";
    const r1 = analyzeJobDescriptionSync(desc, "Python Engineer");
    const r2 = analyzeJobDescriptionSync(desc, "Python Engineer");
    expect(r1.descriptionHash).toBe(r2.descriptionHash);
  });

  it("returns different hashes for different descriptions", () => {
    const r1 = analyzeJobDescriptionSync("Python engineer role", "Engineer");
    const r2 = analyzeJobDescriptionSync("Java engineer role", "Engineer");
    expect(r1.descriptionHash).not.toBe(r2.descriptionHash);
  });

  it("extracts seniority from a realistic JD", () => {
    const jd =
      "Senior Software Engineer\n\nRequirements:\n- 8+ years Python\n- Strong Kubernetes knowledge\n\nResponsibilities:\n- Build microservices\n- Lead technical design";
    const result = analyzeJobDescriptionSync(jd, "Senior Software Engineer");
    expect(["senior", "staff"]).toContain(result.intelligence.seniority);
  });

  it("source is always deterministic for sync", () => {
    const result = analyzeJobDescriptionSync(
      "Requirements: 5 years Java. Responsibilities: Build APIs.",
      "Java Engineer",
    );
    expect(result.intelligence.source).toBe("deterministic");
  });
});

describe("hashJobDescription", () => {
  it("is stable", () => {
    const h1 = hashJobDescription("hello world");
    const h2 = hashJobDescription("hello world");
    expect(h1).toBe(h2);
  });

  it("is 16 chars", () => {
    expect(hashJobDescription("test").length).toBe(16);
  });
});

// ─── Directive tests ───────────────────────────────────────────────────────────

describe("buildResumeEnhanceDirective", () => {
  it("mustAddSkills excludes skills already in resume", () => {
    const intel = {
      ...makeEmptyIntelligence(),
      mustHaveSkills: ["python", "kubernetes", "terraform"],
    };
    const directive = buildResumeEnhanceDirective(intel, ["Python", "Docker"]);
    expect(directive.mustAddSkills).toContain("kubernetes");
    expect(directive.mustAddSkills).not.toContain("python");
  });

  it("deprioritize is populated from intelligence", () => {
    const intel = {
      ...makeEmptyIntelligence(),
      deprioritize: ["frontend", "consumer product"],
    };
    const directive = buildResumeEnhanceDirective(intel, []);
    expect(directive.deprioritize).toContain("frontend");
  });

  it("cultureSignals are correctly mapped", () => {
    const intel = {
      ...makeEmptyIntelligence(),
      velocitySignal: "fast" as const,
      ownershipLevel: "high" as const,
      industryDomain: ["fintech", "b2b-saas"],
    };
    const directive = buildResumeEnhanceDirective(intel, []);
    expect(directive.cultureSignals.velocity).toBe("fast");
    expect(directive.cultureSignals.ownership).toBe("high");
    expect(directive.cultureSignals.industry).toContain("fintech");
  });
});
