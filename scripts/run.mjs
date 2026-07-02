#!/usr/bin/env node
/**
 * Command-specific env injection — never renames or mutates .env files at runtime.
 *
 *   node scripts/run.mjs dev [--fast]
 *   node scripts/run.mjs deploy:prod [--fast]
 *   node scripts/run.mjs admin -- <command...>   (ephemeral Vercel Production env)
 */
import { execSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEV_SUPABASE_REF,
  LOCAL_ENV_FILE,
  PROD_SUPABASE_REF,
  isProdDB,
  loadEnv,
  mergeEnv,
  runCommand,
  spawnCommand,
  withNodeMemoryLimit,
} from "./env-lib.mjs";
import {
  assertSafeForDevServer,
  assertSafeForLocalMigrate,
  guardPrismaCommand,
} from "./db-safety.mjs";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const mode = process.argv[2];
const port = process.env.PORT ?? "3000";

function usage() {
  console.error("Usage:");
  console.error("  node scripts/run.mjs dev [--fast]");
  console.error("  node scripts/run.mjs deploy:prod [--fast]");
  console.error("  node scripts/run.mjs admin -- <command...>");
  process.exit(1);
}

function extractSupabaseRef(env) {
  const databaseUrl = env.DATABASE_URL;
  const supabasePublicUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabasePublicUrl) {
    const m = supabasePublicUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (m?.[1]) return m[1];
  }
  if (databaseUrl) {
    const userMatch = databaseUrl.match(/postgres\.([^:]+):/);
    if (userMatch?.[1]) return userMatch[1];
    const hostMatch = databaseUrl.match(/db\.([^.]+)\.supabase\.co/);
    if (hostMatch?.[1]) return hostMatch[1];
  }
  return null;
}

function printDevEnvTarget(env) {
  const ref = extractSupabaseRef(env);
  const loginUrl = `http://localhost:${port}/login`;
  console.log(`→ Env: ${LOCAL_ENV_FILE} (injected, never written to disk)`);
  if (isProdDB(env.DATABASE_URL)) {
    console.log(`→ ❌ DATABASE_URL targets prod ${PROD_SUPABASE_REF} — blocked`);
    return;
  }
  if (ref === DEV_SUPABASE_REF) {
    console.log(`→ Dev Supabase: ${ref} (EasySubmitQA)`);
  } else if (ref) {
    console.log(`→ Supabase ref: ${ref} (expected dev ${DEV_SUPABASE_REF})`);
  }
  console.log(`→ App: ${loginUrl}`);
  console.log("→ Extension dev: dist/extension-dev/ (main Chrome profile, localhost:3000)");
  console.log("→ Extension prod: dist/extension/ (separate Chrome profile, easysubmit.ai)");
}

function clearStaleShellDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    delete process.env.DATABASE_URL;
    console.log("→ Cleared stale shell DATABASE_URL");
  }
}

function stopDevServers() {
  try {
    const pids = execSync(`lsof -ti tcp:${port} 2>/dev/null || true`, { encoding: "utf8" }).trim();
    if (pids) {
      console.log(`→ Stopping existing server on port ${port}`);
      execSync(`kill ${pids.split("\n").join(" ")} 2>/dev/null || true`);
    }
  } catch {
    // ignore
  }

  if (existsSync(resolve(root, ".next/BUILD_ID"))) {
    console.log("→ Clearing stale production .next cache (conflicts with next dev)");
    execSync("rm -rf .next", { cwd: root });
  }
}

function bootstrapLocalEnv() {
  runCommand(process.execPath, [resolve(root, "scripts/setup-env.mjs")], process.env);
}

function loadLocalDevEnv() {
  clearStaleShellDatabaseUrl();
  bootstrapLocalEnv();
  const { path, vars } = loadEnv(LOCAL_ENV_FILE);
  if (!existsSync(path)) {
    console.error(`❌ Missing ${LOCAL_ENV_FILE} after bootstrap`);
    process.exit(1);
  }
  return mergeEnv({ ...process.env }, vars);
}

function runValidateDatabase(env) {
  runCommand(process.execPath, [resolve(root, "scripts/validate-database-url.mjs")], env);
}

function runPrisma(args, env) {
  guardPrismaCommand(["prisma", ...args], env);
  runCommand("npx", ["prisma", ...args], env, { cwd: root });
}

