/**
 * RULES v2 post-generate repair — align enhanced form with v2 validators + readiness.
 *
 * Inputs: enhanced form (AI output) + source form (pre-enhance truth).
 * Does not invent employers, titles, dates, or metrics — selects and trims from pools.
 */

import type { JDIntelligence } from "@/lib/job-tracker/jd/jd-intelligence";
import { resolveKeywordGap } from "@/lib/job-tracker/ats/resolve-keyword-gap";
import { refineryFormToPrimeResume } from "@/lib/onboarding/hubResume";
import { mergeSkills } from "@/lib/job-tracker/enhance/apply-enhance-plan-helpers";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { normalizeBrandTokensInForm } from "@/lib/job-tracker/enhance/normalize-enhanced-form";
import {
  ATS_BULLET_MAX_CHARS,
  coalesceBrokenBulletLines,
  compressBulletToMax,
  skillsKeywordsFromGap,
  splitLongBullet,
} from "@/lib/job-tracker/enhance/readiness-repair";
import { bulletHasStrongOpening, normalizeBulletOpeningVerb } from "@/lib/resume/resume-bullet-verbs";
import {
  countSummaryWords,
  joinSummarySentences,
  repairSummaryOrphans,
  splitSummarySentences,
  stripBannedSummaryWords,
} from "@/lib/resume/summary-rules";
import {
  DEFAULT_RESUME_PAGE_MODE_V2,
  normalizeResumePageModeV2,
  type ResumePageModeV2,
} from "@/lib/resume/v2/page-mode";
import {
  resolveResumeRulesProfileV2,
  type ResumeRulesProfileV2,
} from "@/lib/resume/v2/rules-config";
import {
  getExperienceRecencyTierV2,
  parseExperienceBulletsV2,
} from "@/lib/resume/v2/bullet-rules";
import {
  parseSkillsCategoriesV2,
  type ParsedSkillCategoryV2,
} from "@/lib/resume/v2/skills-rules";

const QUANTIFICATION_PATTERN =
  /\b(\d+[\d,]*\.?\d*\s*(%|x|×|million|billion|k\b|m\b|ms\b|s\b|min|hour|day|week|month|year|users?|customers?|requests?|engineers?|teams?|services?|repos?|pipelines?|errors?|bugs?|tickets?|releases?)|\$[\d,]+|\d+[\d,]*\s*(times|fold))/i;

const TARGET_QUANT_RATE = 0.7;

export type RepairResumeFormV2Input = {
  enhanced: HubRefineryForm;
  source: HubRefineryForm;
  targetRole: string;
  pageMode?: unknown;
  jobDescription?: string;
  jdIntelligence?: JDIntelligence | null;
};

export type RepairResumeFormV2Result = {
  form: HubRefineryForm;
  repairs: string[];
  pageMode: ResumePageModeV2;
  profile: ResumeRulesProfileV2 | null;
};

function bulletHasMetric(text: string): boolean {
  return QUANTIFICATION_PATTERN.test(text.trim());
}

function scoreBulletCandidate(text: string): number {
  const trimmed = text.trim().replace(/^[-•*]\s*/, "");
  if (!trimmed) return -1;

  let score = trimmed.length <= 200 ? 10 : -5;
  if (bulletHasStrongOpening(trimmed)) score += 40;
  if (bulletHasMetric(trimmed)) score += 35;
  return score;
}

function normalizeBulletLine(text: string): string {
  const trimmed = text.trim().replace(/^[-•*]\s*/, "");
  if (!trimmed) return "";
  const normalized = normalizeBulletOpeningVerb(trimmed);
  const capped = normalized.length <= ATS_BULLET_MAX_CHARS
    ? normalized
    : compressBulletToMax(normalized, ATS_BULLET_MAX_CHARS);
  if (/[.!?]$/.test(capped)) return capped;
  return `${capped}.`;
}

function parseRoleBullets(raw: string | null | undefined): string[] {
  return coalesceBrokenBulletLines(raw ?? "")
    .map((line) => line.trim().replace(/^[-•*]\s*/, ""))
    .filter(Boolean);
}

