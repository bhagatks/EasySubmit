#!/usr/bin/env npx tsx
/**
 * Dev helper: reset system key pool exhaustion and sync callsToday from logs.
 *
 * Usage:
 *   npm run pool:reset
 *   npm run pool:reset -- --email you@example.com --prefer-auto
 *
 * --prefer-auto only changes aiSourcePreference system→auto when explicitly passed.
 */
import dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

function parseArg(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || !process.argv[idx + 1]) return null;
  return process.argv[idx + 1]!.trim();
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set (.env.local)");
    process.exit(1);
  }

  const email = parseArg("--email");
  const preferAuto = process.argv.includes("--prefer-auto");

  const { prisma } = await import("../lib/prisma");
  const { unvaultSystemApiKey } = await import("../lib/vault/system-key-vault");
  const { getTodayPacificDateString } = await import("../src/lib/ai/engine/pacific-time");

  const today = getTodayPacificDateString();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  console.log("\n=== Pool reset (dev) ===\n");

  const slots = await prisma.systemApiKey.findMany({ orderBy: { slot: "asc" } });
  for (const slot of slots) {
    const key = await unvaultSystemApiKey(slot.slot);
    const keyHint = key ? `${key.slice(0, 10)}…` : "(missing)";
    const looksPlaceholder = Boolean(
      key && /^(your_|placeholder|changeme|xxx)/i.test(key.trim()),
    );

    const loggedToday = await prisma.apiCallLog.count({
      where: {
        status: "success",
        keySlot: slot.slot,
        createdAt: { gte: startOfDay },
      },
    });

    await prisma.systemApiKey.update({
      where: { slot: slot.slot },
      data: {
        callsToday: loggedToday,
        exhaustedUntil: null,
        quotaResetDate: today,
      },
    });

    console.log({
      slot: slot.slot,
      label: slot.label,
      keyHint,
      looksPlaceholder,
      callsTodaySetTo: loggedToday,
      exhaustedCleared: true,
    });
  }

  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.warn(`User not found: ${email}`);
    } else if (preferAuto && user.aiSourcePreference === "system") {
      await prisma.user.update({
        where: { id: user.id },
        data: { aiSourcePreference: "auto" },
      });
      console.log(`\nUpdated ${email}: aiSourcePreference system → auto (BYOK when vault key exists)`);
    } else {
      console.log(`\nUser ${email}: aiSource=${user.aiSourcePreference}, hasByok=${Boolean(user.vaultKeyId)}`);
    }
  }

  console.log("\nDone. Re-run: npm run pool:status\n");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
