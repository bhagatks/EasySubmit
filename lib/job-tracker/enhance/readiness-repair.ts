import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { refineryFormToPrimeResume } from "@/lib/onboarding/hubResume";
import { analyzeBulletQuality } from "@/lib/job-tracker/ats/bullet-quality";
import type { WeakBulletTarget } from "@/lib/job-tracker/ats/job-intelligence";
import type { JDDomain } from "@/lib/job-tracker/jd/jd-intelligence";
import { resolveKeywordGap } from "@/lib/job-tracker/ats/resolve-keyword-gap";
import type { JDIntelligence } from "@/lib/job-tracker/jd/jd-intelligence";
import { normalizeBrandTokens } from "@/lib/resume/brand-normalize";
import {
  enforceSummaryWordBudget,
  repairSummaryOrphans,
  stripBannedSummaryWords,
} from "@/lib/resume/summary-rules";
import {
  cleanExperienceBullets,
  mergeSkills,
  rewriteWeakBullets,
} from "@/lib/job-tracker/enhance/apply-enhance-plan-helpers";
import { normalizeBrandTokensInForm } from "@/lib/job-tracker/enhance/normalize-enhanced-form";

export const ATS_BULLET_MAX_CHARS = 200;

const BULLET_DANGLING_ENDINGS = new Set([
  "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "of", "with", "by",
  "from", "into", "through", "while", "as", "that", "which", "who", "when", "where",
]);

function lastWord(text: string): string {
  const parts = text.trim().split(/\s+/);
  return (parts[parts.length - 1] ?? "").replace(/[.,;:!?]+$/, "").toLowerCase();
}

function endsWithDanglingWord(text: string): boolean {
  return BULLET_DANGLING_ENDINGS.has(lastWord(text));
}

function findSplitBeforeMax(text: string, max: number, separator: string): number {
  let idx = text.indexOf(separator);
  while (idx !== -1 && idx < max) {
    const end = idx + separator.length;
    const next = text.indexOf(separator, end);
    if (next === -1 || next >= max) return idx;
    idx = next;
  }
  return -1;
}

/** Split an overlong bullet into complete clauses — never leave dangling prepositions. */
export function splitLongBullet(line: string, max = ATS_BULLET_MAX_CHARS): string[] {
  const trimmed = line.trim();
  if (trimmed.length <= max) return [trimmed];

  const clauseSplits = ["; ", ", while ", ", and ", " — ", " - ", " that ", " which "];
  for (const sep of clauseSplits) {
    const idx = findSplitBeforeMax(trimmed, max, sep);
    if (idx > 40) {
      const first = trimmed.slice(0, idx).trim();
      const second = trimmed.slice(idx + sep.length).trim();
      if (first && second && !endsWithDanglingWord(first)) {
        return [first, ...splitLongBullet(second, max)];
      }
    }
  }

  const periodIdx = trimmed.lastIndexOf(". ", max);
  if (periodIdx > 60) {
    const first = trimmed.slice(0, periodIdx + 1).trim();
    const rest = trimmed.slice(periodIdx + 2).trim();
    if (first && rest) return [first, ...splitLongBullet(rest, max)];
  }

  const commaIdx = findSplitBeforeMax(trimmed, max, ", ");
  if (commaIdx > 80) {
    const first = trimmed.slice(0, commaIdx).trim();
    const second = trimmed.slice(commaIdx + 2).trim();
    if (first && second && !endsWithDanglingWord(first)) {
      return [first, ...splitLongBullet(second, max)];
    }
  }

  let cut = trimmed.lastIndexOf(" ", max);
  while (cut > 60) {
    const first = trimmed.slice(0, cut).trim();
    if (!endsWithDanglingWord(first)) {
      const rest = trimmed.slice(cut + 1).trim();
      return rest ? [first, ...splitLongBullet(rest, max)] : [first];
    }
    cut = trimmed.lastIndexOf(" ", cut - 1);
  }

  if (cut > 60) {
    const first = trimmed.slice(0, cut).trim();
    const rest = trimmed.slice(cut + 1).trim();
    return rest ? [first, ...splitLongBullet(rest, max)] : [first];
  }

  const first = trimmed.slice(0, max).trim();
  const rest = trimmed.slice(max).trim();
  return rest ? [first, ...splitLongBullet(rest, max)] : [first];
}

