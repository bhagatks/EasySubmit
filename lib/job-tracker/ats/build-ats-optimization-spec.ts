import type { KeywordGapResult } from "@/lib/job-tracker/ats/keyword-gap";
import type { JobIntelligence } from "@/lib/job-tracker/ats/job-intelligence";
import type { AtsPlatform, PlatformStrategy } from "@/lib/job-tracker/ats/platform-rules";
import type { ResumeReadinessResult } from "@/lib/job-tracker/ats/resume-readiness-score";
import type {
  JDSegments,
  ResumeEnhanceDirective,
} from "@/lib/job-tracker/jd/jd-intelligence";
import { buildJdDraftPromptBlock } from "@/lib/job-tracker/jd/jd-prompt-segments";

export type AtsOptimizationMode = "jd_full" | "role_company" | "general";

export type AtsOptimizationSpec = {
  mode: AtsOptimizationMode;
  targetRole: string;
  companyName?: string;
  platform: {
    id: AtsPlatform;
    label: string;
    strategy: PlatformStrategy;
    strategyInstructions: string;
    tip: string;
  };
  readiness: ResumeReadinessResult;
  keywordGap?: KeywordGapResult;
  directive?: ResumeEnhanceDirective;
  jobIntelligence?: JobIntelligence;
  jdSegments?: JDSegments;
  jobDescription?: string;
  /** Happy path — omit readiness/gap/intelligence bloat from the prompt. */
  lightPath?: boolean;
  /** Years of experience for summary instructions (light path). */
  yearsExperienceEstimate?: number;
  summaryIdentity?: string;
};

export function buildAtsOptimizationSpec(input: {
  mode: AtsOptimizationMode;
  targetRole: string;
  companyName?: string;
  platform: AtsOptimizationSpec["platform"];
  readiness: ResumeReadinessResult;
  keywordGap?: KeywordGapResult;
  directive?: ResumeEnhanceDirective;
  jobIntelligence?: JobIntelligence;
  jdSegments?: JDSegments;
  jobDescription?: string;
  lightPath?: boolean;
  yearsExperienceEstimate?: number;
  summaryIdentity?: string;
}): AtsOptimizationSpec {
  return { ...input };
}

export function resolveAtsOptimizationMode(input: {
  hasFullJd: boolean;
  targetRole: string;
  companyName?: string | null;
}): AtsOptimizationMode {
  if (input.hasFullJd) return "jd_full";
  if (input.targetRole.trim() && input.companyName?.trim()) return "role_company";
  return "general";
}

export function collectPillarChecklist(readiness: ResumeReadinessResult): string[] {
  const items: string[] = [];
  for (const pillar of Object.values(readiness.pillars)) {
    for (const detail of pillar.details) {
      if (detail.includes("✓")) continue;
      items.push(`[${pillar.label} ${pillar.score}/${pillar.maxScore}] ${detail}`);
    }
  }
  return items;
}

function formatDirectiveForMaxAts(directive: ResumeEnhanceDirective): string {
  const parts: string[] = [];

  parts.push(
    `ROLE CONTEXT: ${directive.roleLevel} · ${directive.scope}` +
      (directive.emphasisAreas.length
        ? ` · emphasis: ${directive.emphasisAreas.join(", ")}`
        : ""),
  );

  if (directive.mustRemoveSkills?.length) {
    parts.push(`SKILLS — REMOVE:\n  ${directive.mustRemoveSkills.join(", ")}`);
  }
  if (directive.mustAddSkills.length > 0) {
    parts.push(
      `SKILLS — ADD ALL (mirror JD exactly):\n  ${directive.mustAddSkills.join(", ")}`,
    );
  }
  if (directive.mustWeaveKeywords.length > 0) {
    parts.push(
      `KEYWORDS — weave into summary + every experience bullet:\n  ${directive.mustWeaveKeywords.slice(0, 20).join(", ")}`,
    );
  }
  if (directive.summaryTheme) {
    parts.push(`SUMMARY THEME:\n  "${directive.summaryTheme}"`);
  }
  if (directive.targetVerbs.length > 0) {
    parts.push(`PREFERRED BULLET VERBS:\n  ${directive.targetVerbs.join(", ")}`);
  }
  if (directive.impactDimensions.length > 0) {
    parts.push(`QUANTIFY AGAINST: ${directive.impactDimensions.join(", ")}`);
  }

  return parts.join("\n\n");
}

function formatIntelligenceForMaxAts(intelligence: JobIntelligence): string {
  const parts: string[] = [];
  if (intelligence.skillsToAdd.length > 0) {
    parts.push(
      `MISSING SKILLS — add ALL to Skills section:\n  ${intelligence.skillsToAdd.join(", ")}`,
    );
  }
  if (intelligence.keywordsForContent.length > 0) {
    parts.push(
      `MISSING KEYWORDS — weave into summary + bullets:\n  ${intelligence.keywordsForContent.slice(0, 15).join(", ")}`,
    );
  }
  if (intelligence.weakBullets.length > 0) {
    const targets = intelligence.weakBullets
      .slice(0, 8)
      .map(
        (wb) =>
          `  - "${wb.bulletText.slice(0, 80)}${wb.bulletText.length > 80 ? "…" : ""}" [${wb.issues.join(", ")}]`,
      )
      .join("\n");
    parts.push(`WEAK BULLETS — rewrite completely:\n${targets}`);
  }
  return parts.join("\n\n");
}

