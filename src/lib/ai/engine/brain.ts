import type { CandidateContext } from "@/src/lib/ai/engine/candidate-context";
import type { AtsOptimizationSpec } from "@/lib/job-tracker/ats/build-ats-optimization-spec";
import { formatAtsOptimizationSpecBlock } from "@/lib/job-tracker/ats/build-ats-optimization-spec";
import { buildExperienceBulletBudgetPrompt } from "@/lib/resume/experience-bullet-rules";
import {
  EXTENDED_MODE_ATS_WARNING,
  resolveResumeRulesProfileV2,
  type ResumeRulesProfileV2,
} from "@/lib/resume/v2/rules-config";
import { normalizeResumePageModeV2 } from "@/lib/resume/v2/page-mode";
import {
  SKILLS_HARD_MIN_SYSTEM,
  SKILLS_HARD_MAX,
  SKILLS_TARGET_MIN,
} from "@/lib/resume/skills-rules";
import {
  SUMMARY_SENTENCE_COUNT,
  SUMMARY_WORD_MAX,
  SUMMARY_WORD_MIN,
} from "@/lib/resume/summary-rules";

const ATS_RULES_EXCERPT = `
ATS RULES (non-negotiable):
- Fixed section order: Summary → Skills → Experience → Education → optional Certifications/Projects/Languages.
- Single-column plain text semantics; standard section titles only.
- Experience bullets: action verb + task + quantified result (~70% with a metric).
- Skills: ${SKILLS_TARGET_MIN}–${SKILLS_HARD_MAX} items (target ${SKILLS_HARD_MIN_SYSTEM}–${SKILLS_HARD_MAX}); ≥70% hard skills; comma-separated tools/technologies only — no prose sentences. Spell out acronyms on first use.
- Never include "ATS", match scores, or keyword dumps in resume text.
- Summary: exactly ${SUMMARY_SENTENCE_COUNT} sentences, ${SUMMARY_WORD_MIN}–${SUMMARY_WORD_MAX} words; clean prose with spaces between words.
- IMMUTABLE: employer names, job titles, employment dates, school names, and degree fields — never change or invent these.
- Education: if the profile has no education entries, leave education empty — never invent degrees or schools.
`.trim();

function buildPageBudgetBlock(ctx: CandidateContext): string {
  const b = ctx.pageBudget;
  return `
PAGE BUDGET (${b.pages} page(s)):
- Professional Summary — exactly ${SUMMARY_SENTENCE_COUNT} sentences, ${SUMMARY_WORD_MIN}–${SUMMARY_WORD_MAX} words.
- ${buildExperienceBulletBudgetPrompt(b.pages, b.maxRolesDetailed)}
- Skills: ${SKILLS_HARD_MIN_SYSTEM}–${SKILLS_HARD_MAX} items.
`.trim();
}

export function buildEnhanceSystemPrompt(ctx: CandidateContext): string {
  return [
    "You are the EasySubmit Career Navigator — an expert ATS resume strategist.",
    "Your sole objective: maximize ATS readiness score for the target platform and job.",
    "Regenerate resume content aggressively to mirror the JD (or role/company context) and clear every item in the ATS Optimization Spec.",
    ATS_RULES_EXCERPT,
    buildPageBudgetBlock(ctx),
    `Candidate seniority signal: ${ctx.senioritySignal} (~${ctx.yearsExperienceEstimate} years experience).`,
    "Contact fields (name, email, phone, location, LinkedIn) are managed separately — do not output them.",
    "Return ONLY valid JSON matching the requested schema — no markdown fences or commentary.",
  ].join("\n\n");
}

