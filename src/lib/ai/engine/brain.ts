import type { CandidateContext } from "@/src/lib/ai/engine/candidate-context";
import type { JobIntelligence } from "@/lib/job-tracker/ats/job-intelligence";
import type { JDSegments, ResumeEnhanceDirective } from "@/lib/job-tracker/jd/jd-intelligence";
import { buildJdDraftPromptBlock } from "@/lib/job-tracker/jd/jd-prompt-segments";
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
- Experience bullets: action verb + task + quantified result where truthful (~70% with a metric).
- Skills: ${SKILLS_TARGET_MIN}–${SKILLS_HARD_MAX} items (target ${SKILLS_HARD_MIN_SYSTEM}–${SKILLS_HARD_MAX}, best-effort truthful — never fabricate); ≥70% hard skills / named methodologies, ≤30% named soft skills; comma-separated tools, technologies, platforms, and methodologies only — no prose sentences (>4 words or action verbs like build/manage/lead). Never inject banned slot-wasters (Communication, Teamwork, Leadership, Problem Solving, Time Management, etc.). Spell out acronyms on first use (e.g. "Search Engine Optimization (SEO)").
- First use of acronyms: spell out then abbreviate (e.g. "Search Engine Optimization (SEO)").
- Never include "ATS", match scores, or keyword dumps in resume text.
- Summary must be clean prose — exactly ${SUMMARY_SENTENCE_COUNT} sentences, ${SUMMARY_WORD_MIN}–${SUMMARY_WORD_MAX} words; no redundant phrases like "over X+ years" (use either "over X years" or "X+ years", never both); ensure spaces between words.
- Never invent employers, dates, degrees, or metrics — only amplify what the profile supports.
`.trim();

function buildPageBudgetBlock(ctx: CandidateContext): string {
  const b = ctx.pageBudget;
  return `
