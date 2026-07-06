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
  const { handshakeProviderModels } = await import("../src/lib/ai/server-model-discovery");

  const row = await prisma.userApiKey.findFirst({ where: { provider: "groq" } });
  if (!row) {
    console.log("no groq key");
    return;
  }

  const apiKey = await unvaultUserApiKey(row.userId, "groq");
  if (!apiKey) {
    console.log("unvault failed");
    return;
  }

  const list = await handshakeProviderModels("groq", apiKey);
  console.log("models list ok:", list.ok);
  if (list.ok) {
    console.log("total models:", list.models.length);
    for (const id of [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "llama-3.1-70b-versatile",
      "mixtral-8x7b-32768",
    ]) {
      console.log(`  ${id}: ${list.models.includes(id) ? "yes" : "NO"}`);
    }
  } else {
    console.log("list error:", list.message);
  }

  for (const modelId of [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
  ]) {
    const result = await probeModelCapabilities({ provider: "groq", apiKey, modelId });
    console.log(`probe ${modelId}:`, result);
  }
}

main().catch(console.error);