export function buildEnhanceUserPrompt(
  ctx: CandidateContext,
  spec: AtsOptimizationSpec,
): string {
  const specBlock = formatAtsOptimizationSpecBlock(spec);
  const rawSource = ctx.rawResumeSource
    ? `\nSOURCE RESUME — FULL FACT BANK (primary evidence; select and compress from this before rewriting):\n"""\n${ctx.rawResumeSource}\n"""\n`
    : "";

  const bodyJson = JSON.stringify(ctx.resumeBody, null, 2);
  const jdRole = spec.directive?.effectiveTargetRole ?? spec.targetRole;

  if (spec.lightPath) {
    return [
      "Create a maximum-ATS-score resume for this application.",
      "Skills section has been pre-merged toward JD requirements — you may rewrite/reorder skillsText for optimal keyword coverage.",
      "Experience bullets fields contain compressed SOURCE FACTS (metrics, tools, short phrases) — not final bullets. Expand each role into full achievement bullets grounded only in those facts.",
      "Do NOT copy an old professional summary — write a new one from years of experience, identity, and the JD directive.",
      "Write in a natural professional voice — not robotic or AI-sounding.",
      specBlock,
      rawSource,
      "",
      "Resume skeleton JSON (no contact fields — preserve entry ids, companies, titles, schools, dates exactly):",
      bodyJson,
      "",
      "Tasks:",
      `1. Write a NEW professional summary (${SUMMARY_SENTENCE_COUNT} sentences, ${SUMMARY_WORD_MIN}–${SUMMARY_WORD_MAX} words) for ${jdRole}. When the spec allows target-role positioning, open with the target role/theme; otherwise open with the candidate identity. Use ~${spec.yearsExperienceEstimate ?? ctx.yearsExperienceEstimate} years of experience. Do not invent employers or metrics.`,
      `2. Finalize skillsText with ${SKILLS_HARD_MIN_SYSTEM}–${SKILLS_HARD_MAX} JD-aligned skills — include must-add skills from the directive.`,
      "3. For EACH experience entry: select the strongest relevant facts from SOURCE RESUME first, then compress into final bullets; do not discard named products, partners, patents, awards, platform names, or real metrics when they support the JD.",
      "4. Rewrite bullets from source facts only — one past-tense action verb per bullet; ~70% with metrics that appear in the facts. Preserve entry ids, company, title, and dates.",
      "5. Regenerate certifications, projects, languages, and custom section content for JD alignment when present.",
      "6. Keep all experience/education entry ids, company names, job titles, school names, degree fields, and date fields exactly unchanged.",
      "7. Do not invent employers, job titles, employment dates, schools, degrees, or metrics not supported by source facts.",
      "8. Fix spacing: no concatenated words; correct hyphenation in compound adjectives.",
      "",
      "Output JSON with the same structure as the input resume body (full bullets in experience[].bullets).",
    ].join("\n");
  }

  return [
    "Create a maximum-ATS-score resume for this application.",
    "Skills section has been pre-merged toward JD requirements — you may rewrite/reorder skillsText for optimal keyword coverage.",
    "Regenerate from scratch: professional summary, ALL experience bullets, certifications, projects, languages, and custom sections.",
    specBlock,
    rawSource,
    "",
    "Resume skeleton JSON (no contact fields — preserve entry ids, companies, titles, schools, dates exactly):",
    bodyJson,
    "",
    "Tasks:",
    `1. Write a new professional summary (${SUMMARY_SENTENCE_COUNT} sentences, ${SUMMARY_WORD_MIN}–${SUMMARY_WORD_MAX} words) aligned to ${jdRole} and the ATS Optimization Spec.`,
    `2. Finalize skillsText with ${SKILLS_HARD_MIN_SYSTEM}–${SKILLS_HARD_MAX} JD-aligned skills — include every missing keyword from the spec.`,
    "3. Select the strongest relevant facts from SOURCE RESUME first, then rewrite experience bullets to mirror JD responsibilities/keywords; one past-tense action verb per bullet; ~70% with metrics that appear in the source.",
    "4. Regenerate certifications, projects, languages, and custom section content for JD alignment.",
    "5. Keep all experience/education entry ids, company names, job titles, school names, degree fields, and date fields exactly unchanged.",
    "6. Do not invent employers, job titles, employment dates, schools, or degrees.",
    "7. Fix spacing: no concatenated words; correct hyphenation in compound adjectives.",
    "",
    "Output JSON with the same structure as the input resume body.",
  ].join("\n");
}