export function formatAtsOptimizationSpecBlock(spec: AtsOptimizationSpec): string {
  if (spec.lightPath) {
    return formatLightAtsOptimizationSpecBlock(spec);
  }

  const lines: string[] = [
    "ATS OPTIMIZATION SPEC (fix every item — goal: maximum readiness score):",
    `Platform: ${spec.platform.label} (${spec.platform.strategy})`,
    `Current score: ${spec.readiness.total}/100 (${spec.readiness.grade})`,
    `Target: 90+ — maximize all four pillars (Completeness, Keyword Match, Bullet Quality, ATS Compliance).`,
    "",
    spec.platform.strategyInstructions,
    "",
    `Platform tip: ${spec.platform.tip}`,
  ];

  const checklist = collectPillarChecklist(spec.readiness);
  if (checklist.length > 0) {
    lines.push("", "SCORE GAPS (from ATS panel — address every line):");
    for (const item of checklist) {
      lines.push(`  - ${item}`);
    }
  }

  if (spec.keywordGap && spec.keywordGap.topMissing.length > 0) {
    lines.push(
      "",
      `MISSING JD KEYWORDS (${spec.keywordGap.coveragePercent}% coverage — add all):`,
      `  ${spec.keywordGap.topMissing.slice(0, 20).join(", ")}`,
    );
  }

  if (spec.directive) {
    const block = formatDirectiveForMaxAts(spec.directive);
    if (block) {
      lines.push("", "JD DIRECTIVE:", block);
    }
  } else if (spec.jobIntelligence) {
    const block = formatIntelligenceForMaxAts(spec.jobIntelligence);
    if (block) {
      lines.push("", "JD INTELLIGENCE:", block);
    }
  }

  appendJobContext(lines, spec);
  return lines.join("\n");
}

/** Happy-path prompt: platform + skills/keywords/theme + JD segments only. */
function formatLightAtsOptimizationSpecBlock(spec: AtsOptimizationSpec): string {
  const lines: string[] = [
    "ATS OPTIMIZATION SPEC (maximize ATS fit for this application):",
    `Platform: ${spec.platform.label} (${spec.platform.strategy})`,
    "",
    spec.platform.strategyInstructions,
    "",
    `Platform tip: ${spec.platform.tip}`,
  ];

  if (spec.yearsExperienceEstimate != null) {
    lines.push(
      "",
      `CANDIDATE: ~${spec.yearsExperienceEstimate} years experience` +
        (spec.summaryIdentity ? ` · identity: ${spec.summaryIdentity}` : ""),
    );
  }

  if (spec.directive) {
    const block = formatDirectiveForMaxAts(spec.directive);
    if (block) {
      lines.push("", "JD DIRECTIVE:", block);
    }
  }

  const checklist = collectPillarChecklist(spec.readiness);
  if (checklist.length > 0) {
    lines.push("", "SCORE GAPS (from ATS panel — address every line):");
    for (const item of checklist) {
      lines.push(`  - ${item}`);
    }
  }

  if (spec.keywordGap && spec.keywordGap.topMissing.length > 0) {
    lines.push(
      "",
      `MISSING JD KEYWORDS (${spec.keywordGap.coveragePercent}% coverage — add all):`,
      `  ${spec.keywordGap.topMissing.slice(0, 20).join(", ")}`,
    );
  }

  appendJobContext(lines, spec);
  return lines.join("\n");
}

function appendJobContext(lines: string[], spec: AtsOptimizationSpec): void {
  if (spec.mode === "role_company" && spec.companyName) {
    lines.push(
      "",
      `ROLE CONTEXT (no full JD): Target ${spec.targetRole} at ${spec.companyName}.`,
      "Build summary, skills, and experience to maximize ATS fit for this role and employer.",
    );
  }

  if (spec.mode === "jd_full" && spec.jdSegments) {
    const draft = buildJdDraftPromptBlock(spec.jdSegments);
    if (draft) {
      lines.push("", "JD REQUIREMENTS + RESPONSIBILITIES:", `"""`, draft, `"""`);
    }
  } else if (spec.jobDescription?.trim()) {
    lines.push(
      "",
      "JOB DESCRIPTION:",
      `"""`,
      spec.jobDescription.trim().slice(0, 12000),
      `"""`,
    );
  }
}

export function buildAtsOptimizationSpecFromBrief(
  brief: import("@/lib/job-tracker/enhance/enhance-brief").ResumeEnhanceBrief,
  input: {
    hasFullJd: boolean;
    companyName?: string | null;
    jobDescription?: string;
  },
): AtsOptimizationSpec {
  return buildAtsOptimizationSpec({
    mode: resolveAtsOptimizationMode({
      hasFullJd: input.hasFullJd,
      targetRole: brief.targetRole,
      companyName: input.companyName,
    }),
    targetRole: brief.targetRole,
    companyName: input.companyName?.trim() || undefined,
    platform: brief.platform,
    readiness: brief.readiness,
    keywordGap: brief.jd?.keywordGap,
    directive: brief.jd?.directive,
    jobIntelligence: brief.lightPath ? undefined : brief.jd?.jobIntelligence,
    jdSegments: brief.jd?.segments,
    jobDescription: input.jobDescription,
    lightPath: brief.lightPath,
    yearsExperienceEstimate: brief.lightPath ? brief.yearsExperienceEstimate : undefined,
    summaryIdentity: brief.lightPath ? brief.summaryIdentity.identity : undefined,
  });
}
