#!/usr/bin/env node
/**
 * After dev server is listening: open incognito login (fresh OAuth session).
 */
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const port = getArg("port", "3000");
const loginUrl = `http://localhost:${port}/login`;

async function waitForServer(maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const res = await fetch(`http://localhost:${port}/`, { redirect: "manual" });
      if (res.ok || res.status === 307 || res.status === 308) return true;
    } catch {
      // not ready
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function openIncognito(url) {
  if (process.platform !== "darwin") {
    try {
      execSync(`xdg-open "${url}"`, { stdio: "ignore" });
    } catch {
      console.log(`→ Open ${url} in your browser`);
    }
    return;
  }

  for (const app of ["Google Chrome", "Chromium", "Arc"]) {
    try {
      execSync(`open -na "${app}" --args --incognito "${url}"`, { stdio: "ignore" });
      console.log(`→ Opened ${app} (incognito) → ${url}`);
      return;
    } catch {
      // try next browser
    }
  }

  execSync(`open "${url}"`, { stdio: "ignore" });
  console.log(`→ Opened browser → ${url}`);
}

const ready = await waitForServer();
if (!ready) {
  console.log("→ Server slow to start — skip browser open");
  process.exit(0);
}

try {
  await fetch(`http://localhost:${port}/api/auth/signout`, { redirect: "manual" });
} catch {
  // ignore
}

openIncognito(loginUrl);
console.log("→ Fresh incognito session avoids stale OAuth cookies");
