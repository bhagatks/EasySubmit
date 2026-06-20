import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  if (process.env.NODE_ENV === "development") {
    try {
      const { hostname, username } = new URL(connectionString);
      console.info(`[prisma] ${username} @ ${hostname}`);
    } catch {
      // ignore malformed URL — Pool connect will surface the error
    }
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/** @deprecated Prefer importing `prisma` directly. */
export function getPrisma() {
  return prisma;
}