export function buildDirectiveBlock(directive: import("@/lib/job-tracker/jd/jd-intelligence").ResumeEnhanceDirective): string {
  const parts: string[] = [
    `ROLE CONTEXT: ${directive.roleLevel} · ${directive.scope}`,
  ];

  const culture: string[] = [];
  if (directive.cultureSignals.velocity) {
    culture.push(`pace: ${directive.cultureSignals.velocity}`);
  }
  if (directive.cultureSignals.ownership) {
    culture.push(`ownership: ${directive.cultureSignals.ownership}`);
  }
  if (directive.cultureSignals.industry.length > 0) {
    culture.push(`industry: ${directive.cultureSignals.industry.join(", ")}`);
  }
  if (culture.length > 0) {
    parts.push(`CULTURE / TONE:\n  ${culture.join("\n  ")}`);
  }

  if (directive.mustAddSkills.length > 0) {
    parts.push(`SKILLS — add ALL:\n  ${directive.mustAddSkills.join(", ")}`);
  }
  if (directive.mustWeaveKeywords.length > 0) {
    parts.push(
      `KEYWORDS — weave into summary + bullets:\n  ${directive.mustWeaveKeywords.slice(0, 15).join(", ")}`,
    );
  }
  if (directive.targetVerbs.length > 0) {
    parts.push(
      `VERB FIT: prefer these verbs where they naturally match the source facts: ${directive.targetVerbs.join(", ")}. Do NOT force every verb into every bullet.`,
    );
  }
  return `\n${parts.join("\n\n")}\n`;
}

const V2_BANNED_PHRASES =
  '"proven track record", "results-driven", "passionate", "synergy", "leverage"';

function resolveV2ProfileFromCtx(ctx: CandidateContext): ResumeRulesProfileV2 {
  const pageMode = normalizeResumePageModeV2(ctx.resumeBody.pageLengthPreference);
  const profile = resolveResumeRulesProfileV2(pageMode);
  if (!profile) {
    throw new Error(`Resume rules v2 has no profile for page mode "${pageMode}".`);
  }
  return profile;
}

function buildV2RulesExcerpt(profile: ResumeRulesProfileV2): string {
  const b = profile.bullets;
  const summaryLine = profile.unlimitedContent
    ? `- Summary: ${profile.summary.targetSentencesMin}–${profile.summary.targetSentencesMax} sentences; at least ${profile.summary.wordTargetMin} words — no upper limit in 4+ mode.`
    : `- Summary: ${profile.summary.targetSentencesMin}–${profile.summary.targetSentencesMax} sentences, ${profile.summary.wordTargetMin}–${profile.summary.wordTargetMax} words (under ${profile.summary.wordTargetMin} is invalid).`;
  const skillsLine = profile.unlimitedContent
    ? "- Skills: labeled category lines as \"Category: term, term\"; no term limits in 4+ mode; mirror JD noun phrases; source-only tools."
    : `- Skills: up to ${profile.skills.maxCategoryLines} category lines as "Category: term, term"; max ${profile.skills.maxUniqueTerms} unique terms; mirror JD noun phrases; source-only tools.`;
  const bulletLine = profile.unlimitedContent
    ? "- Experience bullets: past-tense action verb + task + quantified result (~70% with a metric from source); no bullet count limits in 4+ mode."
    : `- Experience bullets: past-tense action verb + task + quantified result (~70% with a metric from source).
- No hard bullet cap — select per tier: recent ${b.tiers.recent.targetMin}–${b.tiers.recent.targetMax}, mid ${b.tiers.mid.targetMin}–${b.tiers.mid.targetMax}, older ${b.tiers.older.targetMin}–${b.tiers.older.targetMax}.`;
  return `
ATS RULES V2 (non-negotiable):
- Fixed section order: Summary → Skills → Experience → Education → optional Certifications/Projects/Languages.
- Single-column plain text semantics; standard section titles only; NEVER use tables.
${summaryLine}
${skillsLine}
${bulletLine}
- Never include "ATS", match scores, or keyword dumps in resume text.
- Never use banned phrases: ${V2_BANNED_PHRASES}.
- IMMUTABLE: employer names, job titles, employment dates, school names, and degree fields — never change or invent these.
${profile.unlimitedContent ? `- ${EXTENDED_MODE_ATS_WARNING}` : ""}
`.trim();
}

