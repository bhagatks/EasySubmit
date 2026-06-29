#!/usr/bin/env node
/** Deploy only — migrations run on Vercel build (vercel-build). No env sync. */
import { execSync } from "node:child_process";

console.log("→ Deploying (vercel-build = prisma migrate deploy + next build)\n");
execSync("npx vercel deploy --prod", { stdio: "inherit" });
console.log("\n✔ Done — https://www.easysubmit.ai");
