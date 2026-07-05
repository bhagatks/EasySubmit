#!/usr/bin/env npx tsx
/**
 * Batch-compute ATS readiness for job tracker entries (same logic as AtsPanel).
 *
 * Usage:
 *   npx tsx scripts/batch-ats-readiness.ts
 *   npx tsx scripts/batch-ats-readiness.ts --out .tmp-debug/job-automation-dashboard-post-fix.json
 */
import dotenv from "dotenv";
import { writeFileSync } from "node:fs";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

const TEST_COMPANIES = [
  "Walmart",
  "Fidelity",
  "CVS Health",
  "Hightouch",
  "Suvoda",
  "iRhythm",
  "RELX",
] as const;

type JobScore = {
  id: string;
  company: string | null;
  title: string;
  platform: string | null;
  status: string;
  savedAt: string;
  readiness: number | null;
  breakdown: Record<string, string> | null;
  keywordCoverage: string | null;
  exactKeywordCoverage: string | null;
  platformScores: Record<string, number> | null;
  gaps: string[];
  systemsPassed: number | null;
  enhanceMeta: {
    readinessDelta: { before: number; after: number } | null;
    coverageAfter: number | null;
  } | null;
};

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set (.env.local)");
    process.exit(1);
  }

  const outArg = process.argv.indexOf("--out");
  const outPath =
    outArg >= 0 ? process.argv[outArg + 1] : ".tmp-debug/job-automation-dashboard-post-fix.json";
  const idsArg = process.argv.indexOf("--ids");
  const entryIds =
    idsArg >= 0
      ? process.argv[idsArg + 1]?.split(",").map((s) => s.trim()).filter(Boolean)
      : null;

  const { prisma } = await import("@/lib/prisma");
  const { detectPlatform } = await import("@/lib/job-tracker/ats/platform-rules");
  const { computeResumeReadiness } = await import("@/lib/job-tracker/ats/resume-readiness-score");
  const { resolveKeywordGap } = await import("@/lib/job-tracker/ats/resolve-keyword-gap");
  const { computePlatformScores } = await import("@/lib/job-tracker/ats/platform-score");
  const { analyzeBulletQuality } = await import("@/lib/job-tracker/ats/bullet-quality");
  const { computeSemanticSimilarity } = await import("@/lib/job-tracker/ats/semantic-similarity");
  const { computeResumeReadinessV2 } = await import("@/lib/resume/v2/resume-readiness-score");
  const { normalizeResumePageModeV2 } = await import("@/lib/resume/v2/page-mode");
  const { isResumeRulesV2Enabled } = await import("@/lib/resume/v2/runtime");
  const { refineryFormToPrimeResume } = await import("@/lib/onboarding/hubResume");
  const { getMergedResumeForJob } = await import("@/lib/profile/job-resume-tailor");
  const { buildTailoredResumePreview } = await import("@/lib/job-tracker/build-tailored-resume-preview");
  type JDIntelligence = import("@/lib/job-tracker/jd/jd-intelligence").JDIntelligence;
  type EnhanceSessionMeta = import("@/lib/job-tracker/enhance/enhance-brief").EnhanceSessionMeta;
  type PrimeResumeData = import("@/components/onboarding/PrimeResume").PrimeResumeData;

  function readJdIntelligence(raw: unknown): JDIntelligence | null {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    return raw as JDIntelligence;
  }

  function readEnhanceMeta(raw: unknown): EnhanceSessionMeta | null {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    return raw as EnhanceSessionMeta;
  }

  function buildExperienceBlob(data: PrimeResumeData): string {
    return (data.experience ?? [])
      .map((e) => `${e.title ?? ""} ${e.company ?? ""} ${(e.bullets ?? []).join(" ")}`)
      .join("\n");
  }

  function pillarLabel(key: string): string {
    const map: Record<string, string> = {
      keywords: "keywordMatch",
      completeness: "completeness",
      bulletQuality: "bulletQuality",
      atsCompliance: "atsCompliance",
    };
    return map[key] ?? key;
  }

  async function scoreEntry(
    userId: string,
    row: {
      id: string;
      title: string;
      company: string | null;
      platform: string | null;
      status: string;
      savedAt: Date;
      description: string | null;
      canonicalUrl: string | null;
      jdIntelligence: unknown;
      metadata: unknown;
      resumeTailor: {
        enhanceMeta: unknown;
        changedSections: unknown;
        updatedAt: Date;
      } | null;
    },
  ): Promise<JobScore> {
    const base: JobScore = {
      id: row.id,
      company: row.company,
      title: row.title,
      platform: row.platform,
      status: row.status,
      savedAt: row.savedAt.toISOString(),
      readiness: null,
      breakdown: null,
      keywordCoverage: null,
      exactKeywordCoverage: null,
      platformScores: null,
      gaps: [],
      systemsPassed: null,
      enhanceMeta: null,
    };

    const enhanceMeta = readEnhanceMeta(row.resumeTailor?.enhanceMeta);
    if (enhanceMeta) {
      base.enhanceMeta = {
        readinessDelta: enhanceMeta.readinessDelta ?? null,
        coverageAfter: enhanceMeta.coverageAfter?.coveragePercent ?? null,
      };
    }

    if (!row.resumeTailor || !row.description?.trim()) {
      base.gaps.push("No tailored resume or job description");
      return base;
    }

    const merged = await getMergedResumeForJob(userId, row.id);
    if (!merged.success) {
      base.gaps.push(merged.error);
      return base;
    }

    const jdIntelligence = readJdIntelligence(row.jdIntelligence);
    const atsPlatform = detectPlatform(row.canonicalUrl, row.platform);
    const prime = refineryFormToPrimeResume(merged.form, { targetRole: merged.targetTitle });
    const targetTitle =
      jdIntelligence?.extractedJobTitle?.trim() || merged.targetTitle || row.title;
    const jobDescription = row.description;

    const resumeRulesVersion =
      enhanceMeta?.resumeRulesVersion === 2 ? 2 : undefined;

    const preview = buildTailoredResumePreview(
      merged.form,
      merged.targetTitle,
      merged.tailor.changedSections,
      merged.tailor.updatedAt,
      { resumeRulesVersion },
    );

    const pageLengthSource =
      preview.pageLengthPreference ??
      (typeof row.metadata === "object" &&
      row.metadata !== null &&
      !Array.isArray(row.metadata) &&
      typeof (row.metadata as Record<string, unknown>).pageLengthPreference === "string"
        ? ((row.metadata as Record<string, unknown>).pageLengthPreference as string)
        : undefined);

    const useRulesV2 =
      preview.resumeRulesVersion === 2 ||
      isResumeRulesV2Enabled(pageLengthSource, { featureEnabled: false });

    const activePageMode = normalizeResumePageModeV2(pageLengthSource);
    const skillsTextForScoring =
      preview.skillsText?.trim() || (prime.skills ?? []).join(", ");
    const experienceBlob = buildExperienceBlob(prime);

    const readiness = useRulesV2
      ? computeResumeReadinessV2(prime, targetTitle, jobDescription, {
          jdIntelligence,
          platform: atsPlatform,
          skillsText: skillsTextForScoring,
          pageMode: activePageMode,
        })
      : computeResumeReadiness(
          prime,
          targetTitle,
          jobDescription,
          jdIntelligence,
          atsPlatform,
        );

    const gap = resolveKeywordGap(prime, targetTitle, jobDescription, jdIntelligence, {
      experienceBlob,
    });

    const bulletQuality = analyzeBulletQuality(prime);
    const formattingScore = Math.round((readiness.pillars.atsCompliance.score / 25) * 100);
    const sectionsScore = Math.round((readiness.pillars.completeness.score / 25) * 100);
    const experienceScore = Math.round((readiness.pillars.bulletQuality.score / 25) * 100);
    const exactKeywordScore = gap.exactCoveragePercent;
    const fuzzyKeywordScore = gap.coveragePercent;
    const semanticKeywordScore = jobDescription.trim()
      ? computeSemanticSimilarity(
          [targetTitle, prime.summary ?? "", ...(prime.skills ?? [])].join(" "),
          jobDescription,
        )
      : 0;

    const edu = (prime.education ?? []).filter((e) => e.school?.trim());
    let educationScore = 0;
    if (edu.length > 0) {
      educationScore = 40;
      const deg = (edu[0]?.degree ?? "").toLowerCase();
      if (deg) {
        educationScore = 60;
        if (/ph\.?d|doctorate|doctor of/i.test(deg)) educationScore = 100;
        else if (/master|m\.?s\.?|m\.?b\.?a|m\.?eng/i.test(deg)) educationScore = 85;
        else if (/bachelor|b\.?s\.?|b\.?a\.?|b\.?eng|undergrad/i.test(deg)) educationScore = 75;
        else if (/associate|diploma|certificate/i.test(deg)) educationScore = 65;
      }
    }

    const platformScoreResults = computePlatformScores({
      formattingScore,
      exactKeywordScore,
      fuzzyKeywordScore,
      semanticKeywordScore,
      sectionsScore,
      experienceScore,
      educationScore,
      quantificationRate: bulletQuality.quantificationRate,
    });

    const breakdown: Record<string, string> = {};
    for (const [key, pillar] of Object.entries(readiness.pillars)) {
      breakdown[pillarLabel(key)] = `${pillar.score}/${pillar.maxScore}`;
    }

    const platformScores: Record<string, number> = {};
    for (const p of platformScoreResults) {
      platformScores[p.id] = p.score;
    }

    base.readiness = readiness.total;
    base.breakdown = breakdown;
    base.keywordCoverage = `${gap.coveragePercent}%`;
    base.exactKeywordCoverage = `${gap.exactCoveragePercent}%`;
    base.platformScores = platformScores;
    base.systemsPassed = platformScoreResults.filter((p) => p.passes).length;
    base.gaps = readiness.topActions.slice(0, 5).map((a) => a.message);

    return base;
  }

  let scored: JobScore[] = [];

  if (entryIds?.length) {
    const rows = await prisma.jobTrackerEntry.findMany({
      where: { id: { in: entryIds } },
      include: { resumeTailor: true },
    });
    const userId = rows[0]?.userId;
    if (!userId) {
      console.error("No entries found for --ids");
      process.exit(1);
    }
    const byId = new Map(rows.map((r) => [r.id, r]));
    for (const id of entryIds) {
      const row = byId.get(id);
      if (!row) {
        scored.push({
          id,
          company: null,
          title: "",
          platform: null,
          status: "NOT_FOUND",
          savedAt: "",
          readiness: null,
          breakdown: null,
          keywordCoverage: null,
          exactKeywordCoverage: null,
          platformScores: null,
          gaps: ["Entry not found"],
          systemsPassed: null,
          enhanceMeta: null,
        });
        continue;
      }
      scored.push(await scoreEntry(userId, row));
    }
  } else {
    const entries = await prisma.jobTrackerEntry.findMany({
      where: {
        company: { in: [...TEST_COMPANIES] },
        resumeTailor: { isNot: null },
      },
      orderBy: { savedAt: "desc" },
      include: { resumeTailor: true },
    });

    if (entries.length === 0) {
      console.error("No tailored entries found for test companies");
      process.exit(1);
    }

    const byCompany = new Map<string, (typeof entries)[0]>();
    for (const entry of entries) {
      const key = entry.company ?? entry.title;
      if (!byCompany.has(key)) {
        byCompany.set(key, entry);
      }
    }

    const userId = entries[0]!.userId;

    for (const company of TEST_COMPANIES) {
      const row = byCompany.get(company);
      if (!row) {
        scored.push({
          id: "",
          company,
          title: "",
          platform: null,
          status: "NOT_FOUND",
          savedAt: "",
          readiness: null,
          breakdown: null,
          keywordCoverage: null,
          exactKeywordCoverage: null,
          platformScores: null,
          gaps: ["Entry not found"],
          systemsPassed: null,
          enhanceMeta: null,
        });
        continue;
      }
      scored.push(await scoreEntry(userId, row));
    }
  }

  const payload = {
    capturedAt: new Date().toISOString(),
    path: entryIds ? "extension-or-custom-ids" : "dashboard-post-fix",
    method: "batch-ats-readiness.ts (AtsPanel parity)",
    jobs: scored.map((j, i) => ({ index: i + 1, ...j })),
    summary: {
      all90Plus: scored.every((j) => j.readiness !== null && j.readiness >= 90),
      scores: scored.map((j) => ({
        company: j.company,
        readiness: j.readiness,
        keywordCoverage: j.keywordCoverage,
      })),
      duplicateNote: entryIds ? null : "Uses newest savedAt per company when duplicates exist",
    },
  };

  writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${outPath}`);
  console.log(JSON.stringify(payload.summary, null, 2));

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