function uniqueBullets(candidates: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const candidate of candidates) {
    const key = candidate.trim().toLowerCase().replace(/\s+/g, " ");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(candidate.trim());
  }
  return out;
}

function selectBulletsForTier(
  enhancedBullets: string[],
  sourceBullets: string[],
  maxCount: number,
  minQuantRate = TARGET_QUANT_RATE,
): { selected: string[]; dropped: number } {
  const pool = uniqueBullets([...enhancedBullets, ...sourceBullets]);
  if (pool.length === 0) return { selected: [], dropped: 0 };

  const ranked = [...pool].sort((a, b) => scoreBulletCandidate(b) - scoreBulletCandidate(a));
  let selected = ranked.slice(0, Math.max(1, maxCount));

  const needQuant = Math.ceil(selected.length * minQuantRate);
  let quantCount = selected.filter(bulletHasMetric).length;

  if (selected.length >= 2 && quantCount < needQuant) {
    const selectedSet = new Set(selected.map((b) => b.toLowerCase()));
    const metricCandidates = ranked.filter(
      (bullet) => bulletHasMetric(bullet) && !selectedSet.has(bullet.toLowerCase()),
    );

    for (const metricBullet of metricCandidates) {
      if (quantCount >= needQuant) break;
      const replaceIndex = [...selected]
        .map((bullet, index) => ({ bullet, index, score: scoreBulletCandidate(bullet) }))
        .filter((entry) => !bulletHasMetric(entry.bullet))
        .sort((a, b) => a.score - b.score)[0]?.index;
      if (replaceIndex === undefined) break;
      selected[replaceIndex] = metricBullet;
      quantCount = selected.filter(bulletHasMetric).length;
    }
  }

  return {
    selected: selected.map((bullet) => bullet.trim()).filter(Boolean),
    dropped: Math.max(0, pool.length - selected.length),
  };
}

function summarySupportFromBullets(source: HubRefineryForm, wordBudget: number): string {
  const parts: string[] = [];
  let words = 0;

  for (const entry of source.experience ?? []) {
    if (entry.hidden) continue;
    for (const bullet of parseRoleBullets(entry.bullets ?? "")) {
      if (words >= wordBudget) break;
      let clause = bullet.split(/[,;]/)[0]?.trim() ?? bullet.trim();
      if (!clause) continue;
      clause = normalizeBulletOpeningVerb(clause);
      if (!/[.!?]$/.test(clause)) clause += ".";
      const clauseWords = countSummaryWords(clause);
      if (clauseWords > 40) continue;
      if (words + clauseWords > wordBudget + 8) continue;
      parts.push(clause);
      words += clauseWords;
    }
    if (words >= wordBudget) break;
  }

  return joinSummarySentences(parts);
}

function enforceSummaryWordBudgetV2(
  text: string,
  rules: ResumeRulesProfileV2["summary"],
  sourceSummary: string,
  sourceForm: HubRefineryForm,
): string {
  let out = stripBannedSummaryWords(text.trim());
  out = repairSummaryOrphans(out);

  let sentences = splitSummarySentences(out);
  while (sentences.length > rules.targetSentencesMax && sentences.length > 1) {
    sentences.pop();
    out = joinSummarySentences(sentences);
  }

  while (countSummaryWords(out) > rules.wordTargetMax && sentences.length > rules.targetSentencesMin) {
    sentences.pop();
    out = joinSummarySentences(sentences);
  }

  if (countSummaryWords(out) > rules.errorWordsFrom - 1 && sentences.length === 1) {
    const words = out.split(/\s+/).filter(Boolean);
    out = words.slice(0, rules.wordTargetMax).join(" ");
    if (!/[.!?]$/.test(out)) out += ".";
  }

  if (countSummaryWords(out) < rules.wordTargetMin) {
    const sourceSentences = splitSummarySentences(stripBannedSummaryWords(sourceSummary.trim()));
    sentences = splitSummarySentences(out);
    for (const sentence of sourceSentences) {
      if (countSummaryWords(joinSummarySentences(sentences)) >= rules.wordTargetMin) break;
      const fragment = sentence.trim().slice(0, 48).toLowerCase();
      if (!fragment) continue;
      if (joinSummarySentences(sentences).toLowerCase().includes(fragment)) continue;
      if (sentences.length >= rules.targetSentencesMax) break;
      sentences.push(sentence.trim());
    }
    out = joinSummarySentences(sentences);
  }

  if (countSummaryWords(out) < rules.wordTargetMin && sourceSummary.trim()) {
    const sourceClean = stripBannedSummaryWords(sourceSummary.trim());
    const merged = joinSummarySentences([out, sourceClean].filter(Boolean));
    if (countSummaryWords(merged) >= rules.wordTargetMin) {
      out = merged;
    } else if (sourceClean) {
      out = sourceClean;
    }
  }

  if (countSummaryWords(out) < rules.wordTargetMin) {
    const support = summarySupportFromBullets(
      sourceForm,
      Math.max(0, rules.wordTargetMin - countSummaryWords(out) + 15),
    );
    if (support) {
      out = joinSummarySentences([out, support].filter(Boolean));
    }
  }

  if (countSummaryWords(out) > rules.wordTargetMax) {
    sentences = splitSummarySentences(out);
    while (sentences.length > rules.targetSentencesMin && countSummaryWords(joinSummarySentences(sentences)) > rules.wordTargetMax) {
      sentences.pop();
    }
    out = joinSummarySentences(sentences);
  }

  return out.trim();
}