function buildV2HardConstraintsBlock(profile: ResumeRulesProfileV2): string {
  if (profile.unlimitedContent) {
    return [
      "HARD CONSTRAINTS (invalid output if violated):",
      "- Single-column plain text; standard section titles; NEVER use tables.",
      "- Only list tools/frameworks present in source resume — do not invent stacks.",
      "- IMMUTABLE: employer names, job titles, employment dates, school names, degree fields.",
      "- PAGE MODE 4+ EXTENDED: no content length limits — maximize JD keyword coverage.",
      `- ${EXTENDED_MODE_ATS_WARNING}`,
    ].join("\n");
  }
  return [
    "HARD CONSTRAINTS (invalid output if violated):",
    `- Summary MUST be ${profile.summary.wordTargetMin}–${profile.summary.wordTargetMax} words.`,
    `- Skills: max ${profile.skills.maxCategoryLines} category lines, max ${profile.skills.softMaxTermsPerCategory} terms per line, max ${profile.skills.maxUniqueTerms} unique terms.`,
    `- Select bullets per role — do NOT paste every source bullet: recent ${profile.bullets.tiers.recent.targetMax}, mid ${profile.bullets.tiers.mid.targetMax}, older ${profile.bullets.tiers.older.targetMax} max.`,
    "- At least ~70% of bullets MUST include a metric from source (%, count, scale, time, rating).",
    "- Only list tools/frameworks present in source resume — do not invent stacks.",
  ].join("\n");
}

function buildV2PageBudgetBlock(profile: ResumeRulesProfileV2): string {
  if (profile.unlimitedContent) {
    return `
PAGE BUDGET (4+ extended — RULES V2):
- No summary, skills, or bullet count limits — include all strong source facts aligned to the JD.
- ${EXTENDED_MODE_ATS_WARNING}
`.trim();
  }
  const b = profile.bullets;
  return `
PAGE BUDGET (${profile.modeLabel} — RULES V2):
- Professional Summary — ${profile.summary.targetSentencesMin}–${profile.summary.targetSentencesMax} sentences, ${profile.summary.wordTargetMin}–${profile.summary.wordTargetMax} words.
- Recent role: ${b.tiers.recent.targetMin}–${b.tiers.recent.targetMax} bullets; second role: ${b.tiers.mid.targetMin}–${b.tiers.mid.targetMax}; older: ${b.tiers.older.targetMin}–${b.tiers.older.targetMax}.
- Skills: up to ${profile.skills.maxCategoryLines} labeled category lines, max ${profile.skills.maxUniqueTerms} unique terms.
`.trim();
}

export function buildEnhanceSystemPromptV2(ctx: CandidateContext): string {
  const profile = resolveV2ProfileFromCtx(ctx);
  return [
    "You are the EasySubmit Career Navigator — an expert ATS resume strategist (RULES VERSION 2).",
    "Your sole objective: maximize ATS readiness score for the target platform and job under RULES V2.",
    "Regenerate resume content aggressively to mirror the JD and clear every item in the ATS Optimization Spec.",
    buildV2RulesExcerpt(profile),
    buildV2PageBudgetBlock(profile),
    buildV2HardConstraintsBlock(profile),
    `Candidate seniority signal: ${ctx.senioritySignal} (~${ctx.yearsExperienceEstimate} years experience).`,
    "Contact fields (name, email, phone, location, LinkedIn) are managed separately — do not output them.",
    "Return ONLY valid JSON matching the requested schema — no markdown fences or commentary.",
  ].join("\n\n");
}

