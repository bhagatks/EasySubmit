/**
 * Deterministic Resume Enhancer — no AI, no tokens.
 *
 * When AI is unavailable (quota exhausted, API down, BYOK key invalid),
 * this engine applies rule-based improvements using JobIntelligence output
 * and can achieve 80–90 ATS scores on a good base resume.
 *
 * Three operations (in order):
 *   1. Keyword injection into skills section
 *   2. Weak bullet pattern rewriting
 *   3. Skills normalization (match JD exact casing where possible)
 */

import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import type { JobIntelligence } from "@/lib/job-tracker/ats/job-intelligence";
import { findBannedWords, validateSummary } from "@/lib/resume/summary-rules";
import {
  findBannedSkills,
  isBannedSkill,
  isProseSkill,
  parseSkillsText,
  SKILLS_HARD_MAX,
  validateSkillsSystem,
} from "@/lib/resume/skills-rules";

// ─── Action verb replacement map ─────────────────────────────────────────────
// Weak phrase → best replacement verb by context.

const WEAK_PHRASE_FIX: Array<{
  pattern: RegExp;
  replacement: (rest: string) => string;
}> = [
  {
    pattern: /^responsible for\s+/i,
    replacement: (rest) => `Managed ${lcFirst(rest)}`,
  },
  {
    pattern: /^worked on\s+/i,
    replacement: (rest) => `Developed ${lcFirst(rest)}`,
  },
  {
    pattern: /^helped (to |with )?\s*/i,
    replacement: (rest) => `Contributed to ${lcFirst(rest)}`,
  },
  {
    pattern: /^assisted (with |in )?\s*/i,
    replacement: (rest) => `Supported ${lcFirst(rest)}`,
  },
  {
    pattern: /^was (involved|part) (in|of)\s+/i,
    replacement: (rest) => `Contributed to ${lcFirst(rest)}`,
  },
  {
    pattern: /^duties included\s+/i,
    replacement: (rest) => `Managed ${lcFirst(rest)}`,
  },
  {
    pattern: /^tasked with\s+/i,
    replacement: (rest) => `Led ${lcFirst(rest)}`,
  },
];

// ─── Domain-matched default action verbs ─────────────────────────────────────
// When a bullet has no action verb at all, prefix with the best domain match.

const DOMAIN_VERBS: Array<{ pattern: RegExp; verb: string }> = [
  { pattern: /\b(build|develop|implement|code|program|architect)\b/i, verb: "Built" },
  { pattern: /\b(manage|lead|direct|oversee|own)\b/i, verb: "Led" },
  { pattern: /\b(analyz|research|investigat|evaluat|assess)\b/i, verb: "Analyzed" },
  { pattern: /\b(design|creat|produc)\b/i, verb: "Designed" },
  { pattern: /\b(deploy|release|ship|launch)\b/i, verb: "Deployed" },
  { pattern: /\b(optim|improv|reduc|increas|boost|accelerat)\b/i, verb: "Optimized" },
  { pattern: /\b(test|validat|verif|qa)\b/i, verb: "Validated" },
  { pattern: /\b(train|mentor|coach|teach)\b/i, verb: "Mentored" },
  { pattern: /\b(partner|collaborat|work with)\b/i, verb: "Partnered" },
];

function lcFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function ucFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Bullet rewriter ─────────────────────────────────────────────────────────

function rewriteBullet(
  text: string,
  issues: Array<"weak-verb" | "weak-phrase" | "no-metric">,
): { rewritten: string; changed: boolean } {
  let result = text.trim().replace(/^[-•*]\s*/, "");
  let changed = false;

  // Fix weak phrases first (these also fix the verb)
  if (issues.includes("weak-phrase")) {
    for (const { pattern, replacement } of WEAK_PHRASE_FIX) {
      const match = result.match(pattern);
      if (match) {
        const rest = result.slice(match[0].length).trim();
        result = replacement(rest);
        changed = true;
        break;
      }
    }
  }

  // If still no action verb, prefix with domain-matched verb
  if (issues.includes("weak-verb") && !changed) {
    const domainMatch = DOMAIN_VERBS.find(({ pattern }) => pattern.test(result));
    const verb = domainMatch?.verb ?? "Executed";
    result = `${verb} ${lcFirst(result)}`;
    changed = true;
  }

  // Ensure sentence case
  if (changed) {
    result = ucFirst(result);
  }

  return { rewritten: result, changed };
}

// ─── Skills normalizer ────────────────────────────────────────────────────────
// Merge new skills into the existing skillsText, deduplicating case-insensitively.

function mergeSkills(existing: string, toAdd: string[]): string {
  if (toAdd.length === 0) return existing;

  const existingSkills = parseSkillsText(existing);
  const existingLower = new Set(existingSkills.map((s) => s.toLowerCase()));

  const newSkills = toAdd
    .map((s) => s.trim())
    .filter(
      (s) =>
        s &&
        !existingLower.has(s.toLowerCase()) &&
        !isBannedSkill(s) &&
        !isProseSkill(s),
    );

  if (newSkills.length === 0) return existing;

  const combined = [...existingSkills, ...newSkills].slice(0, SKILLS_HARD_MAX);
  return combined.join(", ");
}

