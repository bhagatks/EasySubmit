import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import type { WeakBulletTarget } from "@/lib/job-tracker/ats/job-intelligence";
import type { JDDomain } from "@/lib/job-tracker/jd/jd-intelligence";
import {
  isBannedSkill,
  isProseSkill,
  parseSkillsText,
  SKILLS_HARD_MAX,
} from "@/lib/resume/skills-rules";
import {
  bulletHasStrongOpening,
  normalizeBulletOpeningVerb,
} from "@/lib/resume/resume-bullet-verbs";
import { cleanBulletLine, cleanBulletsString } from "@/src/lib/ai/engine/format-rules";

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

const NON_TECH_JD_DOMAINS = new Set<JDDomain>([
  "other",
  "product-management",
  "procurement-supply-chain",
  "medtech-regulatory",
]);

function defaultWeakVerb(jdDomain?: JDDomain): string {
  return jdDomain && NON_TECH_JD_DOMAINS.has(jdDomain) ? "Led" : "Executed";
}

function rewriteBullet(
  text: string,
  issues: Array<"weak-verb" | "weak-phrase" | "no-metric" | "ai-phrase">,
  jdDomain?: JDDomain,
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
    const alreadyStrong =
      bulletHasStrongOpening(result) ||
      /^(led|built|designed|defined|oversaw|implemented|deployed|partnered|established|executed|managed|directed|developed|created|launched|optimized|validated|mentored|analyzed)\b/i.test(
        result,
      );
    if (alreadyStrong) {
      const normalized = normalizeBulletOpeningVerb(result);
      if (normalized !== result) {
        result = normalized;
        changed = true;
      }
    } else {
      const domainMatch = DOMAIN_VERBS.find(({ pattern }) => pattern.test(result));
      const verb = domainMatch?.verb ?? defaultWeakVerb(jdDomain);
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

export function mergeSkills(existing: string, toAdd: string[]): string {
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

export function removeSkills(existing: string, toRemove: string[]): string {
  if (toRemove.length === 0) return existing;

  const removeLower = new Set(toRemove.map((s) => s.toLowerCase().trim()));
  const kept = parseSkillsText(existing).filter((s) => !removeLower.has(s.toLowerCase().trim()));
  return kept.join(", ");
}

export function rewriteWeakBullets(
  form: HubRefineryForm,
  weakBullets: WeakBulletTarget[],
  jdDomain?: JDDomain,
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

      const { rewritten, changed } = rewriteBullet(bullet, target.issues, jdDomain);
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

export function cleanExperienceBullets(form: HubRefineryForm): HubRefineryForm {
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
