/**
 * Bullet quality engine — evaluates every resume bullet against ATS best
 * practices and hiring manager expectations.
 *
 * Three signals per bullet:
 *   1. Action verb — first word must be a strong past-tense verb
 *   2. Quantification — contains a measurable result (%, $, x, count)
 *   3. Weak language — flags "responsible for", "helped", etc.
 */

import type { PrimeResumeData } from "@/components/onboarding/PrimeResume";
import {
  bulletHasStrongOpening,
  firstWordOfBullet,
} from "@/lib/resume/resume-bullet-verbs";

// ─── AI / buzzword phrase blacklist ───────────────────────────────────────────
// These phrases signal AI-generated or vague copy that hiring managers and
// ATS context-checkers flag as low-signal. Sourced from Resume-Matcher's list
// and augmented with EasySubmit's own observations.

const AI_PHRASES: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bspearheaded\b/i, label: "spearheaded" },
  { pattern: /\bleveraged\b/i, label: "leveraged" },
  { pattern: /\borchestrated\b/i, label: "orchestrated" },
  { pattern: /\bsynergize[ds]?\b/i, label: "synergized" },
  { pattern: /\bsynergistic\b/i, label: "synergistic" },
  { pattern: /\bparadigm shift\b/i, label: "paradigm shift" },
  { pattern: /\bthought leader\b/i, label: "thought leader" },
  { pattern: /\bseamlessly\b/i, label: "seamlessly" },
  { pattern: /\brobust\b/i, label: "robust" },
  { pattern: /\bstrategic(?:ally)? aligned\b/i, label: "strategically aligned" },
  { pattern: /\bworld[- ]class\b/i, label: "world-class" },
  { pattern: /\bcutting[- ]edge\b/i, label: "cutting-edge" },
  { pattern: /\bstate[- ]of[- ]the[- ]art\b/i, label: "state-of-the-art" },
  { pattern: /\bgame[- ]chang(?:ing|er)\b/i, label: "game-changing" },
  { pattern: /\binnovative solution\b/i, label: "innovative solution" },
  { pattern: /\bpassionate about\b/i, label: "passionate about" },
  { pattern: /\bdriven by\b/i, label: "driven by" },
  { pattern: /\bpivot(?:ed|ing)?\b/i, label: "pivoted" },
  { pattern: /\bholistic(?:ally)?\b/i, label: "holistically" },
  { pattern: /\bempowered\b/i, label: "empowered" },
  { pattern: /\bproactive(?:ly)?\b/i, label: "proactively" },
  { pattern: /\bsolution[- ]oriented\b/i, label: "solution-oriented" },
  { pattern: /\bvalue[- ]add(?:ed)?\b/i, label: "value-add" },
  { pattern: /\boutside the box\b/i, label: "outside the box" },
  { pattern: /\bgo[- ]to[- ]person\b/i, label: "go-to person" },
];

// ─── Weak phrases ──────────────────────────────────────────────────────────────

const WEAK_PHRASES: Array<{ pattern: RegExp; suggestion: string }> = [
  {
    pattern: /\bresponsible for\b/i,
    suggestion: 'Replace "responsible for" with an action verb — e.g. "Led", "Managed", "Owned".',
  },
  {
    pattern: /\bworked on\b/i,
    suggestion: 'Replace "worked on" with what you did — e.g. "Built", "Developed", "Improved".',
  },
  {
    pattern: /\bhelped (to |with )?\b/i,
    suggestion: 'Replace "helped" — own the action directly, e.g. "Contributed to", "Implemented".',
  },
  {
    pattern: /\bassisted (with |in )?\b/i,
    suggestion: 'Replace "assisted" with your specific contribution.',
  },
  {
    pattern: /\bwas (involved|part) (in|of)\b/i,
    suggestion: 'State your specific role instead of "was involved/part of".',
  },
  {
    pattern: /\bduties included\b/i,
    suggestion: 'Replace "duties included" — start with an action verb.',
  },
  {
    pattern: /\btasked with\b/i,
    suggestion: 'Replace "tasked with" — start with an action verb.',
  },
];

// ─── Quantification detector ───────────────────────────────────────────────────

// Matches: 40%, $2M, 3x, 500 users, 2 hours, reduced by 30, etc.
const QUANTIFICATION_PATTERN =
  /\b(\d+[\d,]*\.?\d*\s*(%|x|×|million|billion|k\b|m\b|ms\b|s\b|min|hour|day|week|month|year|users?|customers?|requests?|engineers?|teams?|services?|repos?|pipelines?|errors?|bugs?|tickets?|releases?)|\$[\d,]+|\d+[\d,]*\s*(times|fold))/i;