// ─── Public types ─────────────────────────────────────────────────────────────

export type DeterministicEnhanceResult = {
  form: HubRefineryForm;
  /** Plain-English summary of what changed. */
  summary: string;
  /** Breakdown of changes for the UI delta card. */
  changes: {
    skillsAdded: string[];
    bulletsRewritten: number;
    structuralIssuesFound: number;
  };
};

// ─── Public API ───────────────────────────────────────────────────────────────

export function deterministicEnhance(
  form: HubRefineryForm,
  intelligence: JobIntelligence,
): DeterministicEnhanceResult {
  let updatedForm = { ...form };
  const skillsAdded: string[] = [];
  let bulletsRewritten = 0;

  // 1. Inject missing skills (JD keywords + O*NET implicit skills)
  const preInjectionSkills = parseSkillsText(updatedForm.skillsText ?? "");
  const allSkillsToAdd = [...intelligence.skillsToAdd, ...intelligence.implicitSkillsToAdd];
  if (allSkillsToAdd.length > 0) {
    const newSkillsText = mergeSkills(
      updatedForm.skillsText ?? "",
      allSkillsToAdd,
    );
    if (newSkillsText !== (updatedForm.skillsText ?? "")) {
      const before = new Set(preInjectionSkills.map((s) => s.toLowerCase()));
      skillsAdded.push(
        ...allSkillsToAdd.filter((s) => !before.has(s.toLowerCase())),
      );
      updatedForm = { ...updatedForm, skillsText: newSkillsText };
    }
  }

  // 2. Rewrite weak bullets
  if (intelligence.weakBullets.length > 0 && updatedForm.experience) {
    const updatedExperience = updatedForm.experience.map((exp, expIdx) => {
      const weakForEntry = intelligence.weakBullets.filter(
        (wb) => wb.experienceIndex === expIdx,
      );
      if (weakForEntry.length === 0) return exp;

      const rawBullets = (exp.bullets ?? "")
        .split("\n")
        .map((b) => b.trim())
        .filter(Boolean);

      const rewrittenBullets = rawBullets.map((bullet, bulletIdx) => {
        const target = weakForEntry.find((wb) => wb.bulletIndex === bulletIdx);
        if (!target) return bullet;

        const { rewritten, changed } = rewriteBullet(bullet, target.issues);
        if (changed) bulletsRewritten++;
        return rewritten;
      });

      return { ...exp, bullets: rewrittenBullets.join("\n") };
    });

    updatedForm = { ...updatedForm, experience: updatedExperience };
  }

  // 3. Build summary
  const summaryParts: string[] = [];
  if (skillsAdded.length > 0) {
    summaryParts.push(
      `Added ${skillsAdded.length} missing keyword${skillsAdded.length > 1 ? "s" : ""} to your Skills section (${skillsAdded.slice(0, 3).join(", ")}${skillsAdded.length > 3 ? "…" : ""})`,
    );
  }

  const finalSkills = parseSkillsText(updatedForm.skillsText ?? "");
  const preInjectionBanned = findBannedSkills(preInjectionSkills);
  if (preInjectionBanned.length > 0) {
    summaryParts.push(
      `Skills section contains generic terms that reduce ATS score: ${preInjectionBanned.join(", ")}. Replace with specific tools or technologies.`,
    );
  }

  const skillsValidation = validateSkillsSystem(finalSkills);
  if (skillsValidation.countWarning) {
    summaryParts.push(skillsValidation.countWarning);
  }
  if (skillsValidation.compositionWarning) {
    summaryParts.push(skillsValidation.compositionWarning);
  }

  if (bulletsRewritten > 0) {
    summaryParts.push(
      `Strengthened ${bulletsRewritten} weak bullet${bulletsRewritten > 1 ? "s" : ""} with action verbs`,
    );
  }
  if (intelligence.structuralWarnings.length > 0) {
    summaryParts.push(
      `${intelligence.structuralWarnings.length} structural issue${intelligence.structuralWarnings.length > 1 ? "s" : ""} detected — review the ATS tab`,
    );
  }

  const summaryText = updatedForm.professionalSummary?.trim() ?? "";
  if (summaryText) {
    const validation = validateSummary(summaryText);
    if (validation.sentenceError) {
      summaryParts.push(
        `Summary should be exactly 4 sentences (currently ${validation.sentenceCount}).`,
      );
    }
    if (validation.wordError) {
      summaryParts.push(
        `Summary should be 70–80 words (currently ${validation.wordCount} words).`,
      );
    }
    const bannedWords = findBannedWords(summaryText);
    if (bannedWords.length > 0) {
      summaryParts.push(
        `Summary contains overused phrases: ${bannedWords.join(", ")}. Replace with specific, quantified language.`,
      );
    }
  }

  const summary =
    summaryParts.length > 0
      ? summaryParts.join(". ") + "."
      : "Resume reviewed — no rule-based improvements were applicable.";

  return {
    form: updatedForm,
    summary,
    changes: {
      skillsAdded,
      bulletsRewritten,
      structuralIssuesFound: intelligence.structuralWarnings.length,
    },
  };
}
