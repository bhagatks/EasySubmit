import type { CandidateContext } from "@/src/lib/ai/engine/candidate-context";
import type { JobIntelligence } from "@/lib/job-tracker/ats/job-intelligence";
import type { ResumeEnhanceDirective } from "@/lib/job-tracker/jd/jd-intelligence";

const ATS_RULES_EXCERPT = `
ATS RULES (non-negotiable):
- Fixed section order: Summary → Skills → Experience → Education → optional Certifications/Projects/Languages.
- Single-column plain text semantics; standard section titles only.
- Experience bullets: action verb + task + quantified result where truthful (~70% with a metric).
- Skills: 6–12 items; only include tools, technologies, methodologies, and platforms the candidate has actually used. Never include plain English words, soft-skill adjectives, company names, HR jargon, or generic nouns (e.g. "planning", "people", "compliance", "area", "attention").
- First use of acronyms: spell out then abbreviate (e.g. "Search Engine Optimization (SEO)").
- Never include "ATS", match scores, or keyword dumps in resume text.
- Summary must be clean prose — no redundant phrases like "over X+ years" (use either "over X years" or "X+ years", never both); ensure spaces between words.
- Never invent employers, dates, degrees, or metrics — only amplify what the profile supports.
`.trim();

function buildPageBudgetBlock(ctx: CandidateContext): string {
  const b = ctx.pageBudget;
  return `
PAGE BUDGET (${b.pages} page(s)):
- Summary: up to ${b.summarySentencesMax} sentences.
- Experience: up to ${b.maxRolesDetailed} roles, max ${b.maxBulletsPerRole} bullets each.
- Skills: up to ${b.maxSkills} items.
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

export function buildEnhanceUserPrompt(
  ctx: CandidateContext,
  pass: "generate" | "optimize",
  intelligence?: JobIntelligence,
  directive?: ResumeEnhanceDirective,
): string {
  const jdBlock = ctx.jobDescription
    ? `\nJOB DESCRIPTION TO TARGET:\n"""\n${ctx.jobDescription.slice(0, 12000)}\n"""\n`
    : "";

  const rawSnippet = ctx.rawResumeSnippet
    ? `\nSOURCE RESUME SNIPPET (ground truth):\n"""\n${ctx.rawResumeSnippet}\n"""\n`
    : "";

  const bodyJson = JSON.stringify(ctx.resumeBody, null, 2);

  if (pass === "generate") {
    return [
      `Target role: ${ctx.targetRole}`,
      jdBlock || "Mode: general ATS enhancement (no job description).",
      rawSnippet,
      "Current resume body JSON (no contact fields):",
      bodyJson,
      "",
      "Tasks:",
      "1. Rewrite professional summary: align title and narrative to the target role. If the JD is for a non-engineering role (e.g. People, Operations, Product, Finance), reframe the candidate's experience in terms of that domain — do not keep an engineering-specific title or framing.",
      "2. Rebuild the skills list from scratch based on what the TARGET ROLE actually needs. Remove skills irrelevant to the role and replace with role-specific competencies, tools, and methodologies the candidate genuinely has (e.g. for a People/HR role: 'Program Management, Workforce Planning, Organizational Design, People Analytics, Change Management, Agile, AI & Digital Transformation'). Do not carry over the original skills list blindly.",
      "3. Rewrite each experience bullet as a single clean sentence starting with ONE past-tense action verb. Never start a bullet with two consecutive verbs (e.g. 'Led lead', 'Built define', 'Executed provided' are all wrong — pick one verb). Emphasize outcomes measurable by the target role.",
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

  // Pass 2 — tactical optimization using pre-computed intelligence
  const intelligenceBlock = directive
    ? buildDirectiveBlock(directive)
    : buildIntelligenceBlock(intelligence);

  return [
    `Target role: ${ctx.targetRole}`,
    jdBlock,
    intelligenceBlock,
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
    parts.push(`BULLET REWRITES — use these verbs: ${directive.targetVerbs.join(", ")}`);
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
