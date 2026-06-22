/**
 * Deterministic cover letter generator — maps parser output to the template matrix.
 *
 * Pure functions only in this file (safe for server + client).
 * React integration: {@link useCoverLetterGenerator} in ./useCoverLetterGenerator.ts
 */

import {
  COVER_LETTER_TEMPLATE_MATRIX,
  composeCoverLetterFromMatrix,
  type CoverLetterComposition,
  type CoverLetterTemplatePlaceholders,
} from "@/lib/job-tracker/cover-letter-template-matrix";
import type { JobContext, ResumeContext } from "@/lib/job-tracker/extract-job-resume-context";
import {
  JOB_CONTEXT_FALLBACKS,
  RESUME_CONTEXT_FALLBACKS,
} from "@/lib/job-tracker/extract-job-resume-context";

// ─── Input / output types ─────────────────────────────────────────────────────

/** Parser output for the candidate side (`extractJobAndResumeContext().resume`). */
export type CoverLetterGeneratorResumeData = ResumeContext;

/** Parser output for the job side (`extractJobAndResumeContext().job`). */
export type CoverLetterGeneratorJdData = JobContext;

export type CoverLetterGeneratorInput = {
  resumeData: CoverLetterGeneratorResumeData;
  jdData: CoverLetterGeneratorJdData;
  placeholders?: CoverLetterTemplatePlaceholders;
};

export type CoverLetterTemplateIndices = {
  opening: 0 | 1 | 2;
  experienceBlock: 0 | 1 | 2;
  whyCompany: 0 | 1 | 2;
  closing: 0 | 1 | 2;
  /** @deprecated Use experienceBlock */
  bodyAlignment?: 0 | 1 | 2;
};

export type CoverLetterGeneratorSuccess = {
  ok: true;
  /** Full letter in plain Markdown, ready to copy or export. */
  markdown: string;
  composition: CoverLetterComposition;
  indices: CoverLetterTemplateIndices;
  placeholders: CoverLetterTemplatePlaceholders;
  /** Non-fatal issues (e.g. parser fallbacks used). */
  warnings: string[];
};

export type CoverLetterGeneratorFailure = {
  ok: false;
  error: string;
  code: "missing_resume" | "missing_jd" | "compose_failed" | "invalid_input";
};

export type CoverLetterGeneratorResult =
  | CoverLetterGeneratorSuccess
  | CoverLetterGeneratorFailure;

const TIER_COUNT = 3 as const;

// ─── Hash + index selection ───────────────────────────────────────────────────

/**
 * Small deterministic string hash (djb2-style).
 * Same input → same uint32 — used to pin template variation per company.
 */
export function hashCoverLetterSeed(seed: string): number {
  const normalized = seed.trim().toLowerCase() || "company";
  let hash = 5381;
  for (let index = 0; index < normalized.length; index++) {
    hash = (hash * 33) ^ normalized.charCodeAt(index);
  }
  return hash >>> 0;
}

/**
 * Map a company name to stable template indices (0–2 per tier).
 * Shifts bit windows so tiers vary independently from one seed.
 */
export function selectCoverLetterTemplateIndices(company: string): CoverLetterTemplateIndices {
  const hash = hashCoverLetterSeed(company);
  return {
    opening: (hash % TIER_COUNT) as 0 | 1 | 2,
    experienceBlock: ((hash >>> 5) % TIER_COUNT) as 0 | 1 | 2,
    whyCompany: ((hash >>> 10) % TIER_COUNT) as 0 | 1 | 2,
    // Shifted from >>>10 (v1) to >>>15 (v2) to reduce correlation with whyCompany tier.
    // Existing stored cover letters (rendered markdown) are unaffected; only new generations differ.
    closing: ((hash >>> 15) % TIER_COUNT) as 0 | 1 | 2,
  };
}

export function indicesToComposition(indices: CoverLetterTemplateIndices): CoverLetterComposition {
  return {
    openingId: COVER_LETTER_TEMPLATE_MATRIX.openings[indices.opening].id,
    experienceBlockId:
      COVER_LETTER_TEMPLATE_MATRIX.experienceBlocks[indices.experienceBlock].id,
    whyCompanyId: COVER_LETTER_TEMPLATE_MATRIX.whyCompany[indices.whyCompany].id,
    closingId: COVER_LETTER_TEMPLATE_MATRIX.closings[indices.closing].id,
  };
}

// ─── Placeholder + markdown assembly ──────────────────────────────────────────

function pickTopSkill(resumeData: ResumeContext, jdData: JobContext): string {
  const resumeSkill = resumeData.topSkills.value[0]?.trim();
  if (resumeSkill) return resumeSkill;

  const jdKeyword = jdData.topKeywords.value[0]?.trim();
  if (jdKeyword) {
    return jdKeyword.charAt(0).toUpperCase() + jdKeyword.slice(1);
  }

  return "core technical work";
}

