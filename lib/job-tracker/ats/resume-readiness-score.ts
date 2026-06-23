/**
 * Resume Readiness Score — composite 0–100 score with a breakdown.
 *
 * Four equal pillars (25pts each):
 *   1. Completeness  — all key sections present and filled
 *   2. Keyword match — resume covers the JD's repeated keywords
 *   3. Bullet quality — action verbs + quantification
 *   4. ATS compliance — no parse warnings detected
 *
 * This is a real, auditable breakdown — not a fake "ATS score" badge.
 */

import type { PrimeResumeData } from "@/components/onboarding/PrimeResume";
import { simulateAtsParse } from "@/lib/job-tracker/ats/ats-parse-simulator";
import { analyzeKeywordGap, analyzeKeywordGapFromIntelligence } from "@/lib/job-tracker/ats/keyword-gap";
import { analyzeBulletQuality } from "@/lib/job-tracker/ats/bullet-quality";
import type { JDIntelligence } from "@/lib/job-tracker/jd/jd-intelligence";

export type ReadinessPillar = {
  label: string;
  score: number;   // 0–25
  maxScore: 25;
  details: string[]; // what contributed or was missing
};

export type ResumeReadinessResult = {
  total: number;       // 0–100
  grade: "A" | "B" | "C" | "D" | "F";
  pillars: {
    completeness: ReadinessPillar;
    keywords: ReadinessPillar;
    bulletQuality: ReadinessPillar;
    atsCompliance: ReadinessPillar;
  };
  topActions: string[]; // ordered action items to improve score
};

// ─── Pillar: Completeness ─────────────────────────────────────────────────────

function scoreCompleteness(data: PrimeResumeData, targetTitle: string): ReadinessPillar {
  const details: string[] = [];
  let pts = 25;

  const check = (condition: boolean, deduct: number, message: string) => {
    if (!condition) { pts -= deduct; details.push(message); }
  };

  check(Boolean(data.fullName?.trim()), 5, "Add your full name.");
  check(Boolean(data.email?.trim()), 4, "Add your email address.");
  check(Boolean(data.phone?.trim()), 3, "Add your phone number.");
  check(Boolean(targetTitle?.trim() || data.summary?.trim()), 4, "Add a Professional Summary.");
  check((data.skills?.length ?? 0) >= 4, 4, "Add at least 4 skills — Skills section is heavily weighted.");
  check(
    (data.experience?.filter((e) => e.title?.trim())?.length ?? 0) >= 1,
    5,
    "Add at least one work experience entry.",
  );

  const hasBullets = (data.experience ?? []).some(
    (e) => (e.bullets ?? []).filter((b) => b.trim()).length >= 2,
  );
  check(hasBullets, 3, "Add bullet points to your experience entries (aim for 3–5 per role).");
  check(
    (data.education?.filter((e) => e.school?.trim())?.length ?? 0) >= 1,
    2,
    "Add your education.",
  );

  return {
    label: "Completeness",
    score: Math.max(0, pts) as 25,
    maxScore: 25,
    details,
  };
}

// ─── Pillar: Keyword match ─────────────────────────────────────────────────────

function scoreKeywords(
  data: PrimeResumeData,
  targetTitle: string,
  jobDescription: string,
  jdIntelligence?: JDIntelligence | null,
): ReadinessPillar {
  if (!jobDescription.trim()) {
    return {
      label: "Keyword Match",
      score: 0 as 25,
      maxScore: 25,
      details: ["No job description captured — save this job from a posting page to get keyword analysis."],
    };
  }

  const gap = jdIntelligence
    ? analyzeKeywordGapFromIntelligence(data, jdIntelligence, targetTitle)
    : analyzeKeywordGap(data, targetTitle, jobDescription);
  const pts = Math.round((gap.coveragePercent / 100) * 25);
  const details: string[] = [];

  if (gap.topMissing.length > 0) {
    details.push(
      `Missing keywords from the job description: ${gap.topMissing.slice(0, 5).join(", ")}.`,
    );
  }
  if (gap.coveragePercent >= 80) {
    details.push(`Strong keyword coverage: ${gap.coveragePercent}%.`);
  } else if (gap.coveragePercent >= 50) {
    details.push(`Moderate keyword coverage: ${gap.coveragePercent}%. Add the missing skills to your Skills section.`);
  } else {
    details.push(`Low keyword coverage: ${gap.coveragePercent}%. Tailor your resume closely to this job description.`);
  }

  return { label: "Keyword Match", score: pts as 25, maxScore: 25, details };
}

