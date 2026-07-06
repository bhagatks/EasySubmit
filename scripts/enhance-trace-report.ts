#!/usr/bin/env npx tsx
/**
 * One-shot job / enhance pipeline investigation (DB + optional PostHog).
 *
 * Local:
 *   npm run enhance:trace -- --job <id>
 *   npm run enhance:trace -- --email you@example.com --job <id1> --job <id2>
 *   npm run enhance:trace -- --user-id <cuid> --trace <prefix>
 *
 * Prod (Vercel env — never .env.local DATABASE_URL):
 *   npm run enhance:trace:prod -- --user-id <cuid> --job <id1> --job <id2>
 *   npm run enhance:trace:prod -- --job <id> --posthog
 */
import dotenv from "dotenv";
import { buildPostHogAdminEnv, shouldSkipLocalEnvFile } from "../lib/env/env-resolution.mjs";
import { loadEnv } from "./env-lib.mjs";
import { resolveEnhanceTraceOutcome } from "../lib/ai/enhance-trace-outcome";
import type { AiCallLedgerEntry } from "../lib/ai/call-kernel/types";
import {
  formatDurationMinSec,
  formatStepDurationLabel,
  pipelineStepLabelForApiOperation,
} from "../src/shared/extension/pipeline-debug-duration";
import { parsePipelineDebugProgress } from "../src/shared/extension/pipeline-debug-types";

if (!shouldSkipLocalEnvFile(process.env)) {
  dotenv.config({ path: ".env" });
  dotenv.config({ path: ".env.local" });
}

type Args = {
  email?: string;
  userId?: string;
  trace?: string;
  jobIds: string[];
  limit: number;
  posthog: boolean;
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  let email: string | undefined;
  let userId: string | undefined;
  let trace: string | undefined;
  const jobIds: string[] = [];
  let limit = 20;
  let posthog = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--email" && argv[i + 1]) email = argv[++i]!.trim();
    else if (a === "--user-id" && argv[i + 1]) userId = argv[++i]!.trim();
    else if (a === "--trace" && argv[i + 1]) trace = argv[++i]!.trim();
    else if (a === "--job" && argv[i + 1]) jobIds.push(argv[++i]!.trim());
    else if (a === "--limit" && argv[i + 1]) limit = parseInt(argv[++i]!, 10);
    else if (a === "--posthog") posthog = true;
    else if (!a.startsWith("-") && a.length >= 20) jobIds.push(a.trim());
  }

  return { email, userId, trace, jobIds, limit, posthog };
}

function readMetaField(meta: Record<string, unknown> | null, key: string): unknown {
  return meta?.[key] ?? null;
}

function readAiCallLedger(meta: Record<string, unknown> | null | undefined): AiCallLedgerEntry[] | null {
  const raw = meta?.aiCallLedger;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  return raw as AiCallLedgerEntry[];
}

function formatLedgerLine(entry: AiCallLedgerEntry): string {
  const slot = entry.slot != null ? String(entry.slot) : "—";
  const providerModel =
    [entry.provider, entry.modelId].filter((v) => typeof v === "string" && v.length > 0).join("/") ||
    "—";
  return `#${entry.attempt} ${entry.executor} slot=${slot} ${providerModel} ${entry.classification} → ${entry.decision} ${entry.durationMs}ms`;
}

function printAiCallLedger(ledger: AiCallLedgerEntry[] | null): void {
  if (!ledger?.length) return;
  for (const entry of ledger) {
    console.log(formatLedgerLine(entry));
  }
}

function vocabSkillCount(vocab: unknown): number | null {
  if (!vocab || typeof vocab !== "object") return null;
  const skills = (vocab as { skills?: unknown[] }).skills;
  return Array.isArray(skills) ? skills.length : null;
}

