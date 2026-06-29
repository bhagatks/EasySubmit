import { isProdDB } from "./env-lib.mjs";

const DESTRUCTIVE_ALLOW_FLAG = "EASYSUBMIT_ALLOW_DESTRUCTIVE_DB";

export function assertSafeForDevServer(env) {
  if (isProdDB(env.DATABASE_URL)) {
    console.error("❌ Refusing to start next dev against production DATABASE_URL.");
    console.error("   DATABASE_URL contains prod Supabase ref (yofgnflcqajqsepbfdkc).");
    console.error("   Fix .env.local to use your dev Supabase project.");
    process.exit(1);
  }
}

export function guardPrismaCommand(args, env) {
  const joined = args.join(" ").toLowerCase();
  const isReset = joined.includes("migrate reset") || args.includes("--force-reset");

  if (!isReset) {
    return;
  }

  if (isProdDB(env.DATABASE_URL)) {
    console.error("❌ Blocked: prisma migrate reset against production DATABASE_URL.");
    process.exit(1);
  }

  if (process.env[DESTRUCTIVE_ALLOW_FLAG] !== "1") {
    console.error(
      `❌ Blocked: destructive Prisma command requires ${DESTRUCTIVE_ALLOW_FLAG}=1 (local dev only).`,
    );
    process.exit(1);
  }
}

export function assertSafeForLocalMigrate(env) {
  if (isProdDB(env.DATABASE_URL)) {
    console.error("❌ Refusing local prisma migrate against production DATABASE_URL.");
    console.error("   Production migrations run on Vercel via vercel-build.");
    process.exit(1);
  }
}
