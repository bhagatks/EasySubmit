import { prisma } from "@/lib/prisma";
import { detectPlatform } from "@/lib/job-tracker/ats/platform-rules";
import { computeResumeReadiness } from "@/lib/job-tracker/ats/resume-readiness-score";
import type { EnhanceSessionMeta } from "@/lib/job-tracker/enhance/enhance-brief";
import type { JDIntelligence } from "@/lib/job-tracker/jd/jd-intelligence";
import { refineryFormToPrimeResume } from "@/lib/onboarding/hubResume";
import { getMergedResumeForJob } from "@/lib/profile/job-resume-tailor";

export type LatestJobAnalysis = {
  jobId: string;
  jobTitle: string;
  company: string | null;
  platform: string | null;
  status: string;
  tailorStatus: "untailored" | "tailored";
  readinessDelta: { before: number; after: number } | null;
  coverageAfter: number | null;
  enhanceSummary: string | null;
  beforeScore: number | null;
  afterScore: number | null;
  estimatedScore: number | null;
  topImprovements: string[];
  remainingGaps: string[];
  warnings: string[];
};

function readJdIntelligence(raw: unknown): JDIntelligence | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as JDIntelligence;
}

function readEnhanceMeta(raw: unknown): EnhanceSessionMeta | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as EnhanceSessionMeta;
}

function parseTopImprovements(enhanceSummary: string | null | undefined): string[] {
  if (!enhanceSummary?.trim()) return [];
  const parts: string[] = [];
  if (/summary rewritten/i.test(enhanceSummary)) {
    parts.push("Summary rewritten to 4-sentence standard");
  }
  const skillsMatch = enhanceSummary.match(/Added (\d+) skills/i);
  if (skillsMatch) {
    parts.push(`Added ${skillsMatch[1]} role-specific skills`);
  }
  const bulletMatch = enhanceSummary.match(/(\d+) bullets? rewritten/i);
  if (bulletMatch) {
    parts.push(`Rewrote ${bulletMatch[1]} experience bullets`);
  }
  return parts.slice(0, 3);
}

export async function analyzeLatestJob(userId: string): Promise<LatestJobAnalysis | null> {
  const latestJob = await prisma.jobTrackerEntry.findFirst({
    where: { userId },
    orderBy: { savedAt: "desc" },
    include: { resumeTailor: true },
  });

  if (!latestJob) {
    return null;
  }

  const enhanceMeta = readEnhanceMeta(latestJob.resumeTailor?.enhanceMeta);
  const readinessDelta = enhanceMeta?.readinessDelta ?? null;
  const coverageAfter = enhanceMeta?.coverageAfter?.coveragePercent ?? null;
  const enhanceSummary = enhanceMeta?.enhanceSummary ?? null;
  const hasTailoredResume = Boolean(latestJob.resumeTailor);

  let beforeScore = readinessDelta?.before ?? null;
  let afterScore = readinessDelta?.after ?? null;
  let estimatedScore: number | null = afterScore;

  if (hasTailoredResume && latestJob.description?.trim()) {
    const merged = await getMergedResumeForJob(userId, latestJob.id);
    if (merged.success) {
      const jdIntelligence = readJdIntelligence(latestJob.jdIntelligence);
      const atsPlatform = detectPlatform(latestJob.canonicalUrl, latestJob.platform);
      const prime = refineryFormToPrimeResume(merged.form, { targetRole: merged.targetTitle });
      const targetTitle =
        jdIntelligence?.extractedJobTitle?.trim() || merged.targetTitle || latestJob.title;

      const readiness = computeResumeReadiness(
        prime,
        targetTitle,
        latestJob.description,
        jdIntelligence,
        atsPlatform,
      );
      estimatedScore = readiness.total;
      if (beforeScore === null) beforeScore = readinessDelta?.before ?? null;
      if (afterScore === null) afterScore = estimatedScore;
    }
  }

  const topImprovements = parseTopImprovements(enhanceSummary);
  const remainingGaps: string[] = [];
  const warnings: string[] = [];

  if (coverageAfter !== null && coverageAfter < 100) {
    remainingGaps.push(
      `Only ${coverageAfter}% of tier-1 JD keywords covered — add more role-specific skills or bullet keywords`,
    );
  }

  if (enhanceMeta?.warning) {
    warnings.push(enhanceMeta.warning);
  }
  if (enhanceMeta?.coherenceWarnings?.length) {
    warnings.push(...enhanceMeta.coherenceWarnings);
  }

  return {
    jobId: latestJob.id,
    jobTitle: latestJob.title,
    company: latestJob.company,
    platform: latestJob.platform,
    status: latestJob.status,
    tailorStatus: hasTailoredResume ? "tailored" : "untailored",
    readinessDelta,
    coverageAfter,
    enhanceSummary,
    beforeScore,
    afterScore,
    estimatedScore,
    topImprovements,
    remainingGaps,
    warnings,
  };
}

export function formatAnalysis(analysis: LatestJobAnalysis): string {
  const lines: string[] = [];

  lines.push(`\n📊 Resume Optimization Analysis`);
  lines.push(`${"=".repeat(60)}\n`);

  lines.push(`Job: ${analysis.jobTitle}`);
  if (analysis.company) lines.push(`Company: ${analysis.company}`);
  if (analysis.platform) lines.push(`Platform: ${analysis.platform}`);
  lines.push(`Status: ${analysis.status}`);
  lines.push(`Tailored: ${analysis.tailorStatus === "tailored" ? "✓ Yes" : "✗ No"}\n`);

  if (analysis.estimatedScore !== null) {
    lines.push(`📈 Readiness Score: ${analysis.estimatedScore}/100`);
    if (analysis.beforeScore !== null && analysis.afterScore !== null && analysis.readinessDelta) {
      const delta = analysis.afterScore - analysis.beforeScore;
      const indicator = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";
      lines.push(
        `   Before: ${analysis.beforeScore} → After: ${analysis.afterScore} ${indicator} (${delta > 0 ? "+" : ""}${delta})`,
      );
    }
  }

  if (analysis.coverageAfter !== null) {
    const indicator = analysis.coverageAfter === 100 ? "✓" : "⚠";
    lines.push(`${indicator} Keyword Coverage: ${analysis.coverageAfter}%\n`);
  }

  if (analysis.topImprovements.length > 0) {
    lines.push(`✨ Top Improvements:`);
    for (const imp of analysis.topImprovements) {
      lines.push(`  • ${imp}`);
    }
    lines.push("");
  }

  if (analysis.remainingGaps.length > 0) {
    lines.push(`🔧 What Still Needs Work:`);
    for (const gap of analysis.remainingGaps) {
      lines.push(`  • ${gap}`);
    }
    lines.push("");
  }

  if (analysis.warnings.length > 0) {
    lines.push(`⚠️  Warnings:`);
    for (const warn of analysis.warnings) {
      lines.push(`  • ${warn}`);
    }
  }

  return lines.join("\n");
}