function trimSkillCategoryTerms(category: ParsedSkillCategoryV2, maxTerms: number): ParsedSkillCategoryV2 {
  if (category.terms.length <= maxTerms) return category;
  return { ...category, terms: category.terms.slice(0, maxTerms) };
}

function mergeSkillCategories(
  categories: ParsedSkillCategoryV2[],
  maxLines: number,
): ParsedSkillCategoryV2[] {
  if (categories.length <= maxLines) return categories;

  const kept = categories.slice(0, maxLines - 1);
  const overflow = categories.slice(maxLines - 1);
  const mergedTerms = overflow.flatMap((category) => category.terms);
  kept.push({ label: "Additional Skills", terms: mergedTerms });
  return kept;
}

function categoriesToSkillsText(categories: ParsedSkillCategoryV2[]): string {
  return categories
    .filter((category) => category.terms.length > 0)
    .map((category) => `${category.label}: ${category.terms.join(", ")}`)
    .join("\n");
}

function repairSkillsTextV2(
  skillsText: string,
  rules: ResumeRulesProfileV2["skills"],
): { text: string; changed: boolean } {
  let categories = parseSkillsCategoriesV2(skillsText);
  if (categories.length === 0) return { text: skillsText, changed: false };

  const before = skillsText.trim();
  categories = mergeSkillCategories(categories, rules.maxCategoryLines);
  categories = categories.map((category) =>
    trimSkillCategoryTerms(category, rules.softMaxTermsPerCategory),
  );

  const seen = new Set<string>();
  let uniqueCount = 0;
  const budgeted: ParsedSkillCategoryV2[] = [];

  for (const category of categories) {
    const terms: string[] = [];
    for (const term of category.terms) {
      const key = term.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      if (uniqueCount >= rules.maxUniqueTerms) break;
      seen.add(key);
      uniqueCount += 1;
      terms.push(term.trim());
    }
    if (terms.length > 0) {
      budgeted.push({ ...category, terms });
    }
  }

  const text = categoriesToSkillsText(budgeted);
  return { text, changed: text.trim() !== before };
}

function enforceBulletLengthOnForm(form: HubRefineryForm): HubRefineryForm {
  return {
    ...form,
    experience: (form.experience ?? []).map((entry) => {
      const lines = parseRoleBullets(entry.bullets ?? "")
        .flatMap((line) => splitLongBullet(line, ATS_BULLET_MAX_CHARS))
        .map(normalizeBulletLine)
        .filter(Boolean);
      return { ...entry, bullets: lines.join("\n") };
    }),
  };
}

