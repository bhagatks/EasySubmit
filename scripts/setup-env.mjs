#!/usr/bin/env node
/**
 * One-time bootstrap: create .env.local from .env.example when missing.
 * Does not rename, merge, or delete other env files at runtime.
 */
import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const envFile = ".env.local";
const example = ".env.example";

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

const envPath = resolve(root, envFile);
const examplePath = resolve(root, example);

if (!existsSync(envPath)) {
  if (!existsSync(examplePath)) {
    fail(`Missing ${envFile} and ${example}`);
  }
  copyFileSync(examplePath, envPath);
  console.log(`→ Created ${envFile} from ${example}`);
  console.log(`   Edit ${envFile} (DATABASE_URL, DIRECT_URL, OAuth) then run npm run dev`);
} else {
  console.log(`→ ${envFile} present`);
}
