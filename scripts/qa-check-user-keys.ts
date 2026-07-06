#!/usr/bin/env npx tsx
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

import { prisma } from "@/lib/prisma";

const email = process.argv[2] ?? "bhagathsiddi@gmail.com";

async function main() {
  const u = await prisma.user.findUnique({
    where: { email },
    select: { id: true, vaultKeyId: true, activeProvider: true, aiSourcePreference: true },
  });
  console.log("user", u);
  if (!u) return;
  const keys = await prisma.userApiKey.findMany({
    where: { userId: u.id },
    select: { provider: true, vaultSecretId: true, customEndpointUrl: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
  console.log("keys", keys);
}

main()
  .finally(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
