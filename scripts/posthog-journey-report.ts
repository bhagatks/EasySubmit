#!/usr/bin/env npx tsx
import dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
const apiHost = host.replace("us.i.posthog.com", "us.posthog.com");
const devProjectId = process.env.POSTHOG_DEV_PROJECT_ID ?? "488025";

async function hogql(projectId: string, query: string) {
  const res = await fetch(`${apiHost}/api/projects/${projectId}/query/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
  });
  if (!res.ok) throw new Error(`HogQL ${res.status}: ${await res.text()}`);
  return res.json() as Promise<{ columns?: string[]; results?: unknown[][] }>;
}

async function reportDb(): Promise<string | null> {
  const { prisma } = await import("../lib/prisma");
  const { getAiHealthCheckForUser } = await import("../lib/ai/ai-health-status");
  const { getAiReadinessForUser } = await import("../lib/ai/ai-readiness-gate-for-user");

  const user = await prisma.user.findFirst({
    where: { email: "bhagathsiddi@gmail.com" },
    select: {
      id: true,
      email: true,
      aiEnhancementsToday: true,
      aiCallsToday: true,
      aiSourcePreference: true,
    },
  });

  if (!user) {
    console.log("DB: user not found");
    return null;
  }

  const [health, readiness, logs, lastJob] = await Promise.all([
    getAiHealthCheckForUser(user.id),
    getAiReadinessForUser(user.id),
    prisma.apiCallLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        createdAt: true,
        operation: true,
        status: true,
        aiMode: true,
        errorCode: true,
        traceId: true,
        tokensUsed: true,
        metadata: true,
      },
    }),
    prisma.jobTrackerEntry.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        title: true,
        company: true,
        status: true,
        updatedAt: true,
        resumeTailor: { select: { enhanceTraceId: true } },
      },
    }),
  ]);

  console.log("\n── DB journey ──");
  console.log({
    user: user.email,
    aiEnhancementsToday: user.aiEnhancementsToday,
    aiCallsToday: user.aiCallsToday,
    healthOk: health.status.ok,
    healthCode: health.status.ok ? null : health.status.code,
    readinessOk: readiness.status.ok,
    quotaExceeded: readiness.systemQuota.exceeded,
  });
  console.log("\nLast job:", {
    title: lastJob?.title,
    company: lastJob?.company,
    status: lastJob?.status,
    updatedAt: lastJob?.updatedAt?.toISOString(),
    enhanceTraceId: lastJob?.resumeTailor?.enhanceTraceId,
  });
  console.log("\nRecent AI API logs (ai_used / call status):");
  for (const row of logs) {
    const meta =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {};
    console.log({
      at: row.createdAt.toISOString(),
      op: row.operation,
      status: row.status,
      trace: row.traceId,
      err: row.errorCode ?? "—",
      tokens: row.tokensUsed,
      aiUsed: meta.aiUsed ?? row.operation.startsWith("ai."),
      aiCallStatus: meta.aiCallStatus ?? row.status,
    });
  }

  await prisma.$disconnect();
  return user.id;
}

async function backfillFromDb(userId: string) {
  const captureKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!captureKey) {
    console.log("\nBackfill SKIP: NEXT_PUBLIC_POSTHOG_KEY missing");
    return;
  }
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENV === "prod") {
    console.log("\nBackfill SKIP: analytics env is prod");
    return;
  }

  const { prisma } = await import("../lib/prisma");
  const lastJob = await prisma.jobTrackerEntry.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      updatedAt: true,
      resumeTailor: { select: { enhanceTraceId: true } },
    },
  });

  const traceId = lastJob?.resumeTailor?.enhanceTraceId ?? lastJob?.id ?? "unknown";
  const logs = await prisma.apiCallLog.findMany({
    where: { userId, traceId },
    orderBy: { createdAt: "asc" },
    select: { status: true, errorCode: true, tokensUsed: true },
  });

  const aiUsed = logs.length > 0;
  const aiSucceeded = logs.some((l) => l.status === "success");
  const aiCallStatus = !aiUsed
    ? "skipped"
    : aiSucceeded
      ? "success"
      : "failure";
  const tokensUsed = logs.reduce((n, l) => n + (l.tokensUsed ?? 0), 0);

  const events = [
    {
      event: "extension_job_captured",
      properties: {
        environment: "dev",
        dev_journey: true,
        entry_id: lastJob?.id,
        status: "CAPTURED",
        backfill: true,
      },
    },
    {
      event: "resume_journey_step",
      properties: {
        environment: "dev",
        dev_journey: true,
        journey: "capture",
        trace_id: traceId,
        ai_used: false,
        ai_call_status: "skipped",
        step_status: "success",
        backfill: true,
      },
    },
    {
      event: "resume_journey_step",
      properties: {
        environment: "dev",
        dev_journey: true,
        journey: "ai_upgrade",
        trace_id: traceId,
        ai_used: aiUsed,
        ai_call_status: aiCallStatus,
        engine_mode: aiSucceeded ? "ai" : "deterministic",
        step_status: aiSucceeded ? "success" : "error",
        api_call_count: logs.length,
        tokens_used: tokensUsed,
        backfill: true,
      },
    },
    {
      event: "resume_journey_step",
      properties: {
        environment: "dev",
        dev_journey: true,
        journey: "apply_ready",
        trace_id: traceId,
        job_status: lastJob?.status,
        ai_used: aiUsed,
        ai_call_status: aiCallStatus,
        step_status: "success",
        backfill: true,
      },
    },
    {
      event: "enhance_completed",
      properties: {
        environment: "dev",
        surface: "extension",
        document_kind: "resume",
        status: aiSucceeded ? "success" : "error",
        trace_id: traceId,
        ai_attempted: aiUsed,
        ai_succeeded: aiSucceeded,
        engine_mode: aiSucceeded ? "ai" : "deterministic",
        backfill: true,
      },
    },
  ];

  console.log(`\n── Backfill → PostHog dev (trace ${traceId}) ──`);
  for (const e of events) {
    const res = await fetch(`${host}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: captureKey, distinct_id: userId, ...e }),
    });
    const body = await res.text();
    console.log(`${e.event}: HTTP ${res.status}${body && body !== "1" ? " " + body.slice(0, 120) : ""}`);
  }

  await prisma.$disconnect();
}