// ─── Pillar: Bullet quality ───────────────────────────────────────────────────

function scoreBulletQuality(data: PrimeResumeData): ReadinessPillar {
  const quality = analyzeBulletQuality(data);
  const details: string[] = [];

  if (quality.totalBullets === 0) {
    return {
      label: "Bullet Quality",
      score: 0 as 25,
      maxScore: 25,
      details: ["No bullet points found. Add achievement-oriented bullets to each experience."],
    };
  }

  // Action verbs carry more ATS signal than quantification alone —
  // real resumes average 20–40% metric bullets so pure 50/50 is too punishing.
  const pts = Math.round(
    (quality.actionVerbRate / 100) * 17.5 + (quality.quantificationRate / 100) * 7.5,
  );

  if (quality.actionVerbRate < 70) {
    details.push(`${100 - quality.actionVerbRate}% of bullets don't start with an action verb.`);
  } else {
    details.push(`${quality.actionVerbRate}% of bullets use strong action verbs. ✓`);
  }

  if (quality.quantificationRate < 50) {
    details.push(`Only ${quality.quantificationRate}% of bullets include a measurable result — aim for 70%+.`);
  } else {
    details.push(`${quality.quantificationRate}% of bullets are quantified. ✓`);
  }

  return { label: "Bullet Quality", score: Math.round(pts) as 25, maxScore: 25, details };
}

// ─── Pillar: ATS compliance ───────────────────────────────────────────────────

function scoreAtsCompliance(data: PrimeResumeData, targetTitle: string): ReadinessPillar {
  const parsed = simulateAtsParse(data, targetTitle);
  const warnings = parsed.warnings;
  const pts = Math.max(0, 25 - warnings.length * 3);

  return {
    label: "ATS Compliance",
    score: pts as 25,
    maxScore: 25,
    details: warnings.length === 0
      ? ["No parser warnings detected. ✓"]
      : warnings,
  };
}

// ─── Grade ────────────────────────────────────────────────────────────────────

function toGrade(total: number): ResumeReadinessResult["grade"] {
  if (total >= 90) return "A";
  if (total >= 75) return "B";
  if (total >= 60) return "C";
  if (total >= 45) return "D";
  return "F";
}

// ─── Top action items ─────────────────────────────────────────────────────────

function deriveTopActions(pillars: ResumeReadinessResult["pillars"]): string[] {
  const actions: Array<{ message: string; deficit: number }> = [];

  for (const pillar of Object.values(pillars)) {
    const deficit = pillar.maxScore - pillar.score;
    if (deficit > 0) {
      for (const detail of pillar.details) {
        // Only include problem messages (not "✓" confirmations)
        if (!detail.includes("✓")) {
          actions.push({ message: detail, deficit });
        }
      }
    }
  }

  // Sort by highest deficit first — biggest wins come first
  return actions
    .sort((a, b) => b.deficit - a.deficit)
    .slice(0, 5)
    .map((a) => a.message);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function computeResumeReadiness(
  data: PrimeResumeData,
  targetTitle: string,
  jobDescription: string,
  jdIntelligence?: JDIntelligence | null,
): ResumeReadinessResult {
  const pillars = {
    completeness: scoreCompleteness(data, targetTitle),
    keywords: scoreKeywords(data, targetTitle, jobDescription, jdIntelligence),
    bulletQuality: scoreBulletQuality(data),
    atsCompliance: scoreAtsCompliance(data, targetTitle),
  };

  const total = Object.values(pillars).reduce((sum, p) => sum + p.score, 0);

  return {
    total,
    grade: toGrade(total),
    pillars,
    topActions: deriveTopActions(pillars),
  };
}
