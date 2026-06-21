#!/usr/bin/env npx tsx
/**
 * One-shot system key pool + recent Enhance telemetry.
 *
 * Usage:
 *   npm run pool:status
 *   npm run pool:status -- abc12345          # filter by traceId prefix
 *   npm run pool:status -- --trace abc12345
 */
import dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

function parseTraceArg(argv: string[]): string | null {
  const dashIdx = argv.indexOf("--trace");
  if (dashIdx !== -1 && argv[dashIdx + 1]) {
    return argv[dashIdx + 1]!.trim();
  }
  const positional = argv.find((arg) => !arg.startsWith("-") && arg.length >= 6);
  return positional?.trim() || null;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set (.env.local)");
    process.exit(1);
  }

  const traceFilter = parseTraceArg(process.argv.slice(2));
  const { prisma } = await import("../lib/prisma");

  console.log("\n=== System key pool (slots 0–2) ===\n");
  const slots = await prisma.systemApiKey.findMany({
    orderBy: { slot: "asc" },
    select: {
      slot: true,
      label: true,
      enabled: true,
      billingMode: true,
      modelId: true,
      callsToday: true,
      exhaustedUntil: true,
      quotaResetDate: true,
    },
  });

  if (!slots.length) {
    console.log("No system_api_keys rows — vault import or SQL not done yet.");
  } else {
    console.table(
      slots.map((row) => ({
        slot: row.slot,
        label: row.label ?? "—",
        enabled: row.enabled,
        billing: row.billingMode,
        callsToday: row.callsToday,
        exhaustedUntil: row.exhaustedUntil?.toISOString() ?? "—",
        quotaReset: row.quotaResetDate ?? "—",
      })),
    );
  }

  console.log("\n=== Recent Enhance API calls (system) ===\n");
  const logs = await prisma.apiCallLog.findMany({
    where: {
      operation: "ai.enhance.generate_text",
      aiMode: "system",
      ...(traceFilter
        ? { traceId: { startsWith: traceFilter } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: traceFilter ? 20 : 8,
    select: {
      createdAt: true,
      traceId: true,
      status: true,
      keySlot: true,
      keyLabel: true,
      billingMode: true,
      tokensUsed: true,
      durationMs: true,
      errorCode: true,
      metadata: true,
    },
  });

  if (!logs.length) {
    console.log(
      traceFilter
        ? `No api_call_logs for traceId starting with "${traceFilter}".`
        : "No enhance logs yet — run Enhance with AI once, then re-run this command.",
    );
  } else {
    console.table(
      logs.map((row) => ({
        at: row.createdAt.toISOString().slice(0, 19),
        traceId: row.traceId ?? "—",
        pass:
          row.metadata &&
          typeof row.metadata === "object" &&
          "pass" in row.metadata
            ? String((row.metadata as { pass?: string }).pass ?? "—")
            : "—",
        status: row.status,
        slot: row.keySlot ?? "—",
        label: row.keyLabel ?? "—",
        billing: row.billingMode ?? "—",
        tokens: row.tokensUsed ?? "—",
        ms: row.durationMs,
        error: row.errorCode ?? "",
      })),
    );
  }

  if (!traceFilter) {
    console.log(
      "\nTip: After Enhance, copy traceId from browser/terminal and run:\n" +
        "  npm run pool:status -- <traceId>\n",
    );
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
