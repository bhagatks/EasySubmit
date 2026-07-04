#!/usr/bin/env npx tsx
/**
 * Pull enhance pipeline telemetry from Postgres (api_call_logs + job enhanceMeta).
 * Usage:
 *   npx tsx scripts/enhance-trace-report.ts
 *   npx tsx scripts/enhance-trace-report.ts --email you@example.com
 *   npx tsx scripts/enhance-trace-report.ts --trace 0221ede8
 *   npx tsx scripts/enhance-trace-report.ts --job cmqx8kz8q0000hqxntsnm84c6
 */
import dotenv from "dotenv";
import { resolveEnhanceTraceOutcome } from "../lib/ai/enhance-trace-outcome";
import {
  formatDurationMinSec,
  formatStepDurationLabel,
  pipelineStepLabelForApiOperation,
} from "../src/shared/extension/pipeline-debug-duration";
import { parsePipelineDebugProgress } from "../src/shared/extension/pipeline-debug-types";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

type Args = { email: string; trace?: string; jobId?: string; limit: number };

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  let email = "bhagathsiddi@gmail.com";
  let trace: string | undefined;
  let jobId: string | undefined;
  let limit = 20;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--email" && argv[i + 1]) email = argv[++i]!;
    else if (a === "--trace" && argv[i + 1]) trace = argv[++i]!;
    else if (a === "--job" && argv[i + 1]) jobId = argv[++i]!;
    else if (a === "--limit" && argv[i + 1]) limit = parseInt(argv[++i]!, 10);
  }

  return { email, trace, jobId, limit };
}

async function main() {
  const args = parseArgs();
  const { prisma } = await import("../lib/prisma");
  const { getAiHealthCheckForUser } = await import("../lib/ai/ai-health-status");
  const { resolveEffectiveAiSource } = await import("../src/lib/ai/engine/router");
  const { getFeatureFlags, isSystemAiEnabled } = await import(
    "../src/lib/services/feature-flags-service"
  );

  const user = await prisma.user.findFirst({
    where: { email: args.email },
    select: {
      id: true,
      email: true,
      aiSourcePreference: true,
      vaultKeyId: true,
      activeProvider: true,
      aiEnhancementsToday: true,
      aiCallsToday: true,
    },
  });

  if (!user) {
    console.log(`User not found: ${args.email}`);
    return;
  }

  const featureFlags = await getFeatureFlags();
  const routeMode = resolveEffectiveAiSource(
    (user.aiSourcePreference ?? "auto") as "auto" | "system" | "customer" | "disabled",
    Boolean(user.vaultKeyId),
    isSystemAiEnabled(featureFlags),
  );

  const health = await getAiHealthCheckForUser(user.id);

  console.log("\n=== ACCOUNT ===");
  console.log({
    email: user.email,
    aiSourcePreference: user.aiSourcePreference,
    hasVaultKey: Boolean(user.vaultKeyId),
    activeProvider: user.activeProvider,
    effectiveRoute: routeMode,
    aiEnhancementsToday: user.aiEnhancementsToday,
    aiCallsToday: user.aiCallsToday,
    healthOk: health.status.ok,
    healthCode: health.status.ok ? null : health.status.code,
  });

  if (args.trace) {
    await printTrace(prisma, user.id, args.trace);
  } else if (args.jobId) {
    await printJob(prisma, user.id, args.jobId);
  }

  const enhanceLogs = await prisma.apiCallLog.findMany({
    where: {
      userId: user.id,
      operation: { startsWith: "ai.enhance" },
    },
    orderBy: { createdAt: "desc" },
    take: args.limit,
    select: {
      createdAt: true,
      traceId: true,
      operation: true,
      status: true,
      aiMode: true,
      keySlot: true,
      errorCode: true,
      errorMessage: true,
      tokensUsed: true,
      durationMs: true,
      modelId: true,
    },
  });

  const traceIds = [...new Set(enhanceLogs.map((r) => r.traceId).filter(Boolean))] as string[];
  const jobsByTrace = new Map<string, Record<string, unknown>>();
  if (traceIds.length > 0) {
    const linked = await prisma.jobResumeTailor.findMany({
      where: { userId: user.id, enhanceTraceId: { in: traceIds } },
      select: { enhanceTraceId: true, enhanceMeta: true },
    });
    for (const row of linked) {
      if (row.enhanceTraceId) {
        jobsByTrace.set(row.enhanceTraceId, (row.enhanceMeta ?? {}) as Record<string, unknown>);
      }
    }
  }

  console.log(`\n=== RECENT ENHANCE API CALLS (last ${args.limit}) ===`);
  if (enhanceLogs.length === 0) {
    console.log("(none — AI may have been off or call failed before logging)");
  } else {
    const traces = new Map<string, typeof enhanceLogs>();
    for (const row of enhanceLogs) {
      const tid = row.traceId ?? "no-trace";
      if (!traces.has(tid)) traces.set(tid, []);
      traces.get(tid)!.push(row);
    }

    for (const [tid, rows] of traces) {
      const mode = rows[0]?.aiMode ?? "—";
      const at = rows[0]?.createdAt.toISOString();
      const err = rows.find((r) => r.errorCode)?.errorCode ?? "—";
      const jobMeta = jobsByTrace.get(tid);
      console.log({
        trace: tid,
        at,
        aiMode: mode,
        passes: rows.length,
        outcome: resolveEnhanceTraceOutcome(rows, {
          aiSucceeded: jobMeta?.aiSucceeded === true,
          aiAttempted: jobMeta?.aiAttempted === true,
        }),
        errorCode: err,
        totalTokens: rows.reduce((s, r) => s + (r.tokensUsed ?? 0), 0),
      });
    }
  }

  const jobs = await prisma.jobTrackerEntry.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 8,
    select: {
      id: true,
      title: true,
      company: true,
      status: true,
      updatedAt: true,
      resumeTailor: {
        select: {
          enhanceTraceId: true,
          enhanceMeta: true,
          updatedAt: true,
        },
      },
    },
  });

  console.log("\n=== RECENT JOBS (enhance session meta) ===");
  for (const j of jobs) {
    const meta = (j.resumeTailor?.enhanceMeta ?? {}) as Record<string, unknown>;
    console.log({
      jobId: j.id,
      title: j.title,
      company: j.company,
      status: j.status,
      updated: j.updatedAt.toISOString(),
      trace: j.resumeTailor?.enhanceTraceId ?? "—",
      engineMode: meta.engineMode ?? "—",
      aiAttempted: meta.aiAttempted ?? false,
      aiSucceeded: meta.aiSucceeded ?? false,
      aiBlockCode: meta.aiBlockCode ?? "—",
      warning:
        typeof meta.warning === "string"
          ? meta.warning.slice(0, 100) + (meta.warning.length > 100 ? "…" : "")
          : "—",
    });
  }

  const lastTrace = enhanceLogs[0]?.traceId;
  if (lastTrace && !args.trace) {
    console.log(`\n=== DETAIL: latest trace ${lastTrace} ===`);
    await printTrace(prisma, user.id, lastTrace);
  }

  await prisma.$disconnect();
}

