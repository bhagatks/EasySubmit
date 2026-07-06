#!/usr/bin/env npx tsx
import dotenv from "dotenv";
import { generateText } from "ai";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function main() {
  const { prisma } = await import("../lib/prisma");
  const { unvaultSystemApiKey } = await import("../lib/vault/system-key-vault");
  const { createAiSdkLanguageModel } = await import("../src/lib/ai/ai-sdk-provider");

  const slots = await prisma.systemApiKey.findMany({
    where: { enabled: true },
    orderBy: { slot: "asc" },
  });

  for (const slot of slots) {
    const apiKey = await unvaultSystemApiKey(slot.slot);
    console.log(`\n=== slot ${slot.slot} ${slot.provider} model=${slot.modelId} ===`);
    console.log("unvault:", apiKey ? "ok" : "FAILED");
    if (!apiKey) continue;

    try {
      const model = createAiSdkLanguageModel(
        slot.provider as "deepseek" | "gemini" | "openrouter",
        apiKey,
        slot.modelId,
      );
      const result = await generateText({
        model,
        prompt: "Reply OK",
        maxOutputTokens: 4,
        temperature: 0,
        maxRetries: 0,
      });
      console.log("call: ok", result.text.slice(0, 20));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log("call: FAIL", msg.slice(0, 200));
    }
  }
}

main().catch(console.error);
