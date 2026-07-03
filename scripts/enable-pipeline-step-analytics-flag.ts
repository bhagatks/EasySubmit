import { loadEnv, mergeEnv, LOCAL_ENV_FILE } from "./env-lib.mjs";
import { prisma } from "@/lib/prisma";

const KEY = "extension_apply_pipeline_step_analytics";
const DESCRIPTION =
  "PostHog extension_apply_pipeline_step events (dev and prod). Off when pipeline is stable.";

async function main(): Promise<void> {
  const { vars } = loadEnv(LOCAL_ENV_FILE);
  for (const [key, value] of Object.entries(mergeEnv(process.env, vars))) {
    if (value !== undefined) process.env[key] = value;
  }

  await prisma.featureFlag.upsert({
    where: { key: KEY },
    create: { key: KEY, enabled: true, description: DESCRIPTION },
    update: { enabled: true, description: DESCRIPTION },
  });

  const row = await prisma.featureFlag.findUnique({
    where: { key: KEY },
    select: { key: true, enabled: true },
  });

  console.log("✓ feature flag enabled:", row);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
