import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { refineryFormToPrimeResume } from "@/lib/onboarding/hubResume";
import { analyzeBulletQuality } from "@/lib/job-tracker/ats/bullet-quality";
import type { WeakBulletTarget } from "@/lib/job-tracker/ats/job-intelligence";
import type { JDDomain } from "@/lib/job-tracker/jd/jd-intelligence";
import { resolveKeywordGap } from "@/lib/job-tracker/ats/resolve-keyword-gap";
import type { KeywordGapResult } from "@/lib/job-tracker/ats/keyword-gap";
import type { JDIntelligence } from "@/lib/job-tracker/jd/jd-intelligence";
import { normalizeBrandTokens } from "@/lib/resume/brand-normalize";
import {
  normalizeSummaryForReadiness,
} from "@/lib/resume/summary-rules";
import {
  cleanExperienceBullets,
  mergeSkills,
  rewriteWeakBullets,
} from "@/lib/job-tracker/enhance/apply-enhance-plan-helpers";
import { normalizeBrandTokensInForm } from "@/lib/job-tracker/enhance/normalize-enhanced-form";
import { normalizeBulletOpeningVerb } from "@/lib/resume/resume-bullet-verbs";
import { taperExperienceEntries } from "@/lib/resume/experience-bullet-rules";
import { inferResumePagesFromForm } from "@/src/lib/ai/engine/candidate-context";

export const ATS_BULLET_MAX_CHARS = 200;

/** JD keywords to merge — injectable (synonym-only) first, then top missing. */
export function skillsKeywordsFromGap(gap: KeywordGapResult): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const kw of [...gap.injectable, ...gap.topMissing]) {
    const trimmed = kw.trim();
    if (!trimmed || trimmed.length > 40) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out.slice(0, 8);
}

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

