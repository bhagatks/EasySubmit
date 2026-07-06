#!/usr/bin/env npx tsx
/** Vault custom AIHubMix key from .tmp-debug/custom-endpoint-live.env for QA user. */
import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { join } from "node:path";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

const envFile = join(process.cwd(), ".tmp-debug", "custom-endpoint-live.env");
if (existsSync(envFile)) {
  dotenv.config({ path: envFile, override: true });
}

import { performEngineHandshake } from "@/src/lib/ai/discovery-service";
import { refreshProviderModelHealth } from "@/lib/ai/model-health/refresh-provider-model-health";
import { vaultUserApiKey } from "@/lib/vault/user-key-vault";
import { prisma } from "@/lib/prisma";

const email = process.argv[2] ?? "bhagathsiddi@gmail.com";
const BASE = process.env.CUSTOM_ENDPOINT_URL?.trim();
const KEY = process.env.CUSTOM_ENDPOINT_KEY?.trim();
const MODEL = process.env.CUSTOM_MODEL_ID?.trim() || "coding-glm-5.1-free";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set — run via node scripts/run.mjs wrapper");
    process.exit(1);
  }
  if (!BASE || !KEY) {
    console.error("Missing CUSTOM_ENDPOINT_URL / CUSTOM_ENDPOINT_KEY in .tmp-debug/custom-endpoint-live.env");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, activeProvider: true, vaultKeyId: true },
  });
  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  console.log("Vaulting custom endpoint for", email);
  console.log("endpoint:", BASE);
  console.log("model:", MODEL);

  const discovery = await performEngineHandshake({
    provider: "custom",
    apiKey: KEY,
    customEndpointUrl: BASE,
    customModelId: MODEL,
  });
  if (!discovery.success) {
    console.error("Handshake failed:", discovery.error);
    process.exit(1);
  }
  console.log("Handshake OK — models:", discovery.models.slice(0, 8), "primary:", discovery.suggestedPrimaryFuel);

  const { vaultSecretId } = await vaultUserApiKey(user.id, "custom", KEY, {
    setAsActive: true,
    customEndpointUrl: BASE,
  });
  console.log("Vaulted custom key:", vaultSecretId.slice(0, 8) + "…");

  await refreshProviderModelHealth({
    userId: user.id,
    provider: "custom",
    apiKey: KEY,
    customEndpointUrl: BASE,
    traceId: `qa-vault-custom-${Date.now()}`,
  });
  console.log("Model health refreshed");

  const row = await prisma.userApiKey.findUnique({
    where: { userId_provider: { userId: user.id, provider: "custom" } },
    select: { customEndpointUrl: true, modelHealth: true },
  });
  console.log("Stored endpoint:", row?.customEndpointUrl);
  const health = row?.modelHealth as { rankedModels?: string[]; primaryModelId?: string } | null;
  console.log("Primary model:", health?.primaryModelId ?? "—");
  console.log("Ranked sample:", health?.rankedModels?.slice(0, 5) ?? []);
}

main()
  .finally(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
