import type { JDIntelligence, ResumeEnhanceDirective } from "@/lib/job-tracker/jd/jd-intelligence";
import type { JdSkillsVocabulary } from "@/lib/job-tracker/jd/jd-skills-types";
import { tokenizeJobText } from "@/lib/job-tracker/jd/keyword-extract";
import type { JdAtom } from "@/lib/job-tracker/enhance/enhance-brief";

function atomFromLabel(label: string, tier: 1 | 2 | 3, id: string): JdAtom {
  const tokens = tokenizeJobText(label);
  return {
    id,
    label,
    tier,
    tokens: tokens.length > 0 ? tokens : [label.toLowerCase()],
  };
}

export function buildJdAtomList(
  intelligence: JDIntelligence,
  directive: ResumeEnhanceDirective,
  jdVocabulary?: JdSkillsVocabulary,
): JdAtom[] {
  const seen = new Set<string>();
  const atoms: JdAtom[] = [];
  let idx = 0;

  function add(label: string, tier: 1 | 2 | 3) {
    const key = label.toLowerCase().trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    atoms.push(atomFromLabel(label, tier, `atom-${idx++}`));
  }

  for (const skill of jdVocabulary?.skills ?? []) {
    add(skill.label, skill.tier ?? 1);
  }

  for (const kw of intelligence.tier1Keywords) {
    add(kw, 1);
  }

  for (const kw of directive.mustWeaveKeywords.slice(0, 15)) {
    add(kw, 1);
  }

  for (const kw of intelligence.tier2Keywords.slice(0, 10)) {
    add(kw, 2);
  }

  for (const d of intelligence.deliverables?.slice(0, 8) ?? []) {
    add(d, 2);
  }

  return atoms.slice(0, 25);
}
