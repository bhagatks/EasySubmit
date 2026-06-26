#!/usr/bin/env npx tsx
import dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function main() {
  const { prisma } = await import("../lib/prisma");
  const { getAiHealthCheckForUser } = await import("../lib/ai/ai-health-status");
  const { getAiReadinessForUser } = await import("../lib/ai/ai-readiness-gate-for-user");
  const { resolveEffectiveAiSource } = await import("../src/lib/ai/engine/router");

  const user = await prisma.user.findFirst({
    where: { email: "bhagathsiddi@gmail.com" },
    select: {
      id: true,
      email: true,
      aiSourcePreference: true,
      vaultKeyId: true,
      activeProvider: true,
      aiEnhancementsToday: true,
      aiCallsToday: true,
      aiQuotaResetAt: true,
    },
  });

  if (!user) {
    console.log("User not found");
    return;
  }

  const routeMode = resolveEffectiveAiSource(
    (user.aiSourcePreference ?? "auto") as "auto" | "system" | "customer",
    Boolean(user.vaultKeyId),
  );

  const [health, readiness, lastLogs, lastEnhanceTrace] = await Promise.all([
    getAiHealthCheckForUser(user.id),
    getAiReadinessForUser(user.id),
    prisma.apiCallLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        createdAt: true,
        operation: true,
        status: true,
        errorCode: true,
        errorMessage: true,
        aiMode: true,
        keySlot: true,
        traceId: true,
        durationMs: true,
        tokensUsed: true,
      },
    }),
    prisma.apiCallLog.findFirst({
      where: { userId: user.id, operation: { startsWith: "ai.enhance" } },
      orderBy: { createdAt: "desc" },
      select: { traceId: true, createdAt: true },
    }),
  ]);

  let traceLogs: typeof lastLogs = [];
  if (lastEnhanceTrace?.traceId) {
    traceLogs = await prisma.apiCallLog.findMany({
      where: { traceId: lastEnhanceTrace.traceId, userId: user.id },
      orderBy: { createdAt: "asc" },
      select: {
        createdAt: true,
        operation: true,
        status: true,
        errorCode: true,
        errorMessage: true,
        aiMode: true,
        keySlot: true,
        traceId: true,
        durationMs: true,
        tokensUsed: true,
      },
    });
  }

  console.log("\n=== USER ===");
  console.log({
    email: user.email,
    aiSourcePreference: user.aiSourcePreference,
    activeProvider: user.activeProvider,
    hasVaultKey: Boolean(user.vaultKeyId),
    effectiveRoute: routeMode,
    aiEnhancementsToday: user.aiEnhancementsToday,
    aiCallsToday: user.aiCallsToday,
    quotaResetAt: user.aiQuotaResetAt.toISOString(),
  });

  console.log("\n=== HEALTH (extension banner source) ===");
  console.log(health.status);
  console.log("debug:", health.debug);

  console.log("\n=== READINESS (enhance preflight) ===");
  console.log({
    ok: readiness.status.ok,
    reason: readiness.reason,
    message: readiness.status.ok ? null : readiness.status.message,
    systemQuota: {
      applies: readiness.systemQuota.applies,
      exceeded: readiness.systemQuota.exceeded,
      reason: readiness.systemQuota.reason,
    },
  });

  console.log("\n=== LAST 8 API LOGS ===");
  console.table(
    lastLogs.map((r) => ({
      at: r.createdAt.toISOString(),
      op: r.operation,
      status: r.status,
      aiMode: r.aiMode,
      slot: r.keySlot,
      err: r.errorCode ?? "—",
      trace: r.traceId,
      ms: r.durationMs,
      tokens: r.tokensUsed,
    })),
  );

  console.log("\n=== LAST ENHANCE TRACE (all steps) ===");
  console.log("traceId:", lastEnhanceTrace?.traceId ?? "none");
  console.table(
    traceLogs.map((r) => ({
      at: r.createdAt.toISOString(),
      op: r.operation,
      status: r.status,
      aiMode: r.aiMode,
      slot: r.keySlot,
      err: r.errorCode ?? "—",
      msg: r.errorMessage?.slice(0, 80) ?? "—",
      ms: r.durationMs,
    })),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("../lib/prisma");
    await prisma.$disconnect();
  });