function buildV2UserPromptTasks(
  spec: AtsOptimizationSpec,
  ctx: CandidateContext,
  jdRole: string,
  profile: ResumeRulesProfileV2,
): string[] {
  const summaryTask = profile.unlimitedContent
    ? `1. Write a NEW professional summary for ${jdRole} (at least ${profile.summary.wordTargetMin} words; no upper limit in 4+ mode).`
    : `1. Write a NEW professional summary (${profile.summary.targetSentencesMin}–${profile.summary.targetSentencesMax} sentences, ${profile.summary.wordTargetMin}–${profile.summary.wordTargetMax} words) for ${jdRole}.`;
  const skillsTask = profile.unlimitedContent
    ? "2. Finalize skillsText as labeled JD-aligned category lines — include must-add skills from the spec with no term limits."
    : `2. Finalize skillsText as up to ${profile.skills.maxCategoryLines} JD-aligned category lines (max ${profile.skills.maxUniqueTerms} unique terms) — include must-add skills from the spec.`;
  const bulletTask = profile.unlimitedContent
    ? "3. For EACH experience entry: include strongest facts from SOURCE RESUME; rewrite bullets for the JD; ~70% with metrics from source; no bullet count limits."
    : "3. For EACH experience entry: select strongest facts from SOURCE RESUME; rewrite bullets per tier budget; ~70% with metrics from source; one past-tense action verb per bullet.";
  const shared = [
    summaryTask,
    skillsTask,
    bulletTask,
    "4. Regenerate certifications, projects, languages, and custom section content for JD alignment when present.",
    "5. Keep all experience/education entry ids, company names, job titles, school names, degree fields, and date fields exactly unchanged.",
    "6. Do not invent employers, job titles, employment dates, schools, degrees, or metrics not supported by source facts.",
    "7. Fix spacing: no concatenated words; correct hyphenation in compound adjectives.",
  ];

  if (spec.lightPath) {
    return [
      ...shared.slice(0, 1),
      `   When the spec allows target-role positioning, open with the target role/theme; otherwise open with the candidate identity. Use ~${spec.yearsExperienceEstimate ?? ctx.yearsExperienceEstimate} years of experience.`,
      ...shared.slice(1),
      "8. Do not copy an old professional summary.",
    ];
  }

  return shared;
}

export function buildEnhanceUserPromptV2(
  ctx: CandidateContext,
  spec: AtsOptimizationSpec,
): string {
  const profile = resolveV2ProfileFromCtx(ctx);
  const specBlock = formatAtsOptimizationSpecBlock(spec);
  const rawSource = ctx.rawResumeSource
    ? `\nSOURCE RESUME — FULL FACT BANK (primary evidence; select and compress from this before rewriting):\n"""\n${ctx.rawResumeSource}\n"""\n`
    : "";

  const bodyJson = JSON.stringify(ctx.resumeBody, null, 2);
  const jdRole = spec.directive?.effectiveTargetRole ?? spec.targetRole;
  const intro = spec.lightPath
    ? [
        "Create a maximum-ATS-score resume for this application (RULES VERSION 2).",
        "Skills section has been pre-merged toward JD requirements — reorganize skillsText into labeled category lines.",
        "Experience bullets fields contain compressed SOURCE FACTS — expand into full achievement bullets grounded only in those facts.",
        "Do NOT copy an old professional summary — write a new one from years of experience, identity, and the JD directive.",
      ]
    : [
        "Create a maximum-ATS-score resume for this application (RULES VERSION 2).",
        "Regenerate from scratch: professional summary, experience bullets, certifications, projects, languages, and custom sections.",
      ];

  return [
    ...intro,
    "Write in a natural professional voice — not robotic or AI-sounding.",
    specBlock,
    buildV2HardConstraintsBlock(profile),
    rawSource,
    "",
    "Resume skeleton JSON (no contact fields — preserve entry ids, companies, titles, schools, dates exactly):",
    bodyJson,
    "",
    "Tasks:",
    ...buildV2UserPromptTasks(spec, ctx, jdRole, profile),
    "",
    "Output JSON with the same structure as the input resume body (full bullets in experience[].bullets).",
  ].join("\n");
}