async function printTrace(
  prisma: Awaited<typeof import("../lib/prisma")>["prisma"],
  userId: string,
  traceId: string,
) {
  const rows = await prisma.apiCallLog.findMany({
    where: { userId, traceId },
    orderBy: { createdAt: "asc" },
    select: {
      createdAt: true,
      operation: true,
      status: true,
      aiMode: true,
      keySlot: true,
      keySource: true,
      errorCode: true,
      errorMessage: true,
      durationMs: true,
      tokensUsed: true,
      modelId: true,
      metadata: true,
    },
  });

  console.log(`\n=== TRACE ${traceId} (${rows.length} log rows) ===`);
  if (rows.length === 0) {
    console.log("No api_call_logs for this trace (baseline-only run or logs not persisted).");
    return;
  }

  console.table(
    rows.map((r) => ({
      at: r.createdAt.toISOString(),
      step: pipelineStepLabelForApiOperation(r.operation),
      op: r.operation,
      status: r.status,
      model: r.modelId ?? "—",
      aiMode: r.aiMode,
      slot: r.keySlot,
      source: r.keySource,
      err: r.errorCode ?? "—",
      duration: r.durationMs != null ? formatDurationMinSec(r.durationMs) : "—",
      tokens: r.tokensUsed,
    })),
  );

  const job = await prisma.jobResumeTailor.findFirst({
    where: { userId, enhanceTraceId: traceId },
    select: {
      jobTrackerEntry: { select: { id: true, title: true, company: true } },
      enhanceMeta: true,
    },
  });

  if (job) {
    console.log("Linked job:", {
      jobId: job.jobTrackerEntry.id,
      title: job.jobTrackerEntry.title,
      company: job.jobTrackerEntry.company,
      meta: job.enhanceMeta,
    });
  }
}

async function printJob(
  prisma: Awaited<typeof import("../lib/prisma")>["prisma"],
  userId: string,
  jobId: string,
) {
  const job = await prisma.jobTrackerEntry.findFirst({
    where: { id: jobId, userId },
    select: {
      id: true,
      title: true,
      company: true,
      status: true,
      metadata: true,
      resumeTailor: {
        select: { enhanceTraceId: true, enhanceMeta: true, changedSections: true },
      },
    },
  });

  if (!job) {
    console.log(`Job not found: ${jobId}`);
    return;
  }

  console.log("\n=== JOB ===");
  console.log({
    jobId: job.id,
    title: job.title,
    company: job.company,
    status: job.status,
    trace: job.resumeTailor?.enhanceTraceId,
    changedSections: job.resumeTailor?.changedSections,
    enhanceMeta: job.resumeTailor?.enhanceMeta,
  });

  const pipelineDebug = parsePipelineDebugProgress(
    job.metadata &&
      typeof job.metadata === "object" &&
      !Array.isArray(job.metadata)
      ? (job.metadata as Record<string, unknown>).pipelineDebug
      : null,
  );
  if (pipelineDebug) {
    console.log(`\n=== PIPELINE STEPS (trace ${pipelineDebug.traceId}) ===`);
    console.table(
      pipelineDebug.steps.map((step) => ({
        step: step.id,
        label: step.label,
        status: step.status,
        duration: formatStepDurationLabel(step) ?? "—",
      })),
    );
  }

  if (job.resumeTailor?.enhanceTraceId) {
    await printTrace(prisma, userId, job.resumeTailor.enhanceTraceId);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
