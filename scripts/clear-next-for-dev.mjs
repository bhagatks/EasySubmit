#!/usr/bin/env node
/**
 * Remove `.next` when it contains a production build (BUILD_ID).
 * Running `next dev` against that cache serves HTML but 404s JS/CSS chunks.
 */
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const nextDir = join(process.cwd(), ".next");
const buildId = join(nextDir, "BUILD_ID");

if (existsSync(buildId)) {
  rmSync(nextDir, { recursive: true, force: true });
  console.log("→ Cleared stale production .next cache before dev");
}
