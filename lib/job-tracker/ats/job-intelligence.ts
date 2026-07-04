/**
 * Job Intelligence — central analysis layer that combines all ATS signals
 * into a single structured object consumed by both the AI engine and the
 * deterministic fallback enhancer.
 *
 * Runs entirely client-side / server-side without AI calls.
 */

import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { refineryFormToPrimeResume } from "@/lib/onboarding/hubResume";
import { analyzeKeywordGap } from "@/lib/job-tracker/ats/keyword-gap";
import { analyzeBulletQuality } from "@/lib/job-tracker/ats/bullet-quality";
import { simulateAtsParse } from "@/lib/job-tracker/ats/ats-parse-simulator";
import { isKnownSkillToken } from "@/lib/job-tracker/jd/keyword-extract";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WeakBulletTarget = {
  experienceIndex: number;
  bulletIndex: number;
  bulletText: string;
  issues: Array<"weak-verb" | "weak-phrase" | "no-metric" | "ai-phrase">;
};

export type JobIntelligence = {
  /** Keywords missing from the resume that appear ≥2x in the JD — sorted by frequency. */
  missingKeywords: string[];
  /** Keywords that are clearly skills (short tokens, not verb phrases). */
  skillsToAdd: string[];
  /** Keywords that belong in bullet / summary context (multi-word phrases, verbs). */
  keywordsForContent: string[];
  /** Bullets with quality issues — gives AI (and fallback) exact targets. */
  weakBullets: WeakBulletTarget[];
  /** ATS parse warnings (missing fields, structural issues). */
  structuralWarnings: string[];
  /** Current keyword coverage 0–100. */
  coveragePercent: number;
  /** Whether the resume has enough content for meaningful targeting. */
  hasMinimumContent: boolean;
};

// ─── Skill vs content classifier ─────────────────────────────────────────────
// Only taxonomy-backed tokens become skillsToAdd — never raw JD English.

function classifyKeyword(kw: string): "skill" | "content" {
  if (isKnownSkillToken(kw)) return "skill";
  return "content";
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function analyzeJobIntelligence(
  form: HubRefineryForm,
  targetRole: string,
  jobDescription: string,
): JobIntelligence {
  const primeData = refineryFormToPrimeResume(form);

  const hasMinimumContent =
    (form.experience?.filter((e) => !e.hidden && e.title?.trim()).length ?? 0) >= 1;

  // Keyword gap
  const gap = analyzeKeywordGap(primeData, targetRole, jobDescription);
  const missingKeywords = gap.missing.slice(0, 20);

  const skillsToAdd: string[] = [];
  const keywordsForContent: string[] = [];
  for (const kw of missingKeywords) {
    if (classifyKeyword(kw) === "skill") {
      skillsToAdd.push(kw);
    } else {
      keywordsForContent.push(kw);
    }
  }

  // Weak bullets
  const quality = analyzeBulletQuality(primeData);
  const weakBullets: WeakBulletTarget[] = [];

  for (let ei = 0; ei < quality.entries.length; ei++) {
    const entry = quality.entries[ei]!;
    for (let bi = 0; bi < entry.bullets.length; bi++) {
      const bullet = entry.bullets[bi]!;
      if (bullet.issues.length > 0) {
        weakBullets.push({
          experienceIndex: ei,
          bulletIndex: bi,
          bulletText: bullet.text,
          issues: bullet.issues.map((i) => i.type),
        });
      }
    }
  }

  // Structural warnings
  const parsed = simulateAtsParse(primeData, targetRole);

  return {
    missingKeywords,
    skillsToAdd,
    keywordsForContent,
    weakBullets,
    structuralWarnings: parsed.warnings,
    coveragePercent: gap.coveragePercent,
    hasMinimumContent,
  };
}
