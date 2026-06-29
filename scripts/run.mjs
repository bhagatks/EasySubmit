#!/usr/bin/env node
/**
 * Command-specific env injection — never renames or mutates .env files at runtime.
 *
 *   node scripts/run.mjs dev
 *   node scripts/run.mjs deploy:prod
 *   node scripts/run.mjs admin -- <command...>   (ephemeral Vercel Production env)
 */
import { execSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  LOCAL_ENV_FILE,
  loadEnv,
  loadEphemeralVercelProductionEnv,
  mergeEnv,
  runCommand,
  spawnCommand,
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
  console.error("  node scripts/run.mjs dev");
  console.error("  node scripts/run.mjs deploy:prod");
  console.error("  node scripts/run.mjs admin -- <command...>");
  process.exit(1);
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

function runPosthogJourney(env, label) {
  console.log(`→ PostHog journey report (${label}, non-blocking)`);
  const result = spawnSync("npm", ["run", "posthog:journey"], {
    stdio: "inherit",
    env,
    cwd: root,
  });
  if (result.status !== 0) {
    console.log("⚠ PostHog journey report skipped (missing POSTHOG_PERSONAL_API_KEY or DB)");
  }
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
    console.log(`→ Dev server ready at ${loginUrl} (open manually)`);
    console.log("→ Extension: load unpacked from dist/extension (rebuilt each run easy)");
    console.log("→ Set EASY_OPEN_BROWSER=1 to auto-open incognito login");
  }
}

function runDev() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  EasySubmit · local dev");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  stopDevServers();
  const env = loadLocalDevEnv();

  assertSafeForDevServer(env);
  assertSafeForLocalMigrate(env);
  runValidateDatabase(env);

  console.log("→ prisma generate");
  runPrisma(["generate"], env);

  console.log("→ prisma migrate deploy (applies pending migrations, non-interactive)");
  runCommand(process.execPath, [resolve(root, "scripts/prisma-migrate-deploy.mjs")], env);

  console.log("→ Running tests");
  runCommand("npm", ["test"], env, { cwd: root });

  console.log("→ Building Chrome extension (dist/extension)");
  runCommand("npm", ["run", "build:extension"], env, { cwd: root });

  runPosthogJourney(env, "local dev");

  console.log(`→ Dev server (http://localhost:${port})`);
  const child = spawnCommand(
    "npx",
    ["next", "dev", "-p", port],
    { ...env, NODE_OPTIONS: env.NODE_OPTIONS ?? "--max-old-space-size=4096" },
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

function runDeployProd() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  EasySubmit · deploy production (Vercel)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  requireVercelCli();

  if (!existsSync(resolve(root, ".vercel/project.json"))) {
    console.log("→ Linking Vercel project (one-time)");
    spawnSync("npx", ["vercel", "link"], { stdio: "inherit", cwd: root });
  }

  console.log("→ Running tests");
  runCommand("npm", ["test"], process.env, { cwd: root });

  console.log("→ Building Chrome extension (dist/extension)");
  runCommand("npm", ["run", "build:extension"], process.env, { cwd: root });

  runPosthogJourney(process.env, "pre-deploy");

  console.log("→ Deploying to Vercel production (vercel-build runs prisma migrate deploy)");
  runCommand("npx", ["vercel", "deploy", "--prod"], process.env, { cwd: root });

  console.log("✔ Production deploy complete");
}

function runAdmin() {
  const sep = process.argv.indexOf("--");
  const cmd = sep >= 0 ? process.argv.slice(sep + 1) : [];
  if (cmd.length === 0) {
    console.error("Usage: node scripts/run.mjs admin -- <command...>");
    process.exit(1);
  }

  console.log("→ Loading Vercel Production env (ephemeral — no local file written)");
  const vercelVars = loadEphemeralVercelProductionEnv(root);
  const env = mergeEnv({ ...process.env }, vercelVars);
  runCommand(cmd[0], cmd.slice(1), env, { cwd: root });
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
