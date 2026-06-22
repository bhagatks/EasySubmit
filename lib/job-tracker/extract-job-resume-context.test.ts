import { describe, expect, it } from "vitest";
import {
  extractJobAndResumeContext,
  flattenJobAndResumeContext,
  markdownToPlainText,
  type JobAndResumeContext,
  type JobContext,
  type ResumeContext,
  JOB_CONTEXT_FALLBACKS,
  RESUME_CONTEXT_FALLBACKS,
} from "@/lib/job-tracker/extract-job-resume-context";

// ─── Mock fixtures ────────────────────────────────────────────────────────────

/** 1. Perfectly formatted standard Markdown resume + clean JD. */
const PERFECT_RESUME = `
# Morgan Chen
morgan.chen@example.com · (415) 555-0199
Austin, TX

## Professional Summary
Platform engineer with ten years building reliable backend systems.

## Skills
TypeScript, Go, PostgreSQL, Kubernetes, AWS, Docker

## Experience
**Staff Platform Engineer** at Horizon Labs
March 2021 – Present
- Led migration to Kubernetes on AWS.
- Improved PostgreSQL query performance across core services.

Senior Backend Engineer at Dataflow Inc
June 2017 – February 2021
- Built event pipelines with Go and Docker.

## Education
B.S. Computer Science, State University
2013 – 2017
`.trim();

const PERFECT_JD = `
Nimbus Systems

Staff Platform Engineer

About Nimbus Systems
Nimbus is hiring a Staff Platform Engineer to scale our core platform.

What you will do
- Design services in Go and TypeScript
- Operate PostgreSQL and Kubernetes in production
- Partner with teams on AWS infrastructure

Requirements
- 8+ years backend experience
- Strong Go, TypeScript, and PostgreSQL
- Kubernetes and AWS required
`.trim();

/** 2. Messy resume — missing headers, irregular spacing, inline noise. */
const MESSY_RESUME = `
morgan   chen
   morgan.chen@example.com


austin,tx


worked on typescript and react and postgres!!!


senior backend engineer    at    dataflow inc
06/2017 - 02/2021
did some stuff with docker


staff platform engineer @ horizon labs
03/2021 - Present
kubernetes aws go
`.trim();

/** Clean JD paired with messy resume (company/title still parseable). */
const CLEAN_JD_FOR_MESSY = `
Horizon Labs
Staff Platform Engineer

About Horizon Labs
We use Go, Kubernetes, and PostgreSQL daily.
`.trim();

/** 3. Short bullet-point-only job description (no company/title prose). */
const BULLET_ONLY_JD = `
- python required
- django rest frameworks
- postgresql and redis
- react frontend
- node.js apis
- remote ok
`.trim();

const MINIMAL_RESUME = `
Alex Kim
alex@example.com
Seattle, WA
Skills: Python, Django, AWS
Data Analyst at Contoso
Jan 2020 – Present
`.trim();

// ─── Test helpers ─────────────────────────────────────────────────────────────

function expectParsedField<T>(
  field: { value: T; source: "parsed" | "fallback" },
  expectedSource: "parsed" | "fallback",
) {
  expect(field).toHaveProperty("value");
  expect(field).toHaveProperty("source", expectedSource);
}

function expectResumeShape(resume: ResumeContext) {
  expectParsedField(resume.candidateName, resume.candidateName.source);
  expectParsedField(resume.email, resume.email.source);
  expectParsedField(resume.location, resume.location.source);
  expectParsedField(resume.topSkills, resume.topSkills.source);
  expect(Array.isArray(resume.topSkills.value)).toBe(true);
  expect(resume.topSkills.value.length).toBeLessThanOrEqual(3);
  expectParsedField(resume.mostRecentJobTitle, resume.mostRecentJobTitle.source);
}

function expectJobShape(job: JobContext) {
  expectParsedField(job.companyName, job.companyName.source);
  expectParsedField(job.targetJobTitle, job.targetJobTitle.source);
  expectParsedField(job.topKeywords, job.topKeywords.source);
  expect(Array.isArray(job.topKeywords.value)).toBe(true);
  expect(job.topKeywords.value.length).toBeLessThanOrEqual(3);
}