function buildDefaultPlaceholders(
  resumeData: ResumeContext,
  jdData: JobContext,
): CoverLetterTemplatePlaceholders {
  const skills = resumeData.topSkills.value;
  const keywords = jdData.topKeywords.value;
  const topSkill = pickTopSkill(resumeData, jdData);

  return {
    company: jdData.companyName.value.trim() || JOB_CONTEXT_FALLBACKS.companyName,
    targetTitle:
      jdData.targetJobTitle.value.trim() || JOB_CONTEXT_FALLBACKS.targetJobTitle,
    topSkill,
    secondSkill: skills[1]?.trim() || "cross-functional delivery",
    thirdSkill: skills[2]?.trim() || "operational reliability",
    priorTitle:
      resumeData.mostRecentJobTitle.value.trim() ||
      RESUME_CONTEXT_FALLBACKS.mostRecentJobTitle,
    priorCompany: "my recent employer",
    jdKeyword: keywords[0]
      ? keywords[0].charAt(0).toUpperCase() + keywords[0].slice(1)
      : topSkill,
    jdKeyword2: keywords[1]
      ? keywords[1].charAt(0).toUpperCase() + keywords[1].slice(1)
      : "team collaboration",
    achievementLine:
      "I have a consistent record of shipping dependable work with clear ownership and measurable results.",
    summarySnippet: "I bring a steady, hands-on approach to complex technical work.",
  };
}

function collectParserWarnings(
  resumeData: ResumeContext,
  jdData: JobContext,
): string[] {
  const warnings: string[] = [];

  if (resumeData.candidateName.source === "fallback") {
    warnings.push("Candidate name could not be parsed; using a generic signature.");
  }
  if (resumeData.topSkills.source === "fallback") {
    warnings.push("No checklist skills found on resume; using JD keyword or generic skill.");
  }
  if (resumeData.mostRecentJobTitle.source === "fallback") {
    warnings.push("Most recent job title could not be parsed.");
  }
  if (jdData.companyName.source === "fallback") {
    warnings.push("Company name could not be parsed from the job description.");
  }
  if (jdData.targetJobTitle.source === "fallback") {
    warnings.push("Target job title could not be parsed from the job description.");
  }

  return warnings;
}

function buildContactHeader(resumeData: ResumeContext): string[] {
  const lines: string[] = [];
  const name = resumeData.candidateName.value.trim();
  const email = resumeData.email.value.trim();
  const location = resumeData.location.value.trim();

  if (name) lines.push(name);
  if (email) lines.push(email);
  if (location && location !== RESUME_CONTEXT_FALLBACKS.location) {
    lines.push(location);
  }

  return lines;
}

function buildSignature(resumeData: ResumeContext): string {
  const name = resumeData.candidateName.value.trim();
  return name ? `Sincerely,\n${name}` : "Sincerely,";
}

/**
 * Assemble matrix blocks + optional contact header + signature into Markdown.
 */
export function assembleCoverLetterMarkdown(input: {
  body: string;
  resumeData: ResumeContext;
}): string {
  const sections: string[] = [];
  const contact = buildContactHeader(input.resumeData);

  if (contact.length > 0) {
    sections.push(contact.join("\n"));
  }

  sections.push(input.body.trim());
  sections.push(buildSignature(input.resumeData));

  return sections.join("\n\n").trim();
}

// ─── Main generator ─────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isResumeContext(value: unknown): value is ResumeContext {
  if (!isRecord(value)) return false;
  return (
    isRecord(value.candidateName) &&
    typeof value.candidateName.value === "string" &&
    isRecord(value.topSkills) &&
    Array.isArray(value.topSkills.value)
  );
}

function isJobContext(value: unknown): value is JobContext {
  if (!isRecord(value)) return false;
  return (
    isRecord(value.companyName) &&
    typeof value.companyName.value === "string" &&
    isRecord(value.targetJobTitle) &&
    typeof value.targetJobTitle.value === "string"
  );
}

/**
 * Generate a cover letter from parser output + template matrix.
 *
 * Template variation is keyed by company name — the same company always yields
 * the same opening / body / closing combination.
 */
export function generateCoverLetter(
  input: CoverLetterGeneratorInput | null | undefined,
): CoverLetterGeneratorResult {
  if (!input) {
    return {
      ok: false,
      error: "Cover letter input is required.",
      code: "invalid_input",
    };
  }

  const { resumeData, jdData } = input;

  if (!resumeData) {
    return {
      ok: false,
      error: "Resume data is required to generate a cover letter.",
      code: "missing_resume",
    };
  }

  if (!jdData) {
    return {
      ok: false,
      error: "Job description data is required to generate a cover letter.",
      code: "missing_jd",
    };
  }

  if (!isResumeContext(resumeData) || !isJobContext(jdData)) {
    return {
      ok: false,
      error: "Resume or job data is not in the expected parser shape.",
      code: "invalid_input",
    };
  }

  const placeholders =
    input.placeholders ?? buildDefaultPlaceholders(resumeData, jdData);
  const indices = selectCoverLetterTemplateIndices(placeholders.company);
  const composition = indicesToComposition(indices);

  const body = composeCoverLetterFromMatrix(composition, placeholders);
  if (!body) {
    return {
      ok: false,
      error: "Failed to compose cover letter from template matrix.",
      code: "compose_failed",
    };
  }

  const markdown = assembleCoverLetterMarkdown({ body, resumeData });
  const warnings = collectParserWarnings(resumeData, jdData);

  return {
    ok: true,
    markdown,
    composition,
    indices,
    placeholders,
    warnings,
  };
}
