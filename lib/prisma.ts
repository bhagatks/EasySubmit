import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/** Supabase session pooler (5432) caps total clients (~15); serverless must use max 1 per instance. */
function poolMaxConnections(): number {
  if (process.env.VERCEL) return 1;
  if (process.env.NODE_ENV === "production") return 2;
  return 10;
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  if (process.env.NODE_ENV === "development") {
    try {
      const { hostname, username, port } = new URL(
        connectionString.replace(/^postgresql:/, "http:"),
      );
      console.info(`[prisma] ${username} @ ${hostname}:${port} (pool max ${poolMaxConnections()})`);
    } catch {
      // ignore malformed URL — Pool connect will surface the error
    }
  }

  const pool = new Pool({
    connectionString,
    max: poolMaxConnections(),
    idleTimeoutMillis: process.env.VERCEL ? 5_000 : 30_000,
    connectionTimeoutMillis: 10_000,
  });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;

/** @deprecated Prefer importing `prisma` directly. */
export function getPrisma() {
  return prisma;
}