// ─── Types ─────────────────────────────────────────────────────────────────────

export type BulletIssue = {
  type: "weak-verb" | "weak-phrase" | "no-metric" | "ai-phrase";
  message: string;
};

export type BulletAnalysis = {
  text: string;
  hasActionVerb: boolean;
  hasMetric: boolean;
  issues: BulletIssue[];
  /** 0–100 quality score for this bullet. */
  score: number;
};

export type ExperienceEntryQuality = {
  title: string;
  company: string;
  bullets: BulletAnalysis[];
  bulletCount: number;
};

export type BulletQualityResult = {
  entries: ExperienceEntryQuality[];
  /** 0–100 across all bullets. */
  overallScore: number;
  /** % of bullets with a strong action verb. */
  actionVerbRate: number;
  /** % of bullets with a quantifiable metric. */
  quantificationRate: number;
  totalBullets: number;
  bulletsWithIssues: number;
};

// ─── Analysis ─────────────────────────────────────────────────────────────────

function analyzeBullet(raw: string): BulletAnalysis {
  const text = raw.trim().replace(/^[-•*]\s*/, "");
  if (!text) {
    return { text, hasActionVerb: false, hasMetric: false, issues: [], score: 0 };
  }

  const firstWord = firstWordOfBullet(text).toLowerCase();
  const hasActionVerb = bulletHasStrongOpening(text);
  const hasMetric = QUANTIFICATION_PATTERN.test(text);
  const issues: BulletIssue[] = [];

  if (!hasActionVerb) {
    issues.push({
      type: "weak-verb",
      message: `Starts with "${text.split(/\s+/)[0] ?? ""}" — use a strong action verb (e.g. Led, Built, Reduced).`,
    });
  }

  for (const { pattern, suggestion } of WEAK_PHRASES) {
    if (pattern.test(text)) {
      issues.push({ type: "weak-phrase", message: suggestion });
      break; // one weak-phrase flag per bullet is enough
    }
  }

  for (const { pattern, label } of AI_PHRASES) {
    if (pattern.test(text)) {
      issues.push({
        type: "ai-phrase",
        message: `"${label}" is an AI/buzzword phrase — replace with a specific, concrete action.`,
      });
      break; // one ai-phrase flag per bullet is enough
    }
  }

  if (!hasMetric) {
    issues.push({
      type: "no-metric",
      message: "Add a measurable result — %, $, time saved, count, or scale.",
    });
  }

  // Score: 40pts for action verb, 35pts for metric, 15pts for no weak/AI phrases
  const weakPhraseFlag = issues.some((i) => i.type === "weak-phrase" || i.type === "ai-phrase");
  const score =
    (hasActionVerb ? 40 : 0) +
    (hasMetric ? 35 : 0) +
    (!weakPhraseFlag ? 25 : 0);

  return { text, hasActionVerb, hasMetric, issues, score };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function analyzeBulletQuality(data: PrimeResumeData): BulletQualityResult {
  const entries: ExperienceEntryQuality[] = [];
  let totalScore = 0;
  let totalBullets = 0;
  let bulletsWithActionVerb = 0;
  let bulletsWithMetric = 0;
  let bulletsWithIssues = 0;

  for (const exp of data.experience ?? []) {
    const rawBullets = (exp.bullets ?? []).map((b) => b.trim()).filter(Boolean);
    if (rawBullets.length === 0) continue;

    const bulletAnalyses = rawBullets.map(analyzeBullet);

    for (const b of bulletAnalyses) {
      totalBullets++;
      totalScore += b.score;
      if (b.hasActionVerb) bulletsWithActionVerb++;
      if (b.hasMetric) bulletsWithMetric++;
      if (b.issues.length > 0) bulletsWithIssues++;
    }

    entries.push({
      title: exp.title?.trim() || "Role",
      company: exp.company?.trim() || "",
      bullets: bulletAnalyses,
      bulletCount: bulletAnalyses.length,
    });
  }

  const overallScore = totalBullets === 0 ? 0 : Math.round(totalScore / totalBullets);
  const actionVerbRate =
    totalBullets === 0 ? 0 : Math.round((bulletsWithActionVerb / totalBullets) * 100);
  const quantificationRate =
    totalBullets === 0 ? 0 : Math.round((bulletsWithMetric / totalBullets) * 100);

  return {
    entries,
    overallScore,
    actionVerbRate,
    quantificationRate,
    totalBullets,
    bulletsWithIssues,
  };
}
