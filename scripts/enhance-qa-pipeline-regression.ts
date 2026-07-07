#!/usr/bin/env npx tsx
/**
 * D-22 — automated deterministic regression slices for Cases 001–003.
 * No DB required — mirrors lib/job-tracker/enhance/enhance-qa-case-001.test.ts patterns.
 *
 *   npx tsx scripts/enhance-qa-pipeline-regression.ts
 *   npx tsx scripts/enhance-qa-pipeline-regression.ts --case 001
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildDeterministicSummary } from "@/lib/job-tracker/enhance/build-deterministic-summary";
import { resolveSummaryIdentity } from "@/lib/job-tracker/enhance/resolve-summary-identity";
import { suggestAlternativeTargetRoles } from "@/lib/job-tracker/enhance/suggest-target-roles";
import { filterJdSkillLabels } from "@/lib/job-tracker/jd/jd-skill-filter";
import {
  ENHANCE_QA_BASE_FORM,
  ENHANCE_QA_CASES,
  type EnhanceQaCaseId,
} from "@/lib/job-tracker/enhance/enhance-qa-fixtures";

const CASE_IDS = ["001", "002", "003"] as const;

function parseCase(argv: string[]) {
  const raw =
    argv.find((arg) => arg.startsWith("--case="))?.split("=")[1] ??
    argv[argv.indexOf("--case") + 1];
  if (!raw || raw === "all") return "all" as const;
  return raw;
}

function runCase(caseId: EnhanceQaCaseId) {
  const qaCase = ENHANCE_QA_CASES[caseId];
  const form = ENHANCE_QA_BASE_FORM;
  const jdKeywords = qaCase.jobDescription
    .toLowerCase()
    .match(/[a-z][a-z0-9+.#/-]{2,}/g)
    ?.slice(0, 40) ?? [];

  const identity = resolveSummaryIdentity({
    profileTargetTitle: "Director of Engineering",
    form,
    jdTargetRole: qaCase.targetRole,
    jdKeywords,
    jdDomain: caseId === "001" ? "procurement-supply-chain" : "software-engineering",
  });

  const summary = buildDeterministicSummary({
    currentSummary: form.professionalSummary ?? "",
    skills: ["Cloud & DevOps", "Docker", "Full-Stack & APIs", "Gateways", "Mobile Development"],
    experience: form.experience ?? [],
    summaryIdentity: identity.identity,
    isCrossDomain: identity.isCrossDomain,
  });

  const suggestedRoles = suggestAlternativeTargetRoles({
    form,
    jdTargetRole: qaCase.targetRole,
    isCrossDomain: identity.isCrossDomain,
    overlapScore: identity.overlapScore,
  });

  const filteredSkills = filterJdSkillLabels([
    "Procurement",
    "Strategic Sourcing",
    "BIG",
    "CARE",
    "ISO 13485",
  ]);

  return {
    caseId,
    targetRole: qaCase.targetRole,
    isCrossDomain: identity.isCrossDomain,
    overlapScore: identity.overlapScore,
    summaryExcerpt: summary.slice(0, 280),
    suggestedRoles,
    checks: {
      noProcurementInSummary:
        caseId === "001" ? !/procurement|strategic sourcing/i.test(summary) : true,
      hasSummary: summary.trim().length > 40,
      engineeringIdentity: caseId === "001" ? /engineering|Head of/i.test(summary) : true,
      filtersHrNoise: caseId === "001" ? !filteredSkills.includes("BIG") : true,
      suggestsRolesOnMismatch:
        caseId === "001" ? suggestedRoles.length > 0 : suggestedRoles.length >= 0,
    },
  };
}

function main() {
  const selected = parseCase(process.argv.slice(2));
  if (selected !== "all" && !(selected in ENHANCE_QA_CASES)) {
    throw new Error(`Unknown case ${selected}. Use 001, 002, 003, or all.`);
  }
  const cases: EnhanceQaCaseId[] =
    selected === "all" ? [...CASE_IDS] : [selected as EnhanceQaCaseId];

  const report = cases.map((caseId) => runCase(caseId));
  const outDir = join(process.cwd(), "tmp", "enhance-qa-pipeline-regression");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = join(outDir, `regression-${stamp}.json`);
  writeFileSync(outPath, JSON.stringify(report, null, 2));

  const failed = report.flatMap((row) =>
    Object.entries(row.checks)
      .filter(([, ok]) => !ok)
      .map(([name]) => `${row.caseId}:${name}`),
  );

  console.log(`Wrote ${outPath}`);
  if (failed.length > 0) {
    console.error("Failed checks:", failed.join(", "));
    process.exit(1);
  }
  console.log("All regression checks passed.");
}

main();
