#!/usr/bin/env npx tsx
/**
 * AI usage / api_call_logs breakdown for debugging quota and health alerts.
 *
 * Usage: npm run ai:usage
 */
import dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set (.env.local)");
    process.exit(1);
  }

  const { prisma } = await import("../lib/prisma");

  const now = new Date();
  const since30m = new Date(now.getTime() - 30 * 60 * 1000);
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  async function groupBy<K extends "status" | "operation" | "errorCode" | "aiMode">(
    field: K,
    where: Record<string, unknown> = {},
  ) {
    const rows = await prisma.apiCallLog.groupBy({
      by: [field],
      where,
      _count: { _all: true },
    });
    return rows
      .map((r) => ({
        [field]: r[field] ?? "(null)",
        count: r._count._all,
      }))
      .sort((a, b) => b.count - a.count);
  }

  const [
    total,
    last30m,
    last24h,
    last7dCount,
    today,
    users,
    slots,
    tokensAgg,
    recentErrors,
  ] = await Promise.all([
    prisma.apiCallLog.count(),
    prisma.apiCallLog.count({ where: { createdAt: { gte: since30m } } }),
    prisma.apiCallLog.count({ where: { createdAt: { gte: since24h } } }),
    prisma.apiCallLog.count({ where: { createdAt: { gte: since7d } } }),
    prisma.apiCallLog.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        aiSourcePreference: true,
        vaultKeyId: true,
        activeProvider: true,
        aiEnhancementsToday: true,
        aiCallsToday: true,
        aiQuotaResetAt: true,
        createdAt: true,
        _count: { select: { apiCallLogs: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.systemApiKey.findMany({ orderBy: { slot: "asc" } }),
    prisma.apiCallLog.aggregate({
      _sum: { tokensUsed: true, durationMs: true },
      _count: { _all: true },
      where: { status: "success" },
    }),
    prisma.apiCallLog.findMany({
      where: { status: "error", createdAt: { gte: since24h } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        createdAt: true,
        operation: true,
        errorCode: true,
        errorMessage: true,
        aiMode: true,
        keySlot: true,
        traceId: true,
        userId: true,
      },
    }),
  ]);

  const byStatusAll = await groupBy("status");
  const byStatus30m = await groupBy("status", { createdAt: { gte: since30m } });
  const byOperation = await groupBy("operation");
  const byError = await groupBy("errorCode", { status: "error" });
  const byAiMode = await groupBy("aiMode");
  const byUser = await prisma.apiCallLog.groupBy({
    by: ["userId"],
    _count: { _all: true },
  });

  const daily = await prisma.$queryRaw<
    Array<{ day: Date; total: number; success: number; errors: number; tokens: number }>
  >`
    SELECT date_trunc('day', "createdAt")::date AS day,
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'success')::int AS success,
           COUNT(*) FILTER (WHERE status = 'error')::int AS errors,
           COALESCE(SUM("tokensUsed") FILTER (WHERE status = 'success'), 0)::int AS tokens
    FROM api_call_logs
    WHERE "createdAt" >= ${since7d}
    GROUP BY 1
    ORDER BY 1 DESC
  `;

  const enhanceTraces = await prisma.$queryRaw<
    Array<{
      traceId: string;
      calls: number;
      started: Date;
      ended: Date;
      ok: number;
      err: number;
    }>
  >`
    SELECT "traceId",
           COUNT(*)::int AS calls,
           MIN("createdAt") AS started,
           MAX("createdAt") AS ended,
           COUNT(*) FILTER (WHERE status = 'success')::int AS ok,
           COUNT(*) FILTER (WHERE status = 'error')::int AS err
    FROM api_call_logs
    WHERE operation LIKE 'ai.enhance%'
      AND "traceId" IS NOT NULL
    GROUP BY "traceId"
    ORDER BY MAX("createdAt") DESC
    LIMIT 25
  `;

  const healthWindow = await prisma.apiCallLog.groupBy({
    by: ["status"],
    where: { createdAt: { gte: since30m } },
    _count: { _all: true },
  });
  const errors30m = healthWindow.find((r) => r.status === "error")?._count._all ?? 0;
  const success30m = healthWindow.find((r) => r.status === "success")?._count._all ?? 0;

  console.log("\n========== EASY SUBMIT AI USAGE ANALYSIS ==========\n");
  console.log("Generated:", now.toISOString());

  console.log("\n--- Transaction counts (api_call_logs rows) ---");
  console.table([
    { window: "All time", count: total },
    { window: "Today (local midnight)", count: today },
    { window: "Last 24 hours", count: last24h },
    { window: "Last 30 minutes (health check window)", count: last30m },
    { window: "Last 7 days", count: last7dCount },
  ]);

  console.log("\n--- Extension health check logic (last 30 min) ---");
  console.log({
    errors: errors30m,
    successes: success30m,
    wouldShowGenericBanner: errors30m >= 2 && success30m === 0,
    note: "Banner clears when successes > 0 or errors age past 30 min",
  });

  console.log("\n--- By status (all time) ---");
  console.table(byStatusAll);
  console.log("\n--- By status (last 30 min) ---");
  console.table(byStatus30m);

  console.log("\n--- By operation (all time) ---");
  console.table(byOperation);

  console.log("\n--- By AI mode ---");
  console.table(byAiMode);

  console.log("\n--- Error codes (all time) ---");
  console.table(byError);

  console.log("\n--- Success totals ---");
  console.log({
    successfulCalls: tokensAgg._count._all,
    totalTokensUsed: tokensAgg._sum.tokensUsed ?? 0,
    totalDurationMs: tokensAgg._sum.durationMs ?? 0,
    avgTokensPerSuccess: tokensAgg._count._all
      ? Math.round((tokensAgg._sum.tokensUsed ?? 0) / tokensAgg._count._all)
      : 0,
  });

  console.log("\n--- Users ---");
  console.table(
    users.map((u) => ({
      email: u.email,
      aiSource: u.aiSourcePreference,
      hasByok: Boolean(u.vaultKeyId),
      provider: u.activeProvider ?? "—",
      aiEnhancementsToday: u.aiEnhancementsToday,
      aiCallsToday: u.aiCallsToday,
      quotaResetAt: u.aiQuotaResetAt.toISOString().slice(0, 19),
      loggedApiCalls: u._count.apiCallLogs,
    })),
  );

  console.log("\n--- API calls per user ---");
  for (const row of byUser) {
    const u = users.find((x) => x.id === row.userId);
    console.log({
      userId: row.userId ?? "(anonymous)",
      email: u?.email ?? "(unknown)",
      count: row._count._all,
    });
  }

  console.log("\n--- System key pool ---");
  console.table(
    slots.map((s) => ({
      slot: s.slot,
      label: s.label,
      enabled: s.enabled,
      billing: s.billingMode,
      callsToday: s.callsToday,
      exhaustedUntil: s.exhaustedUntil?.toISOString() ?? "—",
      quotaResetDate: s.quotaResetDate ?? "—",
      modelId: s.modelId ?? "—",
    })),
  );

  const poolCallsToday = slots.reduce((sum, s) => sum + s.callsToday, 0);
  console.log("\nPool summary:", {
    slots: slots.length,
    callsTodayAcrossSlots: poolCallsToday,
    exhaustedSlots: slots.filter((s) => s.exhaustedUntil && s.exhaustedUntil > now).length,
  });

  console.log("\n--- Daily breakdown (last 7 days) ---");
  console.table(
    daily.map((d) => ({
      day: d.day instanceof Date ? d.day.toISOString().slice(0, 10) : d.day,
      total: d.total,
      success: d.success,
      errors: d.errors,
      tokens: d.tokens,
    })),
  );

  console.log("\n--- Recent enhance sessions (by traceId) ---");
  console.table(
    enhanceTraces.map((t) => ({
      traceId: t.traceId,
      calls: t.calls,
      ok: t.ok,
      err: t.err,
      started:
        t.started instanceof Date ? t.started.toISOString().slice(0, 19) : String(t.started),
      ended: t.ended instanceof Date ? t.ended.toISOString().slice(0, 19) : String(t.ended),
    })),
  );

  console.log("\n--- Recent errors (24h) ---");
  console.table(
    recentErrors.map((e) => ({
      at: e.createdAt.toISOString().slice(0, 19),
      operation: e.operation,
      errorCode: e.errorCode,
      aiMode: e.aiMode,
      slot: e.keySlot,
      traceId: e.traceId,
      msg: (e.errorMessage ?? "").slice(0, 80),
    })),
  );

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