async function waitForDevServer(child, env) {
  const loginUrl = `http://localhost:${port}/login`;
  let attempt = 0;
  let exited = false;
  let exitCode = 0;

  child.on("exit", (code) => {
    exited = true;
    exitCode = code ?? 0;
  });

  while (attempt < 60 && !exited) {
    try {
      execSync(`curl -sf -o /dev/null "${loginUrl}"`, { stdio: "ignore" });
      break;
    } catch {
      attempt += 1;
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  if (exited) {
    process.exit(exitCode);
  }

  if (env.EASY_OPEN_BROWSER === "1") {
    runCommand(process.execPath, [resolve(root, "scripts/post-start.mjs"), "--port", port], env);
  } else {
    console.log(`→ Dev server ready at ${loginUrl}`);
  }
}

function runDev() {
  const fast = process.argv.includes("--fast");

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(fast ? "  EasySubmit · local dev (fast)" : "  EasySubmit · local dev");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Secrets: .env.local only — prod lives in Vercel Dashboard\n");

  console.log("1/6 Preflight");
  stopDevServers();
  const env = loadLocalDevEnv();
  printDevEnvTarget(env);

  console.log("\n2/6 Database safety");
  assertSafeForDevServer(env);
  assertSafeForLocalMigrate(env);
  runValidateDatabase(env);

  console.log("\n3/6 Prisma generate + migrate deploy");
  runPrisma(["generate"], env);
  runCommand(process.execPath, [resolve(root, "scripts/prisma-migrate-deploy.mjs")], env);

  if (!fast) {
    console.log("\n4/6 Tests");
    runCommand("npm", ["test"], withNodeMemoryLimit(env, 4096), { cwd: root });
  } else {
    console.log("\n4/6 Skipped (--fast): tests");
  }

  console.log("\n5/6 Extension builds (dev + prod QA)");
  runCommand("npm", ["run", "build:extensions"], env, { cwd: root });

  console.log(`\n6/6 Dev server (http://localhost:${port})`);
  console.log("   Set EASY_OPEN_BROWSER=1 to auto-open incognito login");
  const child = spawnCommand(
    "npx",
    ["next", "dev", "-p", port],
    withNodeMemoryLimit(env, 8192),
    { cwd: root },
  );

  child.on("exit", (code) => process.exit(code ?? 0));
  void waitForDevServer(child, env);
}

function requireVercelCli() {
  try {
    execSync("vercel --version", { stdio: "ignore" });
  } catch {
    try {
      execSync("npx vercel --version", { stdio: "ignore" });
    } catch {
      console.error("❌ Vercel CLI not found. Install: npm i -g vercel");
      process.exit(1);
    }
  }
}

function warnGitPreflight() {
  try {
    const branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8", cwd: root }).trim();
    if (branch !== "main") {
      console.log(`⚠ Branch is "${branch}" (not main) — push to main for Git-linked auto-deploy`);
    }
    const dirty = execSync("git status --porcelain", { encoding: "utf8", cwd: root }).trim();
    if (dirty) {
      console.log("⚠ Uncommitted changes — Vercel CLI uploads your working tree, not only the last commit");
    }
  } catch {
    // not a git repo
  }
}

function runDeployProd() {
  const fast = process.argv.includes("--fast");

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(fast ? "  EasySubmit · deploy production (fast)" : "  EasySubmit · deploy production (Vercel)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Prod secrets: Vercel Dashboard → Production (never synced from this command)\n");

  console.log("1/5 Preflight");
  warnGitPreflight();
  requireVercelCli();

  if (!existsSync(resolve(root, ".vercel/project.json"))) {
    console.log("→ Linking Vercel project (one-time)");
    runCommand(
      "npx",
      ["vercel", "link", "--project", "project-easy-submit", "--yes"],
      process.env,
      { cwd: root },
    );
  }

  if (!fast) {
    console.log("\n2/5 Tests");
    runCommand("npm", ["test"], withNodeMemoryLimit(process.env, 4096), { cwd: root });

    console.log("\n3/5 Prisma validate (schema + prisma.config.ts)");
    const validateEnv = {
      ...process.env,
      DATABASE_URL:
        process.env.DATABASE_URL?.trim() ||
        "postgresql://ci:ci@127.0.0.1:5432/ci?schema=public",
      DIRECT_URL:
        process.env.DIRECT_URL?.trim() ||
        "postgresql://ci:ci@127.0.0.1:5432/ci?schema=public",
    };
    runCommand("npx", ["prisma", "validate"], validateEnv, { cwd: root });
  } else {
    console.log("\n2–3/5 Skipped (--fast): tests + prisma validate");
  }

  console.log("\n4/5 Deploy");
  console.log("→ npx vercel deploy --prod --yes --force");
  console.log(
    "   On Vercel: prisma generate → migrate deploy (DIRECT_URL) → validate analytics env → next build",
  );
  runCommand("npx", ["vercel", "deploy", "--prod", "--yes", "--force"], process.env, { cwd: root });

  console.log("\n5/5 Smoke test");
  runCommand(process.execPath, [resolve(root, "scripts/verify-prod-posthog-live.mjs")], process.env, {
    cwd: root,
  });
  console.log("✔ Production deploy complete — https://www.easysubmit.ai/login");
  console.log("  Extension store: GitHub Actions (not this command) — see docs/DEPLOYMENT.md");
}

function runAdmin() {
  const sep = process.argv.indexOf("--");
  const cmd = sep >= 0 ? process.argv.slice(sep + 1) : [];
  if (cmd.length === 0) {
    console.error("Usage: node scripts/run.mjs admin -- <command...>");
    process.exit(1);
  }

  requireVercelCli();

  if (!existsSync(resolve(root, ".vercel/project.json"))) {
    console.log("→ Linking Vercel project (one-time)");
    runCommand(
      "npx",
      ["vercel", "link", "--project", "project-easy-submit", "--yes"],
      process.env,
      { cwd: root },
    );
  }

  console.log("→ Running with Vercel Production env (vercel env run)");
  runCommand("npx", ["vercel", "env", "run", "-e", "production", "--", ...cmd], process.env, {
    cwd: root,
  });
}

switch (mode) {
  case "dev":
    runDev();
    break;
  case "deploy:prod":
    runDeployProd();
    break;
  case "admin":
    runAdmin();
    break;
  default:
    usage();
}