async function hogql(projectId: string, apiKey: string, host: string, query: string) {
  const apiHost = host.replace("us.i.posthog.com", "us.posthog.com");
  const res = await fetch(`${apiHost}/api/projects/${projectId}/query/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PostHog HogQL ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { results?: unknown[][]; columns?: string[] };
  return json;
}

async function printPostHogForTraces(
  userId: string,
  traceIds: string[],
  windowStart: Date,
  windowEnd: Date,
): Promise<void> {
  const { vars } = loadEnv(".env.local");
  const ph = buildPostHogAdminEnv(process.env, vars);
  const apiKey = ph.POSTHOG_PERSONAL_API_KEY;
  const host = ph.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
  const projectId = ph.POSTHOG_PROD_PROJECT_ID ?? "488042";

  if (!apiKey) {
    console.log("\n=== POSTHOG (skipped — POSTHOG_PERSONAL_API_KEY missing in .env.local) ===");
    return;
  }

  const traceList = traceIds.map((t) => `'${t.replace(/'/g, "")}'`).join(", ");
  const query =
    traceIds.length > 0
      ? `SELECT timestamp, properties.trace_id, properties.operation, properties.ai_mode, properties.provider, properties.model_id, properties.status, properties.error_code, properties.tokens_used, properties.key_slot
FROM events
WHERE event = 'api_call_logged'
  AND properties.trace_id IN (${traceList})
ORDER BY timestamp ASC
LIMIT 50`
      : `SELECT timestamp, properties.trace_id, properties.operation, properties.ai_mode, properties.provider, properties.model_id, properties.status, properties.error_code, properties.tokens_used
FROM events
WHERE event = 'api_call_logged'
  AND distinct_id = '${userId.replace(/'/g, "")}'
  AND timestamp >= toDateTime('${windowStart.toISOString().slice(0, 19)}')
  AND timestamp <= toDateTime('${windowEnd.toISOString().slice(0, 19)}')
ORDER BY timestamp ASC
LIMIT 40`;

  console.log(`\n=== POSTHOG prod (${projectId}) api_call_logged ===`);
  try {
    const { results, columns } = await hogql(projectId, apiKey, host, query);
    if (!results?.length) {
      console.log("(no events — check project id / time window / trace_id)");
      return;
    }
    const cols = columns ?? [];
    console.table(
      results.map((row) => {
        const obj: Record<string, unknown> = {};
        cols.forEach((col, i) => {
          obj[col] = row[i];
        });
        return obj;
      }),
    );
  } catch (err) {
    console.log(err instanceof Error ? err.message : String(err));
  }
}

async function resolveUser(
  prisma: Awaited<typeof import("../lib/prisma")>["prisma"],
  args: Args,
) {
  if (args.userId) {
    return prisma.user.findUnique({
      where: { id: args.userId },
      select: userSelect,
    });
  }
  if (args.email) {
    return prisma.user.findFirst({
      where: { email: args.email },
      select: userSelect,
    });
  }
  if (args.jobIds.length > 0) {
    const job = await prisma.jobTrackerEntry.findUnique({
      where: { id: args.jobIds[0] },
      select: { userId: true },
    });
    if (job?.userId) {
      return prisma.user.findUnique({
        where: { id: job.userId },
        select: userSelect,
      });
    }
  }
  return null;
}

const userSelect = {
  id: true,
  email: true,
  aiSourcePreference: true,
  vaultKeyId: true,
  activeProvider: true,
  aiEnhancementsToday: true,
  aiCallsToday: true,
  apiKeys: { select: { provider: true, vaultSecretId: true } },
} as const;