async function reportPostHog() {
  console.log(`\n── PostHog dev project ${devProjectId} ──`);
  if (!apiKey) {
    console.log("SKIP read: POSTHOG_PERSONAL_API_KEY missing in .env.local");
    return;
  }

  async function countsForProject(projectId: string) {
    const out: Record<string, string | number> = {};
    for (const event of [
      "resume_journey_step",
      "enhance_completed",
      "extension_job_captured",
      "api_call_logged",
      "ui_interaction",
    ]) {
      const { results } = await hogql(
        projectId,
        `SELECT count(), max(timestamp) FROM events WHERE event='${event}' AND timestamp > now() - INTERVAL 7 DAY`,
      );
      out[event] = results?.[0]?.[0] ?? 0;
    }
    return out;
  }

  const devCounts = await countsForProject(devProjectId);
  for (const [event, count] of Object.entries(devCounts)) {
    console.log(`${event}: count=${count}`);
  }

  const prodId = process.env.POSTHOG_PROD_PROJECT_ID ?? "488042";
  if (prodId !== devProjectId) {
    try {
      const prodCounts = await countsForProject(prodId);
      const prodTotal = Object.values(prodCounts).reduce((a, b) => a + Number(b), 0);
      if (prodTotal > 0) {
        console.log(`\nNote: events in prod project ${prodId} — NEXT_PUBLIC_POSTHOG_KEY may target prod, not dev ${devProjectId}`);
        for (const [event, count] of Object.entries(prodCounts)) {
          if (Number(count) > 0) console.log(`  prod ${event}: count=${count}`);
        }
      }
    } catch {
      /* personal key may not have prod access */
    }
  }

  const anyDev = await hogql(
    devProjectId,
    `SELECT count() FROM events WHERE timestamp > now() - INTERVAL 7 DAY`,
  );
  console.log(`\nTotal events in dev (7d): ${anyDev.results?.[0]?.[0] ?? 0}`);

  const detail = await hogql(
    devProjectId,
    `SELECT timestamp, properties.trace_id, properties.journey, properties.ai_used, properties.ai_call_status, properties.engine_mode, properties.error_code, properties.backfill
     FROM events WHERE event='resume_journey_step' AND timestamp > now() - INTERVAL 7 DAY ORDER BY timestamp DESC LIMIT 8`,
  );

  console.log("\nLast resume_journey_step in PostHog (dev):");
  const cols = detail.columns ?? [];
  for (const row of detail.results ?? []) {
    console.log(Object.fromEntries(cols.map((c, i) => [c, row[i]])));
  }
}

async function main() {
  const backfill = process.argv.includes("--backfill");
  console.log("EasySubmit resume journey report\n");
  const userId = await reportDb();
  if (backfill && userId) {
    await backfillFromDb(userId);
  }
  await reportPostHog();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
