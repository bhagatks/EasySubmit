#!/usr/bin/env npx tsx
import dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function main() {
  const { prisma } = await import("../lib/prisma");
  const { unvaultUserApiKey } = await import("../lib/vault/user-key-vault");
  const { unvaultSystemApiKey } = await import("../lib/vault/system-key-vault");
  const { probeModelCapabilities } = await import(
    "../lib/ai/model-health/probe-model-capabilities"
  );
  const { performEngineHandshake } = await import("../src/lib/ai/discovery-service");

  const modelsToTry = ["deepseek-chat", "deepseek-reasoner", "deepseek-v4-pro", "deepseek-v4-flash"];

  const dsRow = await prisma.userApiKey.findFirst({
    where: { provider: "deepseek" },
    select: { userId: true, user: { select: { email: true } } },
  });
  if (dsRow) {
    const apiKey = await unvaultUserApiKey(dsRow.userId, "deepseek");
    if (apiKey) {
      const discovery = await performEngineHandshake({ provider: "deepseek", apiKey });
      console.log(`BYOK (${dsRow.user.email}) discovered:`, discovery.success ? discovery.models : discovery.error);
      for (const modelId of modelsToTry) {
        const result = await probeModelCapabilities({ provider: "deepseek", apiKey, modelId });
        console.log(`  BYOK @ ${modelId}:`, result);
      }
    }
  }

  const sysKey = await unvaultSystemApiKey(0);
  if (sysKey) {
    const discovery = await performEngineHandshake({ provider: "deepseek", apiKey: sysKey });
    console.log(`SYSTEM slot 0 discovered:`, discovery.success ? discovery.models : discovery.error);
    for (const modelId of modelsToTry) {
      const result = await probeModelCapabilities({ provider: "deepseek", apiKey: sysKey, modelId });
      console.log(`  SYSTEM @ ${modelId}:`, result);
    }
  }
}

main().catch(console.error);
