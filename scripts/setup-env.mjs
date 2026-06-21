#!/usr/bin/env node
/**
 * Prepare .env.local for `run easy` — prod secrets stay on Vercel only.
 */
import {
  existsSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  realpathSync,
  lstatSync,
  unlinkSync,
} from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const envFile = ".env.local";
const example = ".env.example";
const legacySources = [".env.qa.local"];
const redundantLocal = [".env", ...legacySources];

function log(msg) {
  console.log(msg);
}

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function parseEnv(text) {
  const entries = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      entries.push({ type: "raw", line });
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      entries.push({ type: "raw", line });
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    entries.push({ type: "kv", key, value, line });
  }
  return entries;
}

function envMap(entries) {
  const map = new Map();
  for (const e of entries) {
    if (e.type === "kv") map.set(e.key, e.value);
  }
  return map;
}

function isPlaceholder(value) {
  if (!value) return true;
  return (
    value.includes("[PASSWORD]") ||
    value.includes("your-") ||
    value === "password" ||
    value === "generate-a-random-secret"
  );
}

function writeEnvFromEntries(path, entries) {
  writeFileSync(path, `${entries.map((e) => e.line).join("\n").replace(/\n?$/, "")}\n`);
}

function mergeMissingKeys(targetPath, examplePath) {
  if (!existsSync(examplePath)) return;
  const targetEntries = parseEnv(readFileSync(targetPath, "utf8"));
  const exampleMap = envMap(parseEnv(readFileSync(examplePath, "utf8")));
  const targetMap = envMap(targetEntries);
  const keys = new Set(targetEntries.filter((e) => e.type === "kv").map((e) => e.key));
  let changed = false;

  for (const [key, value] of exampleMap) {
    if (keys.has(key)) continue;
    targetEntries.push({ type: "kv", key, value, line: `${key}=${value}` });
    changed = true;
  }

  for (const entry of targetEntries) {
    if (entry.type !== "kv") continue;
    const current = targetMap.get(entry.key);
    if (current !== undefined && !isPlaceholder(current)) continue;
    const fromExample = exampleMap.get(entry.key);
    if (fromExample && !isPlaceholder(fromExample)) {
      entry.value = fromExample;
      entry.line = `${entry.key}=${fromExample}`;
      changed = true;
    }
  }

  if (changed) {
    writeEnvFromEntries(targetPath, targetEntries);
    log(`→ Merged new keys from ${example} into ${envFile}`);
  }
}

function flattenSymlinkSync(path) {
  if (!existsSync(path)) return false;
  let stat;
  try {
    stat = lstatSync(path);
  } catch {
    return false;
  }
  if (!stat.isSymbolicLink()) return false;
  const target = realpathSync(path);
  const tmp = `${path}.tmp`;
  copyFileSync(target, tmp);
  unlinkSync(path);
  copyFileSync(tmp, path);
  unlinkSync(tmp);
  log(`→ Flattened ${path} (was symlink → ${target.split("/").pop()})`);
  return true;
}

function removeRedundantEnvFiles() {
  for (const file of redundantLocal) {
    const path = resolve(root, file);
    if (!existsSync(path)) continue;
    unlinkSync(path);
    log(`→ Removed redundant env file: ${file} (use .env.local only)`);
  }
}

function ensureEnvFile() {
  const envPath = resolve(root, envFile);
  const examplePath = resolve(root, example);

  if (!existsSync(envPath)) {
    for (const legacyFile of legacySources) {
      const legacyPath = resolve(root, legacyFile);
      if (existsSync(legacyPath)) {
        copyFileSync(legacyPath, envPath);
        unlinkSync(legacyPath);
        log(`→ Created ${envFile} from legacy ${legacyFile} (removed ${legacyFile})`);
        break;
      }
    }
  }

  if (!existsSync(envPath)) {
    if (!existsSync(examplePath)) {
      fail(`Missing ${envFile} and ${example}`);
    }
    copyFileSync(examplePath, envPath);
    log(`→ Created ${envFile} from ${example}`);
  }

  flattenSymlinkSync(envPath);
  mergeMissingKeys(envPath, examplePath);

  const map = envMap(parseEnv(readFileSync(envPath, "utf8")));
  const dbUrl = map.get("DATABASE_URL");

  if (!dbUrl || isPlaceholder(dbUrl)) {
    fail(
      `DATABASE_URL in ${envFile} is missing or still a placeholder.\n` +
        `   One-time fix: Supabase Dashboard → Database → Connection string → URI → Session\n` +
        `   Paste into ${envFile}, then run easy again.`,
    );
  }

  log(`→ Env ready (local: ${envFile})`);
}

ensureEnvFile();
removeRedundantEnvFiles();