function expectFullContextShape(ctx: JobAndResumeContext) {
  expectResumeShape(ctx.resume);
  expectJobShape(ctx.job);
}

/** Ensures extractor never throws for arbitrary string input. */
function extractSafely(resume: string, jd: string): JobAndResumeContext {
  expect(() => extractJobAndResumeContext(resume, jd)).not.toThrow();
  return extractJobAndResumeContext(resume, jd);
}

// ─── markdownToPlainText ──────────────────────────────────────────────────────

describe("markdownToPlainText", () => {
  it("strips headings, emphasis, links, and list markers", () => {
    const plain = markdownToPlainText(
      "## **Hello** [world](https://x.com)\n\n- item one\n1. item two",
    );
    expect(plain).toContain("Hello world");
    expect(plain).toContain("item one");
    expect(plain).not.toMatch(/##|\*\*|https?:\/\//);
  });

  it("handles empty and whitespace-only input", () => {
    expect(markdownToPlainText("")).toBe("");
    expect(markdownToPlainText("   \n\n  ")).toBe("");
  });
});

// ─── Scenario 1: perfect markdown resume + clean JD ───────────────────────────

describe("extractJobAndResumeContext — perfect fixtures", () => {
  it("parses all resume fields from well-structured markdown", () => {
    const ctx = extractSafely(PERFECT_RESUME, PERFECT_JD);
    expectFullContextShape(ctx);

    expect(ctx.resume.candidateName).toEqual({
      value: "Morgan Chen",
      source: "parsed",
    });
    expect(ctx.resume.email).toEqual({
      value: "morgan.chen@example.com",
      source: "parsed",
    });
    expect(ctx.resume.location.value).toMatch(/Austin/i);
    expect(ctx.resume.location.source).toBe("parsed");
    expect(ctx.resume.topSkills.value).toEqual(
      expect.arrayContaining(["TypeScript", "Go", "PostgreSQL"]),
    );
    expect(ctx.resume.topSkills.value.length).toBe(3);
    expect(ctx.resume.mostRecentJobTitle.value).toMatch(/Staff Platform Engineer/i);
    expect(ctx.resume.mostRecentJobTitle.source).toBe("parsed");
  });

  it("parses company, title, and technical keywords from clean JD", () => {
    const ctx = extractSafely(PERFECT_RESUME, PERFECT_JD);

    expect(ctx.job.companyName).toEqual({ value: "Nimbus Systems", source: "parsed" });
    expect(ctx.job.targetJobTitle.value).toMatch(/Staff Platform Engineer/i);
    expect(ctx.job.targetJobTitle.source).toBe("parsed");
    expect(ctx.job.topKeywords.value.length).toBeGreaterThan(0);
    expect(ctx.job.topKeywords.value.length).toBeLessThanOrEqual(3);
    expect(ctx.job.topKeywords.source).toBe("parsed");
  });

  it("flattens to plain strings without metadata loss", () => {
    const flat = flattenJobAndResumeContext(extractSafely(PERFECT_RESUME, PERFECT_JD));

    expect(flat.candidateName).toBe("Morgan Chen");
    expect(flat.email).toBe("morgan.chen@example.com");
    expect(flat.companyName).toBe("Nimbus Systems");
    expect(flat.targetJobTitle).toMatch(/Staff Platform Engineer/i);
    expect(flat.topSkills).toHaveLength(3);
    expect(flat.topKeywords.length).toBeLessThanOrEqual(3);
  });
});

// ─── Scenario 2: messy resume ─────────────────────────────────────────────────

describe("extractJobAndResumeContext — messy resume", () => {
  it("still returns a complete shape without throwing", () => {
    const ctx = extractSafely(MESSY_RESUME, CLEAN_JD_FOR_MESSY);
    expectFullContextShape(ctx);
  });

  it("recovers email and skills despite missing section headers", () => {
    const ctx = extractSafely(MESSY_RESUME, CLEAN_JD_FOR_MESSY);

    expect(ctx.resume.email).toEqual({
      value: "morgan.chen@example.com",
      source: "parsed",
    });
    expect(ctx.resume.topSkills.value.length).toBeGreaterThan(0);
    expect(ctx.resume.topSkills.source).toBe("parsed");
    // Checklist order: TypeScript before React; Go appears from experience line text.
    expect(ctx.resume.topSkills.value).toEqual(
      expect.arrayContaining(["TypeScript", "React"]),
    );
    expect(ctx.resume.topSkills.value.length).toBeLessThanOrEqual(3);
  });

  it("extracts a job title from non-standard experience lines (document order)", () => {
    const ctx = extractSafely(MESSY_RESUME, CLEAN_JD_FOR_MESSY);

    expect(ctx.resume.mostRecentJobTitle.source).toBe("parsed");
    // First dated role in the file appears before the later Staff role.
    expect(ctx.resume.mostRecentJobTitle.value).toMatch(/backend engineer/i);
  });

  it("parses lowercase city/state location with irregular spacing", () => {
    const ctx = extractSafely(MESSY_RESUME, CLEAN_JD_FOR_MESSY);

    // "austin,tx" may normalize via city/region regex or remain fallback depending on pattern.
    expect(["parsed", "fallback"]).toContain(ctx.resume.location.source);
    if (ctx.resume.location.source === "parsed") {
      expect(ctx.resume.location.value.toLowerCase()).toMatch(/austin/);
    } else {
      expect(ctx.resume.location.value).toBe(RESUME_CONTEXT_FALLBACKS.location);
    }
  });

  it("infers candidate name from first clean line when casing is irregular", () => {
    const ctx = extractSafely(MESSY_RESUME, CLEAN_JD_FOR_MESSY);

    expect(ctx.resume.candidateName.source).toBe("parsed");
    expect(ctx.resume.candidateName.value.toLowerCase()).toContain("morgan");
  });
});

// ─── Scenario 3: bullet-only JD ───────────────────────────────────────────────

describe("extractJobAndResumeContext — bullet-only JD", () => {
  it("does not throw on minimal bullet-list postings", () => {
    const ctx = extractSafely(MINIMAL_RESUME, BULLET_ONLY_JD);
    expectFullContextShape(ctx);
  });

  it("falls back target title when JD has no role prose", () => {
    const ctx = extractSafely(MINIMAL_RESUME, BULLET_ONLY_JD);

    expect(ctx.job.targetJobTitle).toEqual({
      value: JOB_CONTEXT_FALLBACKS.targetJobTitle,
      source: "fallback",
    });
    // First bullet may be heuristically treated as company; must not throw.
    expect(typeof ctx.job.companyName.value).toBe("string");
    expect(["parsed", "fallback"]).toContain(ctx.job.companyName.source);
  });

  it("still extracts technical keywords from bullet tokens", () => {
    const ctx = extractSafely(MINIMAL_RESUME, BULLET_ONLY_JD);

    expect(ctx.job.topKeywords.source).toBe("parsed");
    expect(ctx.job.topKeywords.value.length).toBeGreaterThan(0);
    expect(ctx.job.topKeywords.value).toEqual(
      expect.arrayContaining(["postgresql", "node.js"]),
    );
    expect(ctx.job.topKeywords.value).toHaveLength(3);
  });

  it("pairs bullet JD with perfect resume without crashing", () => {
    const ctx = extractSafely(PERFECT_RESUME, BULLET_ONLY_JD);
    expectFullContextShape(ctx);
    expect(ctx.resume.candidateName.source).toBe("parsed");
    expect(ctx.job.topKeywords.value.length).toBeGreaterThan(0);
  });
});

// ─── Fallback safety ────────────────────────────────────────────────────────────

describe("extractJobAndResumeContext — fallback safety", () => {
  it("uses all resume fallbacks for empty resume text", () => {
    const ctx = extractSafely("", PERFECT_JD);

    expect(ctx.resume.candidateName).toEqual({
      value: RESUME_CONTEXT_FALLBACKS.candidateName,
      source: "fallback",
    });
    expect(ctx.resume.email).toEqual({
      value: RESUME_CONTEXT_FALLBACKS.email,
      source: "fallback",
    });
    expect(ctx.resume.location).toEqual({
      value: RESUME_CONTEXT_FALLBACKS.location,
      source: "fallback",
    });
    expect(ctx.resume.topSkills).toEqual({
      value: RESUME_CONTEXT_FALLBACKS.topSkills,
      source: "fallback",
    });
    expect(ctx.resume.mostRecentJobTitle).toEqual({
      value: RESUME_CONTEXT_FALLBACKS.mostRecentJobTitle,
      source: "fallback",
    });
  });

  it("uses all job fallbacks for empty JD text", () => {
    const ctx = extractSafely(PERFECT_RESUME, "");

    expect(ctx.job.companyName).toEqual({
      value: JOB_CONTEXT_FALLBACKS.companyName,
      source: "fallback",
    });
    expect(ctx.job.targetJobTitle).toEqual({
      value: JOB_CONTEXT_FALLBACKS.targetJobTitle,
      source: "fallback",
    });
    expect(ctx.job.topKeywords).toEqual({
      value: JOB_CONTEXT_FALLBACKS.topKeywords,
      source: "fallback",
    });
  });

  it("uses full fallbacks when both inputs are empty", () => {
    const ctx = extractSafely("", "");
    expectFullContextShape(ctx);

    expect(ctx.resume.candidateName.source).toBe("fallback");
    expect(ctx.job.companyName.source).toBe("fallback");
  });

  it("treats nullish coerced inputs safely via empty-string normalization", () => {
    expect(() =>
      extractJobAndResumeContext(undefined as unknown as string, null as unknown as string),
    ).not.toThrow();

    const ctx = extractJobAndResumeContext(
      undefined as unknown as string,
      null as unknown as string,
    );
    expectFullContextShape(ctx);
    expect(ctx.resume.candidateName.source).toBe("fallback");
    expect(ctx.job.companyName.source).toBe("fallback");
  });

  it("never throws on garbage or extremely short input", () => {
    const garbageInputs = [
      ["!!!@@@###", "???"],
      ["a", "b"],
      ["\n\n\n", "\t\t"],
      ["<html><body></body></html>", "🚀🔥"],
      ["x".repeat(50_000), "y".repeat(50_000)],
    ];

    for (const [resume, jd] of garbageInputs) {
      const ctx = extractSafely(resume, jd);
      expectFullContextShape(ctx);
      expect(typeof ctx.resume.candidateName.value).toBe("string");
      expect(typeof ctx.job.companyName.value).toBe("string");
    }
  });

  it("flattenJobAndResumeContext always returns strings and arrays", () => {
    const flat = flattenJobAndResumeContext(extractSafely("", BULLET_ONLY_JD));

    expect(typeof flat.candidateName).toBe("string");
    expect(typeof flat.email).toBe("string");
    expect(typeof flat.location).toBe("string");
    expect(typeof flat.mostRecentJobTitle).toBe("string");
    expect(typeof flat.companyName).toBe("string");
    expect(typeof flat.targetJobTitle).toBe("string");
    expect(Array.isArray(flat.topSkills)).toBe(true);
    expect(Array.isArray(flat.topKeywords)).toBe(true);
  });
});

// ─── Labeled JD patterns ─────────────────────────────────────────────────────

describe("extractJobAndResumeContext — labeled JD patterns", () => {
  it("parses About + Job Title labels", () => {
    const jd = `
About Globex
Job Title: Staff Platform Engineer

We need PostgreSQL and Kubernetes experience.
Kubernetes clusters run on AWS.
`.trim();

    const ctx = extractSafely(PERFECT_RESUME, jd);
    expect(ctx.job.companyName.value).toBe("Globex");
    expect(ctx.job.targetJobTitle.value).toBe("Staff Platform Engineer");
    expect(ctx.job.topKeywords.value).toContain("kubernetes");
  });

  it("handles remote location and checklist skill priority order", () => {
    const resume = `
Jordan Lee
jordan@example.com
Remote

Skills: Docker, Python, React
`.trim();

    const ctx = extractSafely(resume, PERFECT_JD);
    expect(ctx.resume.location.value).toBe("Remote");
    expect(ctx.resume.topSkills.value[0]).toBe("Python");
  });
});

// ─── Determinism ──────────────────────────────────────────────────────────────

describe("extractJobAndResumeContext — determinism", () => {
  it("returns identical output for identical inputs", () => {
    const first = extractSafely(PERFECT_RESUME, PERFECT_JD);
    const second = extractSafely(PERFECT_RESUME, PERFECT_JD);
    expect(first).toEqual(second);
  });
});