PAGE BUDGET (${b.pages} page(s)):
- Professional Summary — exactly ${SUMMARY_SENTENCE_COUNT} sentences, ${SUMMARY_WORD_MIN}–${SUMMARY_WORD_MAX} words, plain paragraph, no bullets, no "I"/"my." Structure: [Role + years + domain scope] → [Core method/approach] → [Deep specialization + named technologies] → [Signature outcome or organizational impact]. Include at least one quantified claim. Tone: peer-to-practitioner — declarative, precise. Banned words: leverage, spearhead, passionate, dynamic, robust, innovative, cutting-edge, synergy, utilize, facilitate, foster, delve, comprehensive, results-driven, thought leader, proven track record, detail-oriented, self-starter, extensive experience, diverse range of, seasoned professional, highly motivated, visionary, mission-critical.
- ${buildExperienceBulletBudgetPrompt(b.pages, b.maxRolesDetailed)}
- Skills: ${SKILLS_HARD_MIN_SYSTEM}–${SKILLS_HARD_MAX} items (target range).
`.trim();
}

export function buildEnhanceSystemPrompt(ctx: CandidateContext): string {
  return [
    "You are the EasySubmit Career Navigator — an expert ATS resume strategist.",
    "Produce world-class resume content optimized for applicant tracking systems and recruiter skim-reading.",
    ATS_RULES_EXCERPT,
    buildPageBudgetBlock(ctx),
    `Candidate seniority signal: ${ctx.senioritySignal} (~${ctx.yearsExperienceEstimate} years experience).`,
    "Contact fields (name, email, phone, location, LinkedIn) are managed separately — do not output them.",
    "Return ONLY valid JSON matching the requested schema — no markdown fences or commentary.",
  ].join("\n\n");
}

function buildJdBlockForPass(
  pass: "generate" | "optimize",
  ctx: CandidateContext,
  segments?: JDSegments,
): string {
  if (!ctx.jobDescription?.trim()) return "";

  if (pass === "generate" && segments) {
    const draft = buildJdDraftPromptBlock(segments);
    if (draft) {
      return `\nJOB DESCRIPTION TO TARGET (requirements + responsibilities):\n"""\n${draft}\n"""\n`;
    }
  }

  return `\nJOB DESCRIPTION TO TARGET:\n"""\n${ctx.jobDescription.slice(0, 12000)}\n"""\n`;
}

function buildCultureBlock(culture: ResumeEnhanceDirective["cultureSignals"]): string | null {
  const parts: string[] = [];

  if (culture.velocity) {
    const hints: Record<NonNullable<typeof culture.velocity>, string> = {
      fast: "startup pace, ship quickly",
      moderate: "balanced shipping cadence",
      structured: "process-heavy, enterprise cadence",
    };
    parts.push(`pace: ${culture.velocity} (${hints[culture.velocity]})`);
  }

  if (culture.ownership) {
    const hints: Record<NonNullable<typeof culture.ownership>, string> = {
      high: "autonomous, end-to-end ownership",
      medium: "collaborative delivery",
      low: "support and execution focus",
    };
    parts.push(`ownership: ${culture.ownership} (${hints[culture.ownership]})`);
  }

  if (culture.industry.length > 0) {
    parts.push(`industry: ${culture.industry.join(", ")}`);
  }

  if (parts.length === 0) return null;

  return `CULTURE / TONE — align narrative (do not invent facts):\n  ${parts.join("\n  ")}`;
}

function buildGapsBlock(
  gaps: Array<{ atom: { label: string } }>,
  resumeSkills: string[],
): string | null {
  if (gaps.length === 0) return null;

  const gapLines = gaps
    .slice(0, 8)
    .map((g) => `  - ${g.atom.label}`)
    .join("\n");

  const adjacent =
    resumeSkills.length > 0
      ? resumeSkills.slice(0, 15).join(", ")
      : "related skills from the candidate's experience";

  return [
    "GAPS (required by JD but missing from resume — DO NOT fabricate):",
    gapLines,
    "DO NOT add these to the Skills section or claim hands-on experience.",
    `Instead, emphasize adjacent strengths the candidate genuinely has (e.g. ${adjacent}) in bullets and summary to show related expertise without lying.`,
  ].join("\n");
}

export function buildEnhanceUserPrompt(
  ctx: CandidateContext,
  pass: "generate" | "optimize",
  intelligence?: JobIntelligence,
  directive?: ResumeEnhanceDirective,
  brief?: import("@/lib/job-tracker/enhance/enhance-brief").ResumeEnhanceBrief,
): string {
  const jdBlock = buildJdBlockForPass(pass, ctx, brief?.jd?.segments);

  const rawSnippet = ctx.rawResumeSnippet
    ? `\nSOURCE RESUME SNIPPET (ground truth):\n"""\n${ctx.rawResumeSnippet}\n"""\n`
    : "";

  const bodyJson = JSON.stringify(ctx.resumeBody, null, 2);
  const effectiveRole = directive?.effectiveTargetRole ?? ctx.targetRole;

  if (pass === "generate") {
    const briefHints = brief?.readiness.topActions.length
      ? `\nBaseline already applied — refine, do not discard grouped skills or bullet weave:\n${brief.readiness.topActions.slice(0, 4).map((a) => `- ${a}`).join("\n")}\n`
      : "";

    return [
      "Refine this pre-enhanced resume for the target role. Baseline improvements (skills, bullets, summary) are already applied — improve quality without undoing them.",
      briefHints,
      `Target role: ${effectiveRole}`,
      jdBlock || "Mode: general ATS enhancement (no job description).",
      rawSnippet,
      "Current resume body JSON (no contact fields):",
      bodyJson,
      "",
      "Tasks:",
      `1. Rewrite professional summary to the standard: exactly ${SUMMARY_SENTENCE_COUNT} sentences, ${SUMMARY_WORD_MIN}–${SUMMARY_WORD_MAX} words; Role → Method → Specialization → Impact; at least one quantified claim; peer-to-practitioner tone; no banned words. Align title and narrative to the target role. If the JD is for a non-engineering role (e.g. People, Operations, Product, Finance), reframe the candidate's experience in terms of that domain — do not keep an engineering-specific title or framing.`,
      "2. Rebuild the skills list from scratch based on what the TARGET ROLE actually needs. Remove skills irrelevant to the role and replace with role-specific competencies, tools, and methodologies the candidate genuinely has (e.g. for a People/HR role: 'Program Management, Workforce Planning, Organizational Design, People Analytics, Change Management, Agile, AI & Digital Transformation'). Do not carry over the original skills list blindly.",
      "3. Rewrite each experience bullet as a single clean sentence starting with ONE past-tense action verb. Never start a bullet with two consecutive verbs (e.g. 'Led lead', 'Built define', 'Executed provided' are all wrong — pick one verb). Emphasize outcomes measurable by the target role. Apply the recency bullet budget — most detail on the most recent role; taper older roles to fewer bullets.",
      "4. Tighten education, certifications, projects, languages, custom sections.",
      "5. Preserve all experience/education entry ids, companies, schools, and date fields exactly.",
      ctx.jobDescription
        ? "6. Mirror JD language and framing throughout — especially in summary and bullets — where the candidate's background genuinely supports it."
        : "6. Align content to the target role without inventing facts.",
      "7. Fix all spacing errors: ensure there is always a space between words. Never output concatenated words like 'usingAgentic', 'capabilitywithin', 'withcross-functional'. Ensure hyphens in compound adjectives have no surrounding spaces ('full-stack' not 'full- stack').",
      "",
      "Output JSON with the same structure as the input resume body.",
    ].join("\n");
  }

  const intelligenceBlock = directive
    ? buildDirectiveBlock(directive)
    : buildIntelligenceBlock(intelligence);

  const briefBlock = brief
    ? [
        brief.readiness.topActions.length
          ? `PRIORITY FIXES:\n${brief.readiness.topActions.slice(0, 5).map((a) => `  - ${a}`).join("\n")}`
          : "",
        brief.jd?.coverageBefore.gaps.length
          ? buildGapsBlock(brief.jd.coverageBefore.gaps, brief.skills.list)
          : "",
      ]
        .filter(Boolean)
        .join("\n\n")
    : "";

  return [
    "Refine this pre-enhanced resume. Do not discard baseline improvements.",
    `Target role: ${effectiveRole}`,
    jdBlock,
    intelligenceBlock,
    briefBlock,
    "Perform a strict second-pass edit on the draft below.",
    "Fix weak verbs, missing metrics, keyword gaps, and any ATS rule violations.",
    "Each bullet must start with exactly ONE past-tense action verb — never two consecutive verbs (e.g. 'Led lead', 'Built define' are errors — use only the first verb).",
    "Fix any concatenated words (missing spaces) or broken hyphens ('full- stack' → 'full-stack').",
    "Ensure every bullet is scannable and achievement-oriented.",
    "Output the final JSON resume body only.",
    "",
    "DRAFT JSON:",
    bodyJson,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildDirectiveBlock(directive: ResumeEnhanceDirective): string {
  const parts: string[] = [];

  parts.push(
    `ROLE CONTEXT: ${directive.roleLevel} · ${directive.scope}` +
      (directive.emphasisAreas.length
        ? ` · emphasis: ${directive.emphasisAreas.join(", ")}`
        : ""),
  );

  if (directive.mustRemoveSkills && directive.mustRemoveSkills.length > 0) {
    parts.push(
      `SKILLS — REMOVE these from the Skills section (not relevant to this role):\n  ${directive.mustRemoveSkills.join(", ")}`,
    );
  }

  if (directive.mustAddSkills.length > 0) {
    parts.push(
      `SKILLS — add ALL of these to the Skills section (truthful only):\n  ${directive.mustAddSkills.join(", ")}`,
    );
  }

  if (directive.mustWeaveKeywords.length > 0) {
    parts.push(
      `KEYWORDS — weave naturally into experience bullets and professional summary where supported by the candidate's actual work. Do NOT add these to the Skills section.\n  ${directive.mustWeaveKeywords.slice(0, 15).join(", ")}`,
    );
  }

  if (directive.summaryTheme) {
    parts.push(`SUMMARY — must lead with this theme:\n  "${directive.summaryTheme}"`);
  }

  if (directive.targetVerbs.length > 0) {
    parts.push(
      `BULLET REWRITES — prefer these verbs where they naturally fit the achievement:\n  ${directive.targetVerbs.join(", ")}\n  Do NOT force every verb into the resume if it creates awkward phrasing. Prioritize natural fit over verb coverage.`,
    );
  }

  if (directive.impactDimensions.length > 0) {
    parts.push(`QUANTIFY AGAINST: ${directive.impactDimensions.join(", ")}`);
  }

  if (directive.quantHints.length > 0) {
    parts.push(`  Metric hints: ${directive.quantHints.join(" | ")}`);
  }

  if (directive.deprioritize.length > 0) {
    parts.push(`SUPPRESS / DOWNPLAY: ${directive.deprioritize.join(", ")}`);
  }

  const cultureBlock = buildCultureBlock(directive.cultureSignals);
  if (cultureBlock) parts.push(cultureBlock);

  if (parts.length === 0) return "";

  return `\nPRE-COMPUTED JD ANALYSIS (act on these exactly — do not re-derive):\n${parts.join("\n\n")}\n`;
}

function buildIntelligenceBlock(intelligence?: JobIntelligence): string {
  if (!intelligence) return "";

  const parts: string[] = [];

  if (intelligence.skillsToAdd.length > 0) {
    parts.push(
      `MISSING SKILLS — add these to the skills section (use exact casing from JD where possible):\n  ${intelligence.skillsToAdd.join(", ")}`,
    );
  }

  if (intelligence.keywordsForContent.length > 0) {
    parts.push(
      `MISSING KEYWORDS — weave into experience bullets and summary where truthfully supported. Do NOT add to the Skills section.\n  ${intelligence.keywordsForContent.slice(0, 8).join(", ")}`,
    );
  }

  if (intelligence.weakBullets.length > 0) {
    const targets = intelligence.weakBullets
      .slice(0, 6)
      .map(
        (wb) =>
          `  - "${wb.bulletText.slice(0, 80)}${wb.bulletText.length > 80 ? "…" : ""}" [issues: ${wb.issues.join(", ")}]`,
      )
      .join("\n");
    parts.push(`WEAK BULLETS — rewrite these specifically (keep others):\n${targets}`);
  }

  if (parts.length === 0) return "";

  return `\nPRE-COMPUTED ATS ANALYSIS (act on these — do not re-derive):\n${parts.join("\n\n")}\n`;
}