function collectWeakBullets(form: HubRefineryForm, targetRole: string): WeakBulletTarget[] {
  const prime = refineryFormToPrimeResume(form, { targetRole });
  const quality = analyzeBulletQuality(prime);
  const weak: WeakBulletTarget[] = [];
  let qualityEntryIdx = 0;

  for (let expIdx = 0; expIdx < (form.experience?.length ?? 0); expIdx++) {
    const exp = form.experience![expIdx]!;
    if (exp.hidden) continue;
    const rawBullets = (exp.bullets ?? "").split("\n").map((b) => b.trim()).filter(Boolean);
    if (rawBullets.length === 0) continue;

    const entry = quality.entries[qualityEntryIdx];
    qualityEntryIdx++;
    if (!entry) continue;

    for (let bi = 0; bi < entry.bullets.length; bi++) {
      const bullet = entry.bullets[bi]!;
      const issues = bullet.issues
        .map((issue) => issue.type)
        .filter(
          (type): type is WeakBulletTarget["issues"][number] =>
            type === "weak-verb" || type === "weak-phrase",
        );
      if (issues.length > 0) {
        weak.push({
          experienceIndex: expIdx,
          bulletIndex: bi,
          bulletText: bullet.text,
          issues,
        });
      }
    }
  }

  return weak;
}

function enforceBulletLengthLimits(form: HubRefineryForm): HubRefineryForm {
  return {
    ...form,
    experience: (form.experience ?? []).map((exp) => {
      const lines = (exp.bullets ?? "")
        .split("\n")
        .map((line) => normalizeBrandTokens(line.trim()))
        .filter(Boolean)
        .flatMap((line) => splitLongBullet(line));
      return { ...exp, bullets: lines.join("\n") };
    }),
  };
}

function repairSummaryText(summary: string): string {
  let out = normalizeBrandTokens(summary.trim());
  if (!out) return out;
  out = stripBannedSummaryWords(out);
  out = repairSummaryOrphans(out);
  out = enforceSummaryWordBudget(out);
  return out;
}

export type ReadinessRepairResult = {
  form: HubRefineryForm;
  repairs: string[];
};

export function repairResumeFormForReadiness(
  form: HubRefineryForm,
  input: {
    targetRole: string;
    jobDescription?: string;
    jdIntelligence?: JDIntelligence | null;
    jdDomain?: JDDomain;
    /** When true, do not merge keyword-gap skills — AI output is authoritative. */
    skipSkillsMerge?: boolean;
  },
): ReadinessRepairResult {
  const repairs: string[] = [];
  let next = normalizeBrandTokensInForm(form);

  const summary = repairSummaryText(next.professionalSummary ?? "");
  if (summary !== (next.professionalSummary ?? "").trim()) {
    repairs.push("summary_repaired");
    next = { ...next, professionalSummary: summary };
  }

  const trimmedJd = input.jobDescription?.trim() ?? "";
  if (trimmedJd && !input.skipSkillsMerge) {
    const prime = refineryFormToPrimeResume(next, { targetRole: input.targetRole });
    const gap = resolveKeywordGap(
      prime,
      input.targetRole,
      trimmedJd,
      input.jdIntelligence,
    );
    const skillsToAdd = gap.topMissing
      .filter((kw) => kw.length <= 40)
      .slice(0, 8);
    if (skillsToAdd.length > 0) {
      const merged = mergeSkills(next.skillsText ?? "", skillsToAdd);
      if (merged !== (next.skillsText ?? "")) {
        repairs.push("skills_keywords_merged");
        next = { ...next, skillsText: merged };
      }
    }
  }

  const weakBullets = collectWeakBullets(next, input.targetRole);
  if (weakBullets.length > 0) {
    const bulletResult = rewriteWeakBullets(next, weakBullets, input.jdDomain);
    if (bulletResult.bulletsRewritten > 0) {
      repairs.push(`bullets_rewritten_${bulletResult.bulletsRewritten}`);
      next = bulletResult.form;
    }
  }

  next = cleanExperienceBullets(next);
  const lengthLimited = enforceBulletLengthLimits(next);
  if (JSON.stringify(lengthLimited.experience) !== JSON.stringify(next.experience)) {
    repairs.push("bullet_length_enforced");
    next = lengthLimited;
  }

  next = normalizeBrandTokensInForm(next);
  return { form: next, repairs };
}
