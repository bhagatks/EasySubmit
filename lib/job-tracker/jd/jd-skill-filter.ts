/**
 * Shared JD skill candidate filtering — deterministic extract + skills merge.
 * Rejects taxonomy fragments (e.g. "big" from "Big Data") and HR marketing noise.
 */

import { isBannedSkill } from "@/lib/resume/skills-rules";
import { MASTER_SKILLS } from "@/src/lib/constants/skills";
import { MASTER_SKILLS_SET } from "@/lib/job-tracker/jd/keyword-extract";

const MASTER_BY_LOWER = new Map(
  MASTER_SKILLS.map((skill) => [skill.toLowerCase(), skill] as const),
);

/** Single tokens that match substrings of compound MASTER_SKILLS but are not valid alone. */
export const JD_SKILL_FRAGMENT_BAN = new Set([
  "big",
  "first",
  "care",
  "patient",
  "annual",
  "direct",
  "job",
  "investment",
  "access",
  "health",
  "quality",
  "influence",
  "patient",
]);

/** HR / benefits marketing tokens — never skills. */
export const JD_HR_NOISE_TOKENS = new Set([
  ...JD_SKILL_FRAGMENT_BAN,
  "think",
  "life",
  "changing",
  "career",
  "benefits",
  "insurance",
  "holiday",
  "holidays",
  "pto",
  "dental",
  "vision",
  "medical",
  "unlimited",
  "learning",
  "linkedin",
]);

function titleCaseWords(label: string): string {
  return label
    .split(/[\s-/]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatJdSkillLabel(label: string): string {
  const canonical = MASTER_BY_LOWER.get(label.toLowerCase().trim());
  if (canonical) return canonical;
  return titleCaseWords(label.trim());
}

/**
 * Returns canonical MASTER_SKILLS label or null if the candidate should be dropped.
 */
export function canonicalizeJdSkillLabel(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  if (JD_HR_NOISE_TOKENS.has(lower)) return null;
  if (isBannedSkill(trimmed)) return null;

  if (MASTER_SKILLS_SET.has(lower)) {
    return MASTER_BY_LOWER.get(lower)!;
  }

  const wordCount = lower.split(/\s+/).filter(Boolean).length;
  if (wordCount === 1 && JD_SKILL_FRAGMENT_BAN.has(lower)) {
    return null;
  }

  if (wordCount >= 2 && MASTER_SKILLS_SET.has(lower)) {
    return MASTER_BY_LOWER.get(lower)!;
  }

  if (wordCount >= 2) {
    return null;
  }

  return null;
}

/** Dedupe parent/child skill labels (e.g. drop "Patient" when "Patient Care" exists). */
export function dedupeRelatedSkillLabels(skills: string[]): string[] {
  const normalized = skills.map((s) => s.trim()).filter(Boolean);
  const lowerSet = new Set(normalized.map((s) => s.toLowerCase()));

  return normalized.filter((skill) => {
    const key = skill.toLowerCase();
    for (const other of lowerSet) {
      if (other === key) continue;
      if (other.includes(key) && other.length > key.length + 2) {
        return false;
      }
    }
    return true;
  });
}

export function filterJdSkillLabels(rawLabels: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of rawLabels) {
    const canonical = canonicalizeJdSkillLabel(raw);
    if (!canonical) continue;
    const key = canonical.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(canonical);
  }

  return dedupeRelatedSkillLabels(out);
}

/** Drop clinical-only JD skills when experience has no healthcare/patient anchor. */
const SKILLS_REQUIRING_CLINICAL_ANCHOR = new Set(["patient care"]);

export function filterSkillsRequiringExperienceAnchor(
  skills: string[],
  experienceBlob: string,
): string[] {
  const blob = experienceBlob.toLowerCase();
  const hasClinical = /\b(patient|clinical|medical|healthcare|hospital|medtech|care delivery)\b/.test(
    blob,
  );
  if (hasClinical) return skills;
  return skills.filter((s) => !SKILLS_REQUIRING_CLINICAL_ANCHOR.has(s.toLowerCase()));
}

/** Keywords safe to show in Missing keywords UI — canonical skills only, no HR noise. */
export function filterReportableMissingKeywords(
  keywords: string[],
  experienceBlob?: string,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const kw of keywords) {
    const canonical = canonicalizeJdSkillLabel(kw);
    if (!canonical) continue;
    const key = canonical.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(canonical);
  }

  if (experienceBlob) {
    return filterSkillsRequiringExperienceAnchor(out, experienceBlob);
  }
  return out;
}
