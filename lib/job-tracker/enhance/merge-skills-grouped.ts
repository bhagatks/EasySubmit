import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { refineryFormToPrimeResume } from "@/lib/onboarding/hubResume";
import type { OnetRoleVocabulary } from "@/lib/job-tracker/ats/onet-service";
import type { JdSkillsVocabulary } from "@/lib/job-tracker/jd/jd-skills-types";
import {
  isBannedSkill,
  isProseSkill,
  parseSkillsText,
  SKILLS_HARD_MAX,
} from "@/lib/resume/skills-rules";

export type GroupedSkills = {
  jdSkills: string[];
  resumeSkills: string[];
};

export function serializeGroupedSkills(grouped: GroupedSkills): string {
  const jd = grouped.jdSkills.filter(Boolean);
  const resume = grouped.resumeSkills.filter(Boolean);
  if (jd.length > 0 && resume.length > 0) {
    return `${jd.join(", ")} | ${resume.join(", ")}`;
  }
  return [...jd, ...resume].join(", ");
}

export function scoreResumeSkillRelevance(
  skill: string,
  input: {
    form: HubRefineryForm;
    targetRole: string;
    onet: OnetRoleVocabulary;
    jdSkillSet: Set<string>;
    summaryTheme?: string;
  },
): number {
  const key = skill.toLowerCase();
  if (input.jdSkillSet.has(key)) return -1;

  let score = 0;
  const summary = (input.form.professionalSummary ?? "").toLowerCase();
  if (summary.includes(key)) score += 3;

  const experiences = (input.form.experience ?? []).filter((e) => !e.hidden);
  experiences.forEach((exp, idx) => {
    const blob = `${exp.title} ${exp.company} ${exp.bullets ?? ""}`.toLowerCase();
    if (!blob.includes(key)) return;
    const recencyBoost = idx === 0 ? 8 : idx === 1 ? 5 : 2;
    score += recencyBoost;
  });

  const onetLower = new Set([
    ...input.onet.skills.map((s) => s.toLowerCase()),
    ...input.onet.tools.map((t) => t.toLowerCase()),
  ]);
  if (onetLower.has(key)) score += 4;

  if (input.summaryTheme && input.summaryTheme.toLowerCase().includes(key)) {
    score += 1;
  }

  return score;
}

export function buildGroupedSkills(input: {
  existingSkillsText: string;
  jdVocabulary: JdSkillsVocabulary;
  mustAddSkills: string[];
  keywordSkills: string[];
  skillsToRemove: string[];
  form: HubRefineryForm;
  targetRole: string;
  onet: OnetRoleVocabulary;
  summaryTheme?: string;
}): { grouped: GroupedSkills; skillsText: string; skillsAdded: string[]; overflow?: string[] } {
  const existing = parseSkillsText(input.existingSkillsText);
  const existingLower = new Set(existing.map((s) => s.toLowerCase()));
  const removeLower = new Set(input.skillsToRemove.map((s) => s.toLowerCase()));

  const jdCandidates: string[] = [];
  const seenJd = new Set<string>();

  function pushJd(label: string) {
    const key = label.toLowerCase().trim();
    if (!key || seenJd.has(key) || removeLower.has(key)) return;
    if (isBannedSkill(label) || isProseSkill(label)) return;
    seenJd.add(key);
    jdCandidates.push(label);
  }

  for (const entry of input.jdVocabulary.skills) {
    pushJd(entry.label);
  }
  for (const s of input.mustAddSkills) pushJd(s);
  for (const s of input.keywordSkills) pushJd(s);

  const jdAll = jdCandidates;
  const jdSkills = jdAll.slice(0, SKILLS_HARD_MAX);
  const overflow = jdAll.length > SKILLS_HARD_MAX ? jdAll.slice(SKILLS_HARD_MAX) : undefined;
  const jdSet = new Set(jdSkills.map((s) => s.toLowerCase()));

  const resumeCandidates = [
    ...existing.filter((s) => !removeLower.has(s.toLowerCase()) && !jdSet.has(s.toLowerCase())),
    ...input.onet.tools,
    ...input.onet.skills,
  ];

  const seenResume = new Set<string>();
  const scored: Array<{ skill: string; score: number }> = [];
  for (const skill of resumeCandidates) {
    const key = skill.toLowerCase().trim();
    if (!key || seenResume.has(key) || jdSet.has(key) || removeLower.has(key)) continue;
    if (isBannedSkill(skill) || isProseSkill(skill)) continue;
    const score = scoreResumeSkillRelevance(skill, {
      form: input.form,
      targetRole: input.targetRole,
      onet: input.onet,
      jdSkillSet: jdSet,
      summaryTheme: input.summaryTheme,
    });
    if (score < 0) continue;
    seenResume.add(key);
    scored.push({ skill, score });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.skill.localeCompare(b.skill);
  });

  const slotsLeft = Math.max(0, SKILLS_HARD_MAX - jdSkills.length);
  const resumeSkills = scored.slice(0, slotsLeft).map((s) => s.skill);

  const grouped: GroupedSkills = { jdSkills, resumeSkills };
  const skillsText = serializeGroupedSkills(grouped);

  const beforeLower = new Set(existing.map((s) => s.toLowerCase()));
  const skillsAdded = [...jdSkills, ...resumeSkills].filter(
    (s) => !beforeLower.has(s.toLowerCase()),
  );

  return { grouped, skillsText, skillsAdded, overflow };
}
