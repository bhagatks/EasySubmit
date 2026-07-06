#!/usr/bin/env npx tsx
import dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function main() {
  const { prisma } = await import("../lib/prisma");
  const { unvaultUserApiKey } = await import("../lib/vault/user-key-vault");
  const { probeModelCapabilities } = await import(
    "../lib/ai/model-health/probe-model-capabilities"
  );
  const { isAiProvider } = await import("../src/lib/config/app.config");

  const rows = await prisma.userApiKey.findMany({
    select: { userId: true, provider: true, user: { select: { email: true } } },
  });

  for (const row of rows) {
    if (!isAiProvider(row.provider)) {
      console.log(`${row.provider}: skipped (unknown provider)`);
      continue;
    }
    const apiKey = await unvaultUserApiKey(row.userId, row.provider);
    if (!apiKey) {
      console.log(`${row.provider}: unvault failed`);
      continue;
    }
    const defaults: Record<string, string> = {
      deepseek: "deepseek-chat",
      gemini: "gemini-2.5-flash",
      openai: "gpt-4o-mini",
      anthropic: "claude-3-5-haiku-20241022",
      groq: "llama-3.3-70b-versatile",
    };
    const modelId = defaults[row.provider] ?? "unknown";
    const result = await probeModelCapabilities({
      provider: row.provider,
      apiKey,
      modelId,
    });
    console.log(`${row.provider} (${row.user.email}) @ ${modelId}:`, result);
  }
}

main().catch(console.error);
