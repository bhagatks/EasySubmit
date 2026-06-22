import type { CandidateContext } from "@/src/lib/ai/engine/candidate-context";
import type { JobIntelligence } from "@/lib/job-tracker/ats/job-intelligence";

const ATS_RULES_EXCERPT = `
ATS RULES (non-negotiable):
- Fixed section order: Summary → Skills → Experience → Education → optional Certifications/Projects/Languages.
- Single-column plain text semantics; standard section titles only.
- Experience bullets: action verb + task + quantified result where truthful (~70% with a metric).
- Skills: 6–12 items for 1-page resumes; mirror job keywords only when supported by experience.
- First use of acronyms: spell out then abbreviate (e.g. "Search Engine Optimization (SEO)").
- Never include "ATS", match scores, or keyword dumps in resume text.
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
      "1. Rewrite professional summary for clarity, impact, and role fit.",
      "2. Optimize skills list for ATS keyword coverage (truthful only).",
      "3. Rewrite experience bullets with strong action verbs and metrics where supported.",
      "4. Tighten education, certifications, projects, languages, custom sections.",
      "5. Preserve all experience/education entry ids, companies, schools, and date fields exactly.",
      ctx.jobDescription
        ? "6. Mirror JD keywords and phrasing where the candidate has genuine support."
        : "6. Align content to the target role without inventing facts.",
      "",
      "Output JSON with the same structure as the input resume body.",
    ].join("\n");
  }

  // Pass 2 — tactical optimization using pre-computed intelligence
  const intelligenceBlock = buildIntelligenceBlock(intelligence);

  return [
    `Target role: ${ctx.targetRole}`,
    jdBlock,
    intelligenceBlock,
    "Perform a strict second-pass edit on the draft below.",
    "Fix weak verbs, missing metrics, keyword gaps, and any ATS rule violations.",
    "Ensure every bullet is scannable and achievement-oriented.",
    "Output the final JSON resume body only.",
    "",
    "DRAFT JSON:",
    bodyJson,
  ]
    .filter(Boolean)
    .join("\n");
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
      `MISSING KEYWORDS — weave these into bullets and summary where truthfully supported:\n  ${intelligence.keywordsForContent.slice(0, 8).join(", ")}`,
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