async function main() {
  const args = parseArgs();
  const { prisma } = await import("../lib/prisma");
  const { resolveEffectiveAiSource } = await import("../src/lib/ai/engine/router");
  const { getFeatureFlags, isSystemAiEnabled } = await import(
    "../src/lib/services/feature-flags-service"
  );

  const dbUrl = process.env.DATABASE_URL ?? "";
  const dbRef = dbUrl.includes("yofgnflcqajqsepbfdkc")
    ? "prod"
    : dbUrl.includes("dwccqrbpwbnuoiihpgth")
      ? "dev"
      : "unknown";
  console.log(`\n=== DB target: ${dbRef} ===`);

  const user = await resolveUser(prisma, args);
  if (!user) {
    console.log("User not found — pass --email, --user-id, or --job <id>");
    process.exit(1);
  }

  const featureFlags = await getFeatureFlags();
  const routeMode = resolveEffectiveAiSource(
    (user.aiSourcePreference ?? "auto") as "auto" | "system" | "customer" | "disabled",
    Boolean(user.vaultKeyId),
    isSystemAiEnabled(featureFlags),
  );

  console.log("\n=== ACCOUNT ===");
  console.log({
    userId: user.id,
    email: user.email,
    aiSourcePreference: user.aiSourcePreference,
    vaultKeyId: user.vaultKeyId,
    activeProvider: user.activeProvider,
    apiKeyProviders: user.apiKeys.map((k) => k.provider),
    effectiveRoute: routeMode,
    aiEnhancementsToday: user.aiEnhancementsToday,
    aiCallsToday: user.aiCallsToday,
  });

  const traceIdsForPosthog: string[] = [];
  let posthogWindowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
  let posthogWindowEnd = new Date();

  if (args.jobIds.length > 0) {
    console.log(`\n=== JOBS (${args.jobIds.length}) ===`);
    for (const jobId of args.jobIds) {
      await printJob(prisma, user.id, jobId, traceIdsForPosthog);
    }
    if (args.jobIds.length > 1) {
      await printJobComparison(prisma, args.jobIds);
    }
  }

  if (args.trace) {
    await printTrace(prisma, user.id, args.trace);
    traceIdsForPosthog.push(args.trace);
  } else if (args.jobIds.length === 1 && traceIdsForPosthog[0]) {
    /* printJob already printed trace detail */
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

  if (enhanceLogs[0]?.createdAt) {
    posthogWindowStart = new Date(enhanceLogs[enhanceLogs.length - 1]!.createdAt.getTime() - 60_000);
    posthogWindowEnd = new Date(enhanceLogs[0].createdAt.getTime() + 60_000);
  }

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
    console.log("(none)");
  } else {
    const traces = new Map<string, typeof enhanceLogs>();
    for (const row of enhanceLogs) {
      const tid = row.traceId ?? "no-trace";
      if (!traces.has(tid)) traces.set(tid, []);
      traces.get(tid)!.push(row);
    }

    for (const [tid, rows] of traces) {
      const jobMeta = jobsByTrace.get(tid);
      const ledger = readAiCallLedger(jobMeta);
      if (ledger) {
        console.log(`\n--- trace ${tid} ledger (${ledger.length} attempts) ---`);
        printAiCallLedger(ledger);
      }
      console.log({
        trace: tid,
        at: rows[0]?.createdAt.toISOString(),
        aiMode: rows[0]?.aiMode ?? "—",
        passes: rows.length,
        outcome: resolveEnhanceTraceOutcome(rows, {
          aiSucceeded: jobMeta?.aiSucceeded === true,
          aiAttempted: jobMeta?.aiAttempted === true,
        }),
        errorCode: rows.find((r) => r.errorCode)?.errorCode ?? "—",
        totalTokens: rows.reduce((s, r) => s + (r.tokensUsed ?? 0), 0),
      });
    }
  }

  if (args.posthog) {
    const ids = [...new Set(traceIdsForPosthog.filter(Boolean))];
    await printPostHogForTraces(user.id, ids, posthogWindowStart, posthogWindowEnd);
  } else {
    console.log("\nTip: add --posthog to mirror api_call_logged from PostHog prod (needs phx_ in .env.local)");
  }

  await prisma.$disconnect();
}

async function printJobComparison(
  prisma: Awaited<typeof import("../lib/prisma")>["prisma"],
  jobIds: string[],
) {
  const rows = await prisma.jobTrackerEntry.findMany({
    where: { id: { in: jobIds } },
    select: {
      id: true,
      status: true,
      archivedAt: true,
      savedAt: true,
      metadata: true,
      jdSkillsVocabulary: true,
      resumeTailor: {
        select: { enhanceTraceId: true, enhanceMeta: true },
      },
    },
    orderBy: { savedAt: "asc" },
  });

  console.log("\n=== JOB COMPARISON ===");
  console.table(
    rows.map((j) => {
      const meta =
        j.metadata && typeof j.metadata === "object" && !Array.isArray(j.metadata)
          ? (j.metadata as Record<string, unknown>)
          : null;
      const em = (j.resumeTailor?.enhanceMeta ?? {}) as Record<string, unknown>;
      return {
        jobId: j.id.slice(0, 12) + "…",
        savedAt: j.savedAt.toISOString(),
        status: j.status,
        archived: j.archivedAt ? "yes" : "no",
        pipelineWarning:
          typeof meta?.pipelineAiWarning === "string"
            ? meta.pipelineAiWarning.slice(0, 48) + "…"
            : "—",
        engineMode: em.engineMode ?? "—",
        aiSucceeded: em.aiSucceeded ?? false,
        routeMode: em.routeMode ?? "—",
        trace: j.resumeTailor?.enhanceTraceId?.slice(0, 8) ?? "—",
        vocabSkills: vocabSkillCount(j.jdSkillsVocabulary) ?? "null",
      };
    }),
  );
}

