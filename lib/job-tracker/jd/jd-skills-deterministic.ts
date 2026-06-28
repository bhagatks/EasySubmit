import { analyzeJobDescriptionSync } from "@/lib/job-tracker/jd/jd-brain";
import { extractRankedKeywords } from "@/lib/job-tracker/jd/keyword-extract";
import {
  canonicalizeJdSkillLabel,
  formatJdSkillLabel,
} from "@/lib/job-tracker/jd/jd-skill-filter";
import type { JdSkillEntry } from "@/lib/job-tracker/jd/jd-skills-types";
import { MASTER_SKILLS } from "@/src/lib/constants/skills";

const MASTER_BY_LOWER = new Map(
  MASTER_SKILLS.map((s) => [s.toLowerCase(), s] as const),
);

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

  function push(raw: string, tier: 1 | 2 | 3, source: JdSkillEntry["source"] = "deterministic") {
    const canonical = canonicalizeJdSkillLabel(raw);
    if (!canonical) return;
    const key = canonical.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    entries.push({
      label: formatJdSkillLabel(canonical),
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
    push(kw, 1);
  }

  for (const kw of intelligence.tier2Keywords) {
    push(kw, 2);
  }

  for (const kw of extractRankedKeywords(jd, 30)) {
    if (!MASTER_BY_LOWER.has(kw.toLowerCase())) continue;
    push(kw, 3);
  }

  return entries.sort((a, b) => b.confidence - a.confidence);
}
