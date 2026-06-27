import { analyzeJobDescriptionSync } from "@/lib/job-tracker/jd/jd-brain";
import {
  extractKnownSkillsFromText,
  extractRankedKeywords,
  isKnownSkillToken,
} from "@/lib/job-tracker/jd/keyword-extract";
import type { JdSkillEntry } from "@/lib/job-tracker/jd/jd-skills-types";
import { MASTER_SKILLS } from "@/src/lib/constants/skills";

const MASTER_BY_LOWER = new Map(
  MASTER_SKILLS.map((s) => [s.toLowerCase(), s] as const),
);

function titleCaseSkill(label: string): string {
  const canonical = MASTER_BY_LOWER.get(label.toLowerCase());
  if (canonical) return canonical;
  if (label.length <= 4) return label.toUpperCase();
  return label
    .split(/[\s-/]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function tierConfidence(tier: 1 | 2 | 3): number {
  if (tier === 1) return 0.9;
  if (tier === 2) return 0.7;
  return 0.5;
}

/** Deterministic JD skill extraction — zero network, always runs. */
export function extractDeterministicJdSkills(input: {
  jobDescription: string;
  targetRole: string;
  jobTitle?: string;
}): JdSkillEntry[] {
  const jd = input.jobDescription.trim();
  if (!jd) return [];

  const { intelligence } = analyzeJobDescriptionSync(jd, input.targetRole);
  const seen = new Set<string>();
  const entries: JdSkillEntry[] = [];

  function push(label: string, tier: 1 | 2 | 3, source: JdSkillEntry["source"] = "deterministic") {
    const key = label.toLowerCase().trim();
    if (!key || seen.has(key)) return;
    if (!isKnownSkillToken(key) && source === "deterministic" && tier > 1) {
      const looksTechnical = /[#+/]|\.(js|ts|py)|\d/.test(key) || key.includes("-");
      if (!looksTechnical && key.split(/\s+/).length > 3) return;
    }
    seen.add(key);
    entries.push({
      label: titleCaseSkill(label),
      normalized: MASTER_BY_LOWER.get(key),
      source,
      confidence: tierConfidence(tier),
      tier,
    });
  }

  for (const skill of intelligence.mustHaveSkills) {
    push(skill, 1);
  }

  for (const kw of intelligence.tier1Keywords) {
    if (isKnownSkillToken(kw)) push(kw, 1);
  }

  for (const kw of intelligence.tier2Keywords) {
    if (isKnownSkillToken(kw)) push(kw, 2);
  }

  for (const skill of extractKnownSkillsFromText(jd)) {
    push(skill, 2);
  }

  for (const kw of extractRankedKeywords(jd, 30)) {
    if (isKnownSkillToken(kw)) push(kw, 3);
  }

  return entries.sort((a, b) => b.confidence - a.confidence);
}
