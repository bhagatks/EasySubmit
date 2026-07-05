import {
  normalizeResumePageModeV2,
  type ResumePageModeV2,
} from "@/lib/resume/v2/page-mode";
import {
  EXTENDED_MODE_ATS_WARNING,
  resolveResumeRulesProfileV2,
  type ResumeRulesProfileV2,
} from "@/lib/resume/v2/rules-config";

export type BuildDeepSeekPromptV2Input = {
  pageMode?: ResumePageModeV2;
  targetRole: string;
  yearsExperience?: number;
  seniorityLabel?: string;
  platform?: string;
  resumeSourceText: string;
  jobDescription: string;
  mustWeaveKeywords?: string[];
  mustAddSkills?: string[];
};

function bulletBudgetLines(profile: ResumeRulesProfileV2): string[] {
  const b = profile.bullets;
  if (profile.unlimitedContent) {
    return [
      "- No bullet count limits in 4+ extended mode — include all strong source facts.",
      `- Each bullet: ~${b.targetWordsMin}–${b.targetWordsMax} words when possible; avoid lines over ${b.warnCharLengthAbove} characters.`,
      `- ${EXTENDED_MODE_ATS_WARNING}`,
    ];
  }
  return [
    "- No hard bullet cap — never drop bullets silently.",
    `- Recent role: target ${b.tiers.recent.targetMin}–${b.tiers.recent.targetMax} bullets (warn above ${b.tiers.recent.warnAbove}).`,
    `- Second role: target ${b.tiers.mid.targetMin}–${b.tiers.mid.targetMax} bullets (warn above ${b.tiers.mid.warnAbove}).`,
    `- Older roles: target ${b.tiers.older.targetMin}–${b.tiers.older.targetMax} bullets (warn above ${b.tiers.older.warnAbove}).`,
    `- Each bullet: ~${b.targetWordsMin}–${b.targetWordsMax} words; avoid lines over ${b.warnCharLengthAbove} characters.`,
  ];
}

function skillsRulesLines(profile: ResumeRulesProfileV2): string[] {
  const s = profile.skills;
  if (profile.unlimitedContent) {
    return [
      '- Use labeled category lines: "Category Label: term, term, term".',
      "- No tables, skill bars, or star ratings.",
      "- Prioritize JD-aligned hard skills; mirror JD noun phrases in category labels.",
      "- Only include tools the candidate actually used per source resume.",
      `- ${EXTENDED_MODE_ATS_WARNING}`,
    ];
  }
  return [
    `- Up to ${s.maxCategoryLines} category lines in this format: "Category Label: term, term, term".`,
    `- Max ${s.maxUniqueTerms} unique comma-separated terms across all categories; max ${s.softMaxTermsPerCategory} per line.`,
    "- No tables, skill bars, or star ratings.",
    "- Prioritize JD-aligned hard skills; mirror JD noun phrases in category labels (e.g. Client-Side Web: Angular, TypeScript, HTML5, CSS3).",
    "- Only include tools the candidate actually used per source resume.",
  ];
}

function summaryRulesLines(profile: ResumeRulesProfileV2): string[] {
  const s = profile.summary;
  if (profile.unlimitedContent) {
    return [
      `- Target ${s.targetSentencesMin}–${s.targetSentencesMax} sentences; at least ${s.wordTargetMin} words.`,
      "- Plain paragraph; no bullets; no first person; no keyword dumps or ATS score claims.",
      `- Never use banned phrases: "proven track record", "results-driven", "passionate", "synergy", "leverage".`,
      `- ${EXTENDED_MODE_ATS_WARNING}`,
    ];
  }
  return [
    `- REQUIRED: ${s.targetSentencesMin}–${s.targetSentencesMax} sentences and ${s.wordTargetMin}–${s.wordTargetMax} words — under ${s.wordTargetMin} words is invalid.`,
    `- Warn band: ${s.warnWordsFrom}–${s.warnWordsTo} words; never exceed ${s.errorWordsFrom - 1} words.`,
    "- Plain paragraph; no bullets; no first person; no keyword dumps or ATS score claims.",
    '- Never use banned phrases: "proven track record", "results-driven", "passionate", "synergy", "leverage".',
  ];
}

function hardConstraintLines(profile: ResumeRulesProfileV2): string[] {
  if (profile.unlimitedContent) {
    return [
      "HARD CONSTRAINTS (invalid output if violated):",
      "- Single-column plain text; standard section titles; NEVER use tables.",
      "- Only list tools/frameworks present in source resume — map JD terms honestly.",
      "- IMMUTABLE: employer names, job titles, employment dates, school names, degree fields.",
      `- PAGE MODE 4+ EXTENDED: no content length limits — maximize JD keyword coverage.`,
      `- ${EXTENDED_MODE_ATS_WARNING}`,
    ];
  }
  const s = profile;
  return [
    "HARD CONSTRAINTS (invalid output if violated):",
    `- Summary MUST be ${s.summary.wordTargetMin}–${s.summary.wordTargetMax} words.`,
    `- Skills: max ${s.skills.maxCategoryLines} category lines, max ${s.skills.softMaxTermsPerCategory} terms per line, max ${s.skills.maxUniqueTerms} unique terms.`,
    `- Select bullets per role — do NOT paste every source bullet: recent ${s.bullets.tiers.recent.targetMax}, mid ${s.bullets.tiers.mid.targetMax}, older ${s.bullets.tiers.older.targetMax} max.`,
    "- At least ~70% of bullets MUST include a metric from source (%, count, scale, time, rating).",
    "- Only list tools/frameworks present in source resume — map JD terms honestly; do not invent stacks (e.g. do not add Ionic if source has Flutter).",
  ];
}

