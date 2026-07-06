#!/usr/bin/env npx tsx
import dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function main() {
  const { prisma } = await import("../lib/prisma");
  const { loadProviderModelHealth } = await import(
    "../lib/ai/model-health/resolve-model-candidates"
  );
  const { resolveCandidatesFromHealthForTask } = await import(
    "../lib/ai/model-health/model-candidate-ranking"
  );
  const { resolveByokTaskRoute } = await import(
    "../lib/ai/model-health/resolve-byok-task-route"
  );
  const { isHandshakeProvider } = await import("../src/lib/config/career-grade-models");

  const rows = await prisma.userApiKey.findMany({
    select: { userId: true, provider: true, user: { select: { email: true } } },
  });

  for (const row of rows) {
    if (!isHandshakeProvider(row.provider)) continue;

    console.log(`\n=== ${row.provider} (${row.user.email}) ===`);
    const health = await loadProviderModelHealth(row.userId, row.provider);
    if (!health) {
      console.log("  no modelHealth stored");
      continue;
    }

    console.log(`  discovered: ${health.discoveredCount}  ranked: ${health.rankedModels.length}`);
    for (const modelId of health.rankedModels) {
      const entry = health.entries[modelId];
      if (!entry) continue;
      console.log(
        `  • ${modelId} | tier=${entry.tier ?? "?"} structured=${entry.probes.structured} status=${entry.status}`,
      );
    }

    const cheap = resolveCandidatesFromHealthForTask(row.provider, health, "cheap");
    const flagship = resolveCandidatesFromHealthForTask(row.provider, health, "flagship");
    console.log(`  cheap primary: ${cheap.primaryModelId}`);
    console.log(`  flagship primary: ${flagship.primaryModelId}`);

    const baseRoute = {
      mode: "customer" as const,
      provider: row.provider,
      modelId: flagship.primaryModelId,
      modelCandidates: flagship.rankedModels,
      vaultKeyId: "verify",
    };
    const cheapRoute = await resolveByokTaskRoute(baseRoute, "cheap", { userId: row.userId });
    const flagRoute = await resolveByokTaskRoute(baseRoute, "flagship", { userId: row.userId });
    console.log(`  resume enhance (cheap): ${cheapRoute.modelId}`);
    console.log(`  cover letter (flagship): ${flagRoute.modelId}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
