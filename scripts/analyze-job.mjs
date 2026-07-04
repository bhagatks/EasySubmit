#!/usr/bin/env node

/**
 * Analyze the latest job in the database.
 * Usage: node scripts/analyze-job.mjs [userId]
 * If no userId provided, uses ANALYZE_USER_ID env var (defaults to test user)
 */

import pkg from "@prisma/client";
const { PrismaClient } = pkg;
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dir, "..");

// Simple readiness scorer (mimics the TS version)
function scoreReadiness(resume, jdIntel) {
  let score = 0;

  // Completeness (25pts)
  let completePts = 25;
  if (!resume.fullName?.trim()) completePts -= 5;
  if (!resume.email?.trim()) completePts -= 4;
  if (!resume.phone?.trim()) completePts -= 3;
  const summaryOk = resume.summary?.trim()?.length > 20;
  if (!summaryOk) completePts -= 5;
  score += completePts;

  // Keyword match (25pts) — rough estimate
  const keywords = jdIntel?.skills || [];
  const resumeText = JSON.stringify(resume).toLowerCase();
  const matchedCount = keywords.filter((k) =>
    resumeText.includes(k.toLowerCase())
  ).length;
  const keywordScore = Math.min(25, (matchedCount / Math.max(1, keywords.length)) * 25);
  score += keywordScore;

  // Bullet quality (25pts) — count action verbs
  const actionVerbs =
    /\b(achieved|implemented|developed|designed|led|managed|optimized|increased|reduced|improved|built|created|launched|transformed|streamlined)\b/gi;
  const bulletCount =
    (JSON.stringify(resume.experience || []).match(actionVerbs) || []).length;
  const bulletScore = Math.min(25, (bulletCount / 5) * 25);
  score += bulletScore;

  // ATS compliance (25pts) — assume good if basic structure present
  const hasExperience = resume.experience?.length > 0;
  const hasEducation = resume.education?.length > 0;
  const hasSkills = resume.skills?.length > 0;
  const atsScore = (hasExperience ? 8 : 0) + (hasEducation ? 8 : 0) + (hasSkills ? 9 : 0);
  score += atsScore;

  return Math.round(score);
}

const prisma = new PrismaClient();

async function main() {
  const userId =
    process.argv[2] || process.env.ANALYZE_USER_ID || "test-user-123";

  console.log(`\n📊 Analyzing latest job for user: ${userId}\n`);

  const latestJob = await prisma.jobTrackerEntry.findFirst({
    where: { userId },
    orderBy: { savedAt: "desc" },
    include: {
      resumeTailor: {
        include: {
          sourceProfile: true,
        },
      },
    },
  });

  if (!latestJob) {
    console.log("❌ No jobs found for this user.\n");
    process.exit(1);
  }

  const tailor = latestJob.resumeTailor;
  const enhanceMeta = tailor?.enhanceMeta || {};
  const jdIntel = latestJob.jdIntelligence || {};

  console.log(`Job Title: ${latestJob.title}`);
  if (latestJob.company) console.log(`Company: ${latestJob.company}`);
  if (latestJob.platform) console.log(`Platform: ${latestJob.platform}`);
  console.log(`Status: ${latestJob.status}`);
  console.log(`Tailored: ${tailor ? "✓ Yes" : "✗ No"}\n`);

  if (!tailor) {
    console.log("⚠️  No tailored resume for this job yet.\n");
    process.exit(0);
  }

  // Extract metrics
  const readinessDelta = enhanceMeta.readinessDelta ?? null;
  const coverageAfter = enhanceMeta.coverageAfter ?? null;
  const enhanceSummary = enhanceMeta.enhanceSummary ?? null;

  // Compute scores
  const resumeData = tailor.overrides;
  const afterScore = scoreReadiness(resumeData, jdIntel);
  const beforeScore = readinessDelta !== null ? afterScore - readinessDelta : null;

  console.log(`📈 Readiness Score: ${afterScore}/100`);
  if (beforeScore !== null) {
    const delta = readinessDelta || 0;
    const indicator = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";
    console.log(`   Before: ${beforeScore} → After: ${afterScore} ${indicator} (${delta > 0 ? "+" : ""}${delta})`);
  }
  console.log("");

  if (coverageAfter !== null) {
    const indicator = coverageAfter === 100 ? "✓" : "⚠";
    console.log(`${indicator} Keyword Coverage: ${coverageAfter}%\n`);
  }

  if (enhanceSummary) {
    console.log(`✨ Enhancement Summary:`);
    console.log(`   ${enhanceSummary}\n`);
  }

  if (coverageAfter !== null && coverageAfter < 100) {
    console.log(`🔧 Remaining Work:`);
    console.log(`   • Add ${100 - coverageAfter}% more keyword coverage`);
    console.log(`   • Review JD and add role-specific skills\n`);
  }

  console.log("✅ Analysis complete.\n");
}

main()
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