function jdSummaryDirectives(jobDescription: string): string[] {
  const lower = jobDescription.toLowerCase();
  const lines: string[] = [];

  if (lower.includes("legal") && lower.includes("cybersecurity")) {
    lines.push(
      '- Summary MUST name all four JD stakeholder functions in one sentence: "Legal, Risk, Compliance, and Cybersecurity" (e.g. partner/collaborate on secure cloud data handling). Use those exact words.',
    );
  }

  if (/\bprototyp/i.test(jobDescription)) {
    lines.push(
      '- Include the JD term "prototyping" (or "prototype") in Skills or summary when technology evaluation is in the JD.',
    );
  }

  if (/\bsdlc\b/i.test(jobDescription) || lower.includes("software development life")) {
    lines.push('- Include "SDLC" in Skills when the JD references software development lifecycle work.');
  }

  return lines;
}

function pageModeLabel(profile: ResumeRulesProfileV2): string {
  if (profile.pageMode === "4+") return "4+ extended (no content limits)";
  if (profile.pageMode === "1") return "1 page (tight ATS budget)";
  return `${profile.pageMode} pages (${profile.modeLabel})`;
}

export function buildDeepSeekPromptV2(input: BuildDeepSeekPromptV2Input): string {
  const pageMode = normalizeResumePageModeV2(input.pageMode ?? "2");
  const profile = resolveResumeRulesProfileV2(pageMode);
  if (!profile) {
    throw new Error(`Resume rules v2 prompt has no profile for page mode "${pageMode}".`);
  }

  const years = input.yearsExperience ?? 0;
  const seniority = input.seniorityLabel ?? "professional";
  const platform = input.platform ?? "workday";
  const keywords = input.mustWeaveKeywords ?? [];
  const mustAdd = input.mustAddSkills ?? [];

  const keywordBlock =
    keywords.length > 0
      ? `\nKEYWORDS — weave truthfully into summary, skills categories, and bullets:\n${keywords.join(", ")}\n`
      : "";

  const skillsBlock =
    mustAdd.length > 0
      ? `\nSKILLS — prioritize when supported by source resume:\n${mustAdd.join(", ")}\n`
      : "";

  const jdDirectives = jdSummaryDirectives(input.jobDescription);
  const jdDirectiveBlock =
    jdDirectives.length > 0
      ? `\nJD SUMMARY DIRECTIVES (required when applicable):\n${jdDirectives.join("\n")}\n`
      : "";

  const skillsTaskLine = profile.unlimitedContent
    ? "2. Reorganize Skills into labeled JD-aligned category lines — include all supported JD terms from source."
    : `2. Reorganize Skills into up to ${profile.skills.maxCategoryLines} labeled category lines with JD-aligned terms (max ${profile.skills.maxUniqueTerms} unique terms).`;

  return `You are the EasySubmit Career Navigator — expert ATS resume strategist (RULES VERSION 2).

PAGE MODE: ${pageModeLabel(profile)}
Target role: ${input.targetRole}
Candidate: ~${years} years experience · ${seniority} seniority
Platform: ${platform} (parse_first — structure before keyword stuffing)

Use ONLY facts from the source resume. Do not invent employers, titles, dates, schools, degrees, or metrics.

---

RULES V2 — SUMMARY
${summaryRulesLines(profile).join("\n")}

RULES V2 — SKILLS (chat-style categories)
${skillsRulesLines(profile).join("\n")}

RULES V2 — EXPERIENCE BULLETS
- Past-tense action verb + task + quantified result (~70% with a metric from source).
- Avoid "Responsible for."
${bulletBudgetLines(profile).join("\n")}

RULES V2 — LAYOUT
- Single-column plain text; standard section titles (Professional Summary, Skills, Professional Experience, Education, Certifications).
- NEVER use tables (including Key Achievements tables).
- IMMUTABLE: employer names, job titles, employment dates, school names, degree fields.

${hardConstraintLines(profile).join("\n")}

${keywordBlock}${skillsBlock}${jdDirectiveBlock}
---

TASK
Create a maximum-ATS-score resume for this application within PAGE MODE ${profile.pageMode.toUpperCase()}.

1. Write a NEW professional summary for ${input.targetRole} (follow RULES V2 summary band).
${skillsTaskLine}
3. For EACH experience entry: select strongest facts from source, rewrite bullets for the JD; do not discard named products, partners, patents, awards, or real metrics when they support the JD.
4. Keep all company names, job titles, schools, degrees, and dates exactly as in source.
5. Do not invent achievements or metrics.
6. Return plain text only — copy-paste ready. Use ALL CAPS or Title Case section headers without Markdown (#, **, or tables). Skills: one category per line as "Category Label: term, term, term" (no leading dashes). Experience bullets start with "- ". Include Header, Summary, Skills, Experience, Education, Certifications. No JSON. No commentary.

---

SOURCE RESUME:
"""
${input.resumeSourceText}
"""

JOB DESCRIPTION:
"""
${input.jobDescription}
"""`;
}

export function buildDeepSeekSystemPromptV2(): string {
  return [
    "You rewrite resumes for ATS and recruiter readability under EasySubmit RULES VERSION 2.",
    "Follow PAGE MODE constraints exactly. Never use tables. Never fabricate facts.",
    "Output plain resume text only.",
  ].join(" ");
}