async function printTrace(
  prisma: Awaited<typeof import("../lib/prisma")>["prisma"],
  userId: string,
  traceId: string,
) {
  const job = await prisma.jobResumeTailor.findFirst({
    where: { userId, enhanceTraceId: traceId },
    select: {
      jobTrackerEntry: { select: { id: true, title: true, company: true } },
      enhanceMeta: true,
    },
  });

  const em = (job?.enhanceMeta ?? {}) as Record<string, unknown>;
  const ledger = readAiCallLedger(em);

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
      provider: true,
    },
  });

  console.log(`\n=== TRACE ${traceId} (${rows.length} log rows) ===`);
  if (ledger) {
    console.log(`AI call ledger (${ledger.length} attempts):`);
    printAiCallLedger(ledger);
  }

  if (rows.length === 0) {
    console.log("No api_call_logs for this trace.");
    if (!job) return;
  } else {
  console.table(
    rows.map((r) => ({
      at: r.createdAt.toISOString(),
      step: pipelineStepLabelForApiOperation(r.operation),
      status: r.status,
      provider: r.provider ?? "—",
      model: r.modelId ?? "—",
      aiMode: r.aiMode,
      slot: r.keySlot,
      err: r.errorCode ?? "—",
      msg: r.errorMessage?.slice(0, 60) ?? "—",
      duration: r.durationMs != null ? formatDurationMinSec(r.durationMs) : "—",
      tokens: r.tokensUsed,
    })),
  );
  }

  if (job) {
    console.log("Linked job:", {
      jobId: job.jobTrackerEntry.id,
      title: job.jobTrackerEntry.title,
      engineMode: em.engineMode,
      aiAttempted: em.aiAttempted,
      aiSucceeded: em.aiSucceeded,
      aiBlockCode: em.aiBlockCode,
      routeMode: em.routeMode,
      modelId: em.modelId,
      warning: typeof em.warning === "string" ? em.warning.slice(0, 120) : null,
    });
  }
}

async function printJob(
  prisma: Awaited<typeof import("../lib/prisma")>["prisma"],
  userId: string,
  jobId: string,
  traceIdsOut: string[],
) {
  const job = await prisma.jobTrackerEntry.findFirst({
    where: { id: jobId },
    select: {
      id: true,
      userId: true,
      title: true,
      company: true,
      status: true,
      archivedAt: true,
      savedAt: true,
      metadata: true,
      jdSkillsVocabulary: true,
      jdSkillsHash: true,
      resumeTailor: {
        select: { enhanceTraceId: true, enhanceMeta: true, changedSections: true },
      },
    },
  });

  if (!job) {
    console.log(`\nJob not found: ${jobId}`);
    return;
  }
  if (job.userId !== userId) {
    console.log(`\nJob ${jobId} belongs to user ${job.userId}, not ${userId}`);
  }

  const meta =
    job.metadata && typeof job.metadata === "object" && !Array.isArray(job.metadata)
      ? (job.metadata as Record<string, unknown>)
      : null;
  const em = (job.resumeTailor?.enhanceMeta ?? {}) as Record<string, unknown>;

  console.log(`\n--- JOB ${jobId} ---`);
  console.log({
    title: job.title,
    company: job.company,
    status: job.status,
    archivedAt: job.archivedAt?.toISOString() ?? null,
    savedAt: job.savedAt.toISOString(),
    pipelineAiWarning: readMetaField(meta, "pipelineAiWarning"),
    pipelineError: readMetaField(meta, "pipelineError"),
    lastTailoredAt: readMetaField(meta, "lastTailoredAt"),
    trace: job.resumeTailor?.enhanceTraceId ?? null,
    changedSections: job.resumeTailor?.changedSections,
    engineMode: em.engineMode ?? null,
    aiAttempted: em.aiAttempted ?? null,
    aiSucceeded: em.aiSucceeded ?? null,
    aiBlockCode: em.aiBlockCode ?? null,
    routeMode: em.routeMode ?? null,
    modelId: em.modelId ?? null,
    jdSkillsHash: job.jdSkillsHash,
    vocabSkills: vocabSkillCount(job.jdSkillsVocabulary),
  });

  const pipelineDebug = parsePipelineDebugProgress(meta?.pipelineDebug);
  if (pipelineDebug) {
    console.log(`Pipeline steps (trace ${pipelineDebug.traceId}):`);
    console.table(
      pipelineDebug.steps.map((step) => ({
        step: step.id,
        status: step.status,
        detail: step.detail?.slice(0, 80) ?? "—",
        duration: formatStepDurationLabel(step) ?? "—",
      })),
    );
  }

  if (job.resumeTailor?.enhanceTraceId) {
    traceIdsOut.push(job.resumeTailor.enhanceTraceId);
    await printTrace(prisma, job.userId, job.resumeTailor.enhanceTraceId);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
