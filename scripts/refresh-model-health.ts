#!/usr/bin/env npx tsx
/**
 * Backfill BYOK model health for all vaulted keys (or one user).
 *
 * Usage (from repo root — not dist/extension):
 *   npm run model-health:refresh
 *   npm run model-health:refresh -- --email you@example.com
 */
import dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

type Args = { email?: string };

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  let email: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--email" && argv[i + 1]) email = argv[++i];
  }
  return { email };
}

async function main() {
  const args = parseArgs();
  const { prisma } = await import("../lib/prisma");
  const { unvaultUserApiKey } = await import("../lib/vault/user-key-vault");
  const { refreshProviderModelHealth } = await import(
    "../lib/ai/model-health/refresh-provider-model-health"
  );
  const { isHandshakeProvider } = await import("../src/lib/config/career-grade-models");

  const where = args.email
    ? { user: { email: args.email } }
    : {};

  const rows = await prisma.userApiKey.findMany({
    where,
    select: {
      userId: true,
      provider: true,
      user: { select: { email: true } },
    },
  });

  if (rows.length === 0) {
    console.log(args.email ? `No vaulted keys for ${args.email}` : "No vaulted keys found");
    return;
  }

  console.log(`Refreshing model health for ${rows.length} key(s)...`);

  for (const row of rows) {
    if (!isHandshakeProvider(row.provider)) continue;
    const provider = row.provider;
    const apiKey = await unvaultUserApiKey(row.userId, provider);
    if (!apiKey) {
      console.log(`  skip ${row.user.email} / ${provider} — unvault failed`);
      continue;
    }

    try {
      const health = await refreshProviderModelHealth({
        userId: row.userId,
        provider,
        apiKey,
        traceId: "backfill-model-health",
      });
      console.log(
        `  ok ${row.user.email} / ${provider} — primary=${health.primaryModelId} healthy=${health.rankedModels.length}/${health.discoveredCount}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`  fail ${row.user.email} / ${provider} — ${message}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
