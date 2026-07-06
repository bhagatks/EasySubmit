#!/usr/bin/env npx tsx
/** Compare tailored resume output for two job entries. */
import { getMergedResumeForJob } from "../lib/profile/job-resume-tailor";
import type { HubRefineryForm } from "../lib/onboarding/hubResume";

const USER_ID = process.argv[2];
const JOB_IDS = process.argv.slice(3);

if (!USER_ID || JOB_IDS.length < 2) {
  console.error("Usage: npx tsx scripts/compare-job-resumes.ts <userId> <jobId1> <jobId2>");
  process.exit(1);
}

function bulletsFromExperience(form: HubRefineryForm): string[] {
  const out: string[] = [];
  for (const exp of form.experience ?? []) {
    const company = exp.company?.trim() ?? "Company";
    const title = exp.title?.trim() ?? "Role";
    for (const b of exp.bullets ?? []) {
      const text = typeof b === "string" ? b : String(b ?? "");
      if (text.trim()) out.push(`[${company} / ${title}] ${text.trim()}`);
    }
  }
  return out;
}

function keywordHits(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase();
  return keywords.filter((k) => lower.includes(k.toLowerCase()));
}

const FIDELITY_KEYWORDS = [
  "mobile",
  "swift",
  "kotlin",
  "angular",
  "typescript",
  "aws",
  "architecture",
  "ionic",
  "capacitor",
  "api",
  "android",
  "ios",
  "github",
  "digital transformation",
];

type Snapshot = {
  jobId: string;
  title: string;
  status: string;
  engineMode: string;
  aiSucceeded: boolean;
  targetTitle: string;
  summary: string;
  skills: string;
  bulletCount: number;
  bullets: string[];
  keywordHits: string[];
  enhanceSummary: string | null;
  changedSections: string[];
};

async function main() {
  const { prisma } = await import("../lib/prisma");
  const snapshots: Snapshot[] = [];

  for (const jobId of JOB_IDS) {
    const entry = await prisma.jobTrackerEntry.findUnique({
      where: { id: jobId },
      select: { id: true, title: true, status: true },
    });
    const merged = await getMergedResumeForJob(USER_ID, jobId);
    if (!entry || !merged.success) {
      console.log(`Skip ${jobId}: ${merged.success ? "no entry" : merged.error}`);
      continue;
    }

    const meta = (merged.tailor.enhanceMeta ?? {}) as Record<string, unknown>;
    const summary = merged.form.professionalSummary?.trim() ?? "";
    const skills = merged.form.skillsText?.trim() ?? "";
    const bullets = bulletsFromExperience(merged.form);
    const allText = [summary, skills, ...bullets].join("\n");

    snapshots.push({
      jobId,
      title: entry.title ?? "",
      status: entry.status,
      engineMode: String(meta.engineMode ?? "—"),
      aiSucceeded: meta.aiSucceeded === true,
      targetTitle: merged.targetTitle,
      summary,
      skills,
      bulletCount: bullets.length,
      bullets,
      keywordHits: keywordHits(allText, FIDELITY_KEYWORDS),
      enhanceSummary: typeof meta.enhanceSummary === "string" ? meta.enhanceSummary : null,
      changedSections: merged.tailor.changedSections,
    });
  }

  const labels = ["A (archived, BYOK AI)", "B (active, system fallback)"];
  for (let i = 0; i < snapshots.length; i++) {
    const s = snapshots[i]!;
    console.log(`\n${"=".repeat(72)}`);
    console.log(`${labels[i] ?? `JOB ${i + 1}`} — ${s.jobId}`);
    console.log(`${s.title} | ${s.status} | engine=${s.engineMode} aiOk=${s.aiSucceeded}`);
    console.log(`Changed: ${s.changedSections.join(", ")}`);
    console.log(`Target title: ${s.targetTitle}`);
    if (s.enhanceSummary) console.log(`Enhance summary: ${s.enhanceSummary}`);
    console.log(`JD keyword hits (${s.keywordHits.length}): ${s.keywordHits.join(", ") || "—"}`);
    console.log(`\n--- SUMMARY (${s.summary.length} chars) ---\n${s.summary}\n`);
    console.log(`--- SKILLS (${s.skills.length} chars) ---\n${s.skills.slice(0, 1500)}${s.skills.length > 1500 ? "…" : ""}\n`);
    console.log(`--- EXPERIENCE BULLETS (${s.bulletCount}) ---`);
    s.bullets.forEach((b, idx) =>
      console.log(`${idx + 1}. ${b.slice(0, 220)}${b.length > 220 ? "…" : ""}`),
    );
  }

  if (snapshots.length === 2) {
    const [a, b] = snapshots;
    console.log(`\n${"=".repeat(72)}`);
    console.log("HEAD-TO-HEAD");
    console.log({
      sameTargetTitle: a.targetTitle === b.targetTitle,
      summaryIdentical: a.summary === b.summary,
      summaryLenA: a.summary.length,
      summaryLenB: b.summary.length,
      skillsIdentical: a.skills === b.skills,
      skillsLenA: a.skills.length,
      skillsLenB: b.skills.length,
      bulletsA: a.bulletCount,
      bulletsB: b.bulletCount,
      keywordHitsA: a.keywordHits.length,
      keywordHitsB: b.keywordHits.length,
      keywordsOnlyInA: a.keywordHits.filter((k) => !b.keywordHits.includes(k)),
      keywordsOnlyInB: b.keywordHits.filter((k) => !a.keywordHits.includes(k)),
    });
    const aSet = new Set(a.bullets);
    const shared = b.bullets.filter((x) => aSet.has(x)).length;
    console.log(`Identical bullets: ${shared} / A=${a.bulletCount} B=${b.bulletCount}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