function repairExperienceV2(
  enhanced: HubRefineryForm["experience"],
  source: HubRefineryForm["experience"],
  bulletRules: ResumeRulesProfileV2["bullets"],
): { entries: HubRefineryForm["experience"]; repairs: string[] } {
  const repairs: string[] = [];
  let visibleIndex = 0;

  const entries = (enhanced ?? []).map((entry, index) => {
    if (entry.hidden) return entry;

    const tier = getExperienceRecencyTierV2(visibleIndex);
    visibleIndex += 1;
    const tierRules = bulletRules.tiers[tier];
    const maxCount = tierRules.targetMax;

    const sourceEntry = (source ?? [])[index];
    const enhancedBullets = parseRoleBullets(entry.bullets ?? "");
    const sourceBullets = parseRoleBullets(sourceEntry?.bullets ?? "");

    const { selected, dropped } = selectBulletsForTier(
      enhancedBullets,
      sourceBullets,
      maxCount,
    );

    if (dropped > 0 || selected.length !== enhancedBullets.length) {
      repairs.push(`bullets_tier_${tier}_${index}_selected_${selected.length}`);
    }

    return { ...entry, bullets: selected.join("\n") };
  });

  return { entries, repairs };
}

export function repairResumeFormV2(input: RepairResumeFormV2Input): RepairResumeFormV2Result {
  const pageMode = normalizeResumePageModeV2(input.pageMode ?? input.enhanced.pageLengthPreference ?? DEFAULT_RESUME_PAGE_MODE_V2);
  const profile = resolveResumeRulesProfileV2(pageMode);
  const repairs: string[] = [];

  if (!profile) {
    return {
      form: input.enhanced,
      repairs: ["page_mode_not_implemented"],
      pageMode,
      profile: null,
    };
  }

  let form = normalizeBrandTokensInForm(input.enhanced);

  if (profile.unlimitedContent) {
    const summary = stripBannedSummaryWords(form.professionalSummary ?? "").trim();
    if (summary !== (form.professionalSummary ?? "").trim()) {
      repairs.push("summary_banned_phrases_stripped");
      form = { ...form, professionalSummary: summary };
    }
    form = normalizeBrandTokensInForm(form);
    return { form, repairs: [...repairs, "extended_mode_no_trim"], pageMode, profile };
  }

  const summary = enforceSummaryWordBudgetV2(
    form.professionalSummary ?? "",
    profile.summary,
    input.source.professionalSummary ?? "",
    input.source,
  );
  if (summary !== (form.professionalSummary ?? "").trim()) {
    repairs.push("summary_repaired");
    form = { ...form, professionalSummary: summary };
  }

  const trimmedJd = input.jobDescription?.trim() ?? "";
  if (trimmedJd) {
    const prime = refineryFormToPrimeResume(form, { targetRole: input.targetRole });
    const gap = resolveKeywordGap(
      prime,
      input.targetRole,
      trimmedJd,
      input.jdIntelligence,
    );
    const skillsToAdd = skillsKeywordsFromGap(gap);
    if (skillsToAdd.length > 0) {
      const merged = mergeSkills(form.skillsText ?? "", skillsToAdd);
      if (merged !== (form.skillsText ?? "")) {
        repairs.push("skills_keywords_merged");
        form = { ...form, skillsText: merged };
      }
    }
  }

  const skills = repairSkillsTextV2(form.skillsText ?? "", profile.skills);
  if (skills.changed) {
    repairs.push("skills_trimmed");
    form = { ...form, skillsText: skills.text };
  }

  const experienceRepair = repairExperienceV2(
    form.experience ?? [],
    input.source.experience ?? [],
    profile.bullets,
  );
  if (experienceRepair.repairs.length > 0) {
    repairs.push(...experienceRepair.repairs);
    form = { ...form, experience: experienceRepair.entries };
  }

  const lengthLimited = enforceBulletLengthOnForm(form);
  if (JSON.stringify(lengthLimited.experience) !== JSON.stringify(form.experience)) {
    repairs.push("bullet_length_enforced");
    form = lengthLimited;
  }

  form = normalizeBrandTokensInForm(form);
  return { form, repairs, pageMode, profile };
}

export function countBulletQuantRateFromForm(form: HubRefineryForm): number {
  const bullets = (form.experience ?? []).flatMap((entry) => parseExperienceBulletsV2(entry.bullets ?? ""));
  if (bullets.length === 0) return 0;
  return bullets.filter(bulletHasMetric).length / bullets.length;
}