function isContinuationFragment(part: string, previous: string): boolean {
  const prev = previous.trim();
  const text = part.trim();
  if (!prev || !text) return false;
  if (/[.!?]$/.test(prev)) return false;
  if (prev.endsWith(",")) return true;
  if (BULLET_CONTINUATION_START.test(text)) return true;
  return prev.length > 40 && /^[a-z(]/.test(text);
}

const BULLET_CONTINUATION_START =
  /^(with|while|and|or|achieving|ensuring|increasing|delivering|maintaining|supporting|partnering|across|through|for|to)\b/i;

function ensureBulletEndsWithPeriod(text: string): string {
  const trimmed = text.trim().replace(/[,;]+$/, "");
  if (!trimmed) return trimmed;
  if (/[.!?]$/.test(trimmed)) return trimmed;
  return `${trimmed}.`;
}

function trimToCompleteClause(text: string, max: number): string {
  let work = text.trim().replace(/\s+/g, " ");
  if (work.length <= max) return work;

  while (work.length > max) {
    const comma = work.lastIndexOf(", ");
    if (comma !== -1 && comma > 60) {
      const tail = work.slice(comma + 2).trim();
      const dropTail =
        tail.length <= 72 ||
        BULLET_CONTINUATION_START.test(tail) ||
        /^with\s+/i.test(tail);
      if (dropTail) {
        work = work.slice(0, comma).trim();
        continue;
      }
    }

    let cut = work.lastIndexOf(" ", max - 1);
    while (cut > 60 && endsWithDanglingWord(work.slice(0, cut))) {
      cut = work.lastIndexOf(" ", cut - 1);
    }
    if (cut > 60) {
      work = work.slice(0, cut).trim();
    } else {
      work = work.slice(0, max).trim();
    }
    break;
  }

  return work.replace(/,\s*(and|or|with|while|that|which)$/i, "").trim();
}

/** Drop trailing clauses until the bullet fits the ATS line limit. */
export function compressBulletToMax(text: string, max = ATS_BULLET_MAX_CHARS): string {
  return trimToCompleteClause(text.trim().replace(/\s+/g, " "), max);
}

function splitAtSemicolon(line: string, max: number): string[] | null {
  const idx = line.indexOf("; ");
  if (idx === -1 || idx < 40 || idx > max) return null;
  const first = ensureBulletEndsWithPeriod(line.slice(0, idx).trim());
  const second = ensureBulletEndsWithPeriod(
    normalizeBulletOpeningVerb(line.slice(idx + 2).trim()),
  );
  if (!first || !second) return null;
  if (first.length <= max && second.length <= max) return [first, second];
  return null;
}

function splitAtSentences(line: string, max: number): string[] | null {
  const parts = line.split(/(?<=[.!?])\s+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return null;

  const bullets: string[] = [];
  let current = "";
  for (const part of parts) {
    const candidate = current ? `${current} ${part}` : part;
    if (candidate.length <= max) {
      current = candidate;
      continue;
    }
    if (current) bullets.push(ensureBulletEndsWithPeriod(current));
    current = part;
  }
  if (current) bullets.push(ensureBulletEndsWithPeriod(current));
  if (bullets.length > 1 && bullets.every((b) => b.length <= max)) return bullets;
  return null;
}

/** Fit one bullet to ATS max — compress first; split only at strong boundaries. */
export function splitLongBullet(line: string, max = ATS_BULLET_MAX_CHARS): string[] {
  const trimmed = line.trim().replace(/\s+/g, " ");
  if (!trimmed) return [];
  if (trimmed.length <= max) return [ensureBulletEndsWithPeriod(trimmed)];

  const semicolonParts = splitAtSemicolon(trimmed, max);
  if (semicolonParts) return semicolonParts;

  const sentenceParts = splitAtSentences(trimmed, max);
  if (sentenceParts) return sentenceParts;

  const compressed = compressBulletToMax(trimmed, max);
  if (compressed.length <= max) return [ensureBulletEndsWithPeriod(compressed)];

  const trimmedSingle = ensureBulletEndsWithPeriod(trimToCompleteClause(trimmed, max));
  if (trimmedSingle.length <= max) return [trimmedSingle];

  return [trimmedSingle.slice(0, max).replace(/\s+\S*$/, "").trim()].map(
    ensureBulletEndsWithPeriod,
  );
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

/** Join AI line-breaks that split a single bullet mid-clause (e.g. "Android\\nFlutter engineers"). */
export function coalesceBrokenBulletLines(bullets: string): string[] {
  const parts = bullets
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const merged: string[] = [];
  for (const part of parts) {
    if (merged.length === 0) {
      merged.push(part);
      continue;
    }
    const prev = merged[merged.length - 1]!;
    const continues =
      isContinuationFragment(part, prev) ||
      /,\s*(i\s*os|android|api)$/i.test(prev) ||
      /^flutter\b/i.test(part) ||
      /^engineers\b/i.test(part);
    if (continues) {
      merged[merged.length - 1] = `${prev} ${part}`;
    } else {
      merged.push(part);
    }
  }
  return merged;
}

function enforceBulletLengthLimits(form: HubRefineryForm): HubRefineryForm {
  return {
    ...form,
    experience: (form.experience ?? []).map((exp) => {
      const coalesced = coalesceBrokenBulletLines(exp.bullets ?? "");
      const lines = coalesced
        .map((line) => normalizeBrandTokens(line.trim()))
        .filter(Boolean)
        .flatMap((line) => splitLongBullet(line));
      const merged = coalesceBrokenBulletLines(lines.join("\n"))
        .map((line) => ensureBulletEndsWithPeriod(line))
        .filter(Boolean);
      return { ...exp, bullets: merged.join("\n") };
    }),
  };
}

function bulletClausesFromForm(form: HubRefineryForm): string[] {
  const clauses: string[] = [];
  for (const entry of form.experience ?? []) {
    if (entry.hidden) continue;
    for (const line of (entry.bullets ?? "").split("\n")) {
      const bullet = line.trim();
      if (!bullet) continue;
      const clause = bullet.split(/[,;]/)[0]?.trim() ?? bullet;
      if (clause.length >= 24 && clause.length <= 160) {
        clauses.push(normalizeBulletOpeningVerb(clause));
      }
    }
  }
  return clauses;
}

function repairSummaryText(
  summary: string,
  options?: { sourceSummary?: string; bulletClauses?: string[] },
): string {
  const out = normalizeBrandTokens(summary.trim());
  if (!out) return out;
  return normalizeSummaryForReadiness(out, {
    sourceSummary: options?.sourceSummary,
    bulletClauses: options?.bulletClauses,
  });
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
    /** Pre-enhance summary for padding when AI output is too short. */
    sourceSummary?: string;
    /** When true, skip deterministic bullet rewrites (post-AI light path). */
    skipDeterministicRewrite?: boolean;
  },
): ReadinessRepairResult {
  const repairs: string[] = [];
  let next = normalizeBrandTokensInForm(form);

  const summary = repairSummaryText(next.professionalSummary ?? "", {
    sourceSummary: input.sourceSummary,
    bulletClauses: bulletClausesFromForm(next),
  });
  if (summary !== (next.professionalSummary ?? "").trim()) {
    repairs.push("summary_repaired");
    next = { ...next, professionalSummary: summary };
  }

  const trimmedJd = input.jobDescription?.trim() ?? "";
  if (trimmedJd) {
    const prime = refineryFormToPrimeResume(next, { targetRole: input.targetRole });
    const gap = resolveKeywordGap(
      prime,
      input.targetRole,
      trimmedJd,
      input.jdIntelligence,
    );
    const skillsToAdd = skillsKeywordsFromGap(gap);
    if (skillsToAdd.length > 0) {
      const merged = mergeSkills(next.skillsText ?? "", skillsToAdd);
      if (merged !== (next.skillsText ?? "")) {
        repairs.push("skills_keywords_merged");
        next = { ...next, skillsText: merged };
      }
    }
  }

  const weakBullets = collectWeakBullets(next, input.targetRole);
  if (!input.skipDeterministicRewrite && weakBullets.length > 0) {
    const bulletResult = rewriteWeakBullets(next, weakBullets, input.jdDomain);
    if (bulletResult.bulletsRewritten > 0) {
      repairs.push(`bullets_rewritten_${bulletResult.bulletsRewritten}`);
      next = bulletResult.form;
    }
  }

  next = cleanExperienceBullets(next);
  if (!input.skipDeterministicRewrite) {
    const lengthLimited = enforceBulletLengthLimits(next);
    if (JSON.stringify(lengthLimited.experience) !== JSON.stringify(next.experience)) {
      repairs.push("bullet_length_enforced");
      next = lengthLimited;
    }
  }

  const pages = inferResumePagesFromForm(next, input.targetRole);
  const tapered = taperExperienceEntries(next.experience ?? [], pages);
  if (tapered.bulletsTrimmed > 0) {
    repairs.push(`bullets_tapered_${tapered.bulletsTrimmed}`);
    next = { ...next, experience: tapered.entries };
  }

  next = normalizeBrandTokensInForm(next);
  return { form: next, repairs };
}
