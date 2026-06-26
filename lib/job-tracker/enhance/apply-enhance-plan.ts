import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import type { WeakBulletTarget } from "@/lib/job-tracker/ats/job-intelligence";
import type { DeterministicEnhanceResult } from "@/lib/job-tracker/ats/deterministic-enhancer";
import {
  isBannedSkill,
  isProseSkill,
  parseSkillsText,
  SKILLS_HARD_MAX,
} from "@/lib/resume/skills-rules";
import type { EnhancePlan } from "@/lib/job-tracker/enhance/enhance-plan";

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

function rewriteBullet(
  text: string,
  issues: Array<"weak-verb" | "weak-phrase" | "no-metric">,
): { rewritten: string; changed: boolean } {
  let result = text.trim().replace(/^[-•*]\s*/, "");
  let changed = false;

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

  if (issues.includes("weak-verb") && !changed) {
    const domainMatch = DOMAIN_VERBS.find(({ pattern }) => pattern.test(result));
    const verb = domainMatch?.verb ?? "Executed";
    result = `${verb} ${lcFirst(result)}`;
    changed = true;
  }

  if (changed) {
    result = ucFirst(result);
  }

  return { rewritten: result, changed };
}

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

function removeSkills(existing: string, toRemove: string[]): string {
  if (toRemove.length === 0) return existing;

  const removeLower = new Set(toRemove.map((s) => s.toLowerCase().trim()));
  const kept = parseSkillsText(existing).filter((s) => !removeLower.has(s.toLowerCase().trim()));
  return kept.join(", ");
}

function rewriteWeakBullets(
  form: HubRefineryForm,
  weakBullets: WeakBulletTarget[],
): { form: HubRefineryForm; bulletsRewritten: number } {
  if (weakBullets.length === 0 || !form.experience) {
    return { form, bulletsRewritten: 0 };
  }

  let bulletsRewritten = 0;
  const updatedExperience = form.experience.map((exp, expIdx) => {
    const weakForEntry = weakBullets.filter((wb) => wb.experienceIndex === expIdx);
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

  return {
    form: { ...form, experience: updatedExperience },
    bulletsRewritten,
  };
}

function buildChangeSummary(
  plan: EnhancePlan,
  skillsAdded: string[],
  bulletsRewritten: number,
): string {
  const summaryParts: string[] = [];

  if (skillsAdded.length > 0) {
    summaryParts.push(
      `Added ${skillsAdded.length} missing keyword${skillsAdded.length > 1 ? "s" : ""} to your Skills section (${skillsAdded.slice(0, 3).join(", ")}${skillsAdded.length > 3 ? "…" : ""})`,
    );
  }

  summaryParts.push(...plan.skillsWarnings);
  summaryParts.push(...plan.summaryWarnings);

  if (bulletsRewritten > 0) {
    summaryParts.push(
      `Strengthened ${bulletsRewritten} weak bullet${bulletsRewritten > 1 ? "s" : ""} with action verbs`,
    );
  }

  if (plan.structuralWarnings.length > 0) {
    summaryParts.push(
      `${plan.structuralWarnings.length} structural issue${plan.structuralWarnings.length > 1 ? "s" : ""} detected — review the ATS tab`,
    );
  }

  if (summaryParts.length === 0) {
    return "Resume reviewed — no rule-based improvements were applicable.";
  }

  return summaryParts.join(". ") + ".";
}

/** Apply an EnhancePlan without AI — summary is flagged, never rewritten. */
export function applyEnhancePlan(
  form: HubRefineryForm,
  plan: EnhancePlan,
): DeterministicEnhanceResult {
  let updatedForm = { ...form };
  const preInjectionSkills = parseSkillsText(updatedForm.skillsText ?? "");
  const skillsAdded: string[] = [];

  if (plan.skillsToRemove.length > 0) {
    const removed = removeSkills(updatedForm.skillsText ?? "", plan.skillsToRemove);
    if (removed !== (updatedForm.skillsText ?? "")) {
      updatedForm = { ...updatedForm, skillsText: removed };
    }
  }

  if (plan.skillsToAdd.length > 0) {
    const newSkillsText = mergeSkills(updatedForm.skillsText ?? "", plan.skillsToAdd);
    if (newSkillsText !== (updatedForm.skillsText ?? "")) {
      const before = new Set(preInjectionSkills.map((s) => s.toLowerCase()));
      skillsAdded.push(
        ...plan.skillsToAdd.filter((s) => !before.has(s.toLowerCase())),
      );
      updatedForm = { ...updatedForm, skillsText: newSkillsText };
    }
  }

  const bulletResult = rewriteWeakBullets(updatedForm, plan.weakBullets);
  updatedForm = bulletResult.form;

  return {
    form: updatedForm,
    summary: buildChangeSummary(plan, skillsAdded, bulletResult.bulletsRewritten),
    changes: {
      skillsAdded,
      bulletsRewritten: bulletResult.bulletsRewritten,
      structuralIssuesFound: plan.structuralWarnings.length,
    },
  };
}
