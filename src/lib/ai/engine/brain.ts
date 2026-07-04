import type { CandidateContext } from "@/src/lib/ai/engine/candidate-context";
import type { AtsOptimizationSpec } from "@/lib/job-tracker/ats/build-ats-optimization-spec";
import { formatAtsOptimizationSpecBlock } from "@/lib/job-tracker/ats/build-ats-optimization-spec";
import { buildExperienceBulletBudgetPrompt } from "@/lib/resume/experience-bullet-rules";
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
  const rawSnippet = ctx.rawResumeSnippet
    ? `\nSOURCE RESUME SNIPPET (reference):\n"""\n${ctx.rawResumeSnippet}\n"""\n`
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
      rawSnippet,
      "",
      "Resume skeleton JSON (no contact fields — preserve entry ids, companies, titles, schools, dates exactly):",
      bodyJson,
      "",
      "Tasks:",
      `1. Write a NEW professional summary (${SUMMARY_SENTENCE_COUNT} sentences, ${SUMMARY_WORD_MIN}–${SUMMARY_WORD_MAX} words) for ${jdRole}. Open with the candidate identity from the spec when provided. Use ~${spec.yearsExperienceEstimate ?? ctx.yearsExperienceEstimate} years of experience. Do not invent employers or metrics.`,
      `2. Finalize skillsText with ${SKILLS_HARD_MIN_SYSTEM}–${SKILLS_HARD_MAX} JD-aligned skills — include must-add skills from the directive.`,
      "3. For EACH experience entry: rewrite bullets from the source facts only — one past-tense action verb per bullet; ~70% with metrics that appear in the facts. Preserve entry ids, company, title, and dates.",
      "4. Regenerate certifications, projects, languages, and custom section content for JD alignment when present.",
      "5. Keep all experience/education entry ids, company names, job titles, school names, degree fields, and date fields exactly unchanged.",
      "6. Do not invent employers, job titles, employment dates, schools, degrees, or metrics not supported by source facts.",
      "7. Fix spacing: no concatenated words; correct hyphenation in compound adjectives.",
      "",
      "Output JSON with the same structure as the input resume body (full bullets in experience[].bullets).",
    ].join("\n");
  }

  return [
    "Create a maximum-ATS-score resume for this application.",
    "Skills section has been pre-merged toward JD requirements — you may rewrite/reorder skillsText for optimal keyword coverage.",
    "Regenerate from scratch: professional summary, ALL experience bullets, certifications, projects, languages, and custom sections.",
    specBlock,
    rawSnippet,
    "",
    "Resume skeleton JSON (no contact fields — preserve entry ids, companies, titles, schools, dates exactly):",
    bodyJson,
    "",
    "Tasks:",
    `1. Write a new professional summary (${SUMMARY_SENTENCE_COUNT} sentences, ${SUMMARY_WORD_MIN}–${SUMMARY_WORD_MAX} words) aligned to ${jdRole} and the ATS Optimization Spec.`,
    `2. Finalize skillsText with ${SKILLS_HARD_MIN_SYSTEM}–${SKILLS_HARD_MAX} JD-aligned skills — include every missing keyword from the spec.`,
    "3. Rewrite EVERY experience bullet from scratch — mirror JD responsibilities/keywords; one past-tense action verb per bullet; ~70% with metrics.",
    "4. Regenerate certifications, projects, languages, and custom section content for JD alignment.",
    "5. Keep all experience/education entry ids, company names, job titles, school names, degree fields, and date fields exactly unchanged.",
    "6. Do not invent employers, job titles, employment dates, schools, or degrees.",
    "7. Fix spacing: no concatenated words; correct hyphenation in compound adjectives.",
    "",
    "Output JSON with the same structure as the input resume body.",
  ].join("\n");
}

export function buildDirectiveBlock(directive: import("@/lib/job-tracker/jd/jd-intelligence").ResumeEnhanceDirective): string {
  const parts: string[] = [];
  if (directive.mustAddSkills.length > 0) {
    parts.push(`SKILLS — add ALL:\n  ${directive.mustAddSkills.join(", ")}`);
  }
  if (directive.mustWeaveKeywords.length > 0) {
    parts.push(
      `KEYWORDS — weave into summary + bullets:\n  ${directive.mustWeaveKeywords.slice(0, 15).join(", ")}`,
    );
  }
  return parts.length ? `\n${parts.join("\n\n")}\n` : "";
}
