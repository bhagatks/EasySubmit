#!/usr/bin/env npx tsx
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function main() {
  const { prisma } = await import("@/lib/prisma");
  const { getAppConfig } = await import("@/src/lib/services/config-service");
  const { hasSystemPoolKeys, hasHealthySystemPoolSlot, listSystemKeySlots } = await import(
    "@/src/lib/ai/engine/system-key-pool"
  );

  const cfg = await getAppConfig("aiEngine");
  const row = await prisma.appConfig.findUnique({ where: { key: "aiEngine" } });
  const systemKeys = await prisma.systemApiKey.findMany({
    orderBy: { slot: "asc" },
    select: {
      slot: true,
      provider: true,
      enabled: true,
      callsToday: true,
      exhaustedUntil: true,
      modelId: true,
    },
  });

  console.log("\n=== app_config.aiEngine (raw DB) ===");
  console.log(JSON.stringify(row?.value ?? null, null, 2));

  console.log("\n=== app_config.aiEngine (parsed) ===");
  console.log(JSON.stringify(cfg, null, 2));

  console.log("\n=== system_api_keys table ===");
  console.table(systemKeys);

  console.log("\n=== env key presence (not values) ===");
  console.log({
    DEEPSEEK_API_KEYS: Boolean(process.env.EASYSUBMIT_SYSTEM_DEEPSEEK_API_KEYS?.trim()),
    DEEPSEEK_API_KEY: Boolean(process.env.EASYSUBMIT_SYSTEM_DEEPSEEK_API_KEY?.trim()),
    GEMINI_API_KEYS: Boolean(process.env.EASYSUBMIT_SYSTEM_GEMINI_API_KEYS?.trim()),
    GEMINI_API_KEY: Boolean(process.env.EASYSUBMIT_SYSTEM_GEMINI_API_KEY?.trim()),
  });

  console.log("\n=== pool health ===");
  console.log({
    hasSystemPoolKeys: await hasSystemPoolKeys(cfg),
    hasHealthySystemPoolSlot: await hasHealthySystemPoolSlot(cfg),
  });

  const slots = await listSystemKeySlots(cfg);
  console.log("\n=== active pool slots (provider-filtered) ===");
  console.table(slots);

  if (cfg.system.provider === "deepseek" && cfg.system.modelId.includes("gemini")) {
    console.log("\n⚠️  MISMATCH: provider=deepseek but modelId is a Gemini model id");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
