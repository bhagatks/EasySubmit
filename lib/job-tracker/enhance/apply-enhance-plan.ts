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
import { buildDeterministicSummary } from "@/lib/job-tracker/enhance/build-deterministic-summary";
import { taperExperienceEntries } from "@/lib/resume/experience-bullet-rules";
import {
  bulletHasStrongOpening,
  normalizeBulletOpeningVerb,
} from "@/lib/resume/resume-bullet-verbs";
import { splitMashedExperienceInForm } from "@/lib/resume/split-mashed-experience";
import { cleanBulletLine, cleanBulletsString } from "@/src/lib/ai/engine/format-rules";
import { inferResumePagesFromForm } from "@/src/lib/ai/engine/candidate-context";

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
    if (bulletHasStrongOpening(result)) {
      const normalized = normalizeBulletOpeningVerb(result);
      if (normalized !== result) {
        result = normalized;
        changed = true;
      }
    } else {
      const domainMatch = DOMAIN_VERBS.find(({ pattern }) => pattern.test(result));
      const verb = domainMatch?.verb ?? "Executed";
      result = `${verb} ${lcFirst(result)}`;
      changed = true;
    }
  }

  result = cleanBulletLine(result);

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

function cleanExperienceBullets(form: HubRefineryForm): HubRefineryForm {
  return {
    ...form,
    experience: (form.experience ?? []).map((exp) => ({
      ...exp,
      bullets: cleanBulletsString(exp.bullets ?? "")
        .split("\n")
        .map((line) => normalizeBulletOpeningVerb(line))
        .filter(Boolean)
        .join("\n"),
    })),
  };
}

function buildChangeSummary(
  plan: EnhancePlan,
  skillsAdded: string[],
  bulletsRewritten: number,
  bulletsTrimmed: number,
  summaryRewritten: boolean,
): string {
  const summaryParts: string[] = [];

  if (summaryRewritten) {
    summaryParts.push("Summary rewritten to 4-sentence standard");
  } else {
    summaryParts.push(...plan.summaryWarnings);
  }

  if (skillsAdded.length > 0) {
    summaryParts.push(
      `Added ${skillsAdded.length} missing keyword${skillsAdded.length > 1 ? "s" : ""} to your Skills section (${skillsAdded.slice(0, 3).join(", ")}${skillsAdded.length > 3 ? "…" : ""})`,
    );
  }

  summaryParts.push(...plan.skillsWarnings);

  if (bulletsRewritten > 0) {
    summaryParts.push(
      `Strengthened ${bulletsRewritten} weak bullet${bulletsRewritten > 1 ? "s" : ""} with action verbs`,
    );
  }

  if (bulletsTrimmed > 0) {
    summaryParts.push(
      `Trimmed ${bulletsTrimmed} bullet${bulletsTrimmed > 1 ? "s" : ""} to match recency page budget`,
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

/** Apply an EnhancePlan without AI — rewrites summary when it fails validation. */
export function applyEnhancePlan(
  form: HubRefineryForm,
  plan: EnhancePlan,
): DeterministicEnhanceResult {
  let updatedForm = splitMashedExperienceInForm({ ...form });
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
  updatedForm = cleanExperienceBullets(bulletResult.form);

  const pages = inferResumePagesFromForm(updatedForm, plan.targetRole ?? "");
  const tapered = taperExperienceEntries(updatedForm.experience ?? [], pages);
  updatedForm = { ...updatedForm, experience: tapered.entries };
  const bulletsTrimmed = tapered.bulletsTrimmed;

  let summaryRewritten = false;
  if (plan.summaryWarnings.length > 0) {
    const mergedSkills = parseSkillsText(updatedForm.skillsText ?? "");
    const rewritten = buildDeterministicSummary({
      currentSummary: updatedForm.professionalSummary ?? "",
      skills: mergedSkills,
      experience: updatedForm.experience ?? [],
      targetRole: plan.targetRole ?? "",
      summaryTheme: plan.summaryTheme,
      roleLevel: plan.roleLevel,
    });
    if (rewritten !== (updatedForm.professionalSummary ?? "").trim()) {
      updatedForm = { ...updatedForm, professionalSummary: rewritten };
      summaryRewritten = true;
    }
  }

  return {
    form: updatedForm,
    summary: buildChangeSummary(
      plan,
      skillsAdded,
      bulletResult.bulletsRewritten,
      bulletsTrimmed,
      summaryRewritten,
    ),
    changes: {
      skillsAdded,
      bulletsRewritten: bulletResult.bulletsRewritten,
      structuralIssuesFound: plan.structuralWarnings.length,
    },
  };
}
