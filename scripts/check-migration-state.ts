import { prisma } from "../lib/prisma.ts";

async function main() {
  const migrations = await prisma.$queryRaw`
    SELECT migration_name, finished_at, rolled_back_at, logs
    FROM "_prisma_migrations"
    ORDER BY started_at
  `;

  const tables = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  `;

  const vaultFns = await prisma.$queryRaw`
    SELECT p.proname AS name
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname LIKE '%vault%'
    ORDER BY p.proname
  `;

  const userCols = await prisma.$queryRaw`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
    ORDER BY column_name
  `;

  console.log("MIGRATIONS:", JSON.stringify(migrations, null, 2));
  console.log(
    "TABLES:",
    tables.map((t) => t.tablename).join(", "),
  );
  console.log("VAULT_FNS:", vaultFns);
  console.log("USER_COLS:", userCols.map((c) => c.column_name).join(", "));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
