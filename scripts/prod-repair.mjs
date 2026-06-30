#!/usr/bin/env node
/** Deploy only — skip local tests/typecheck. Same as `run easy prod fast`. */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const result = spawnSync(process.execPath, [resolve(root, "scripts/run.mjs"), "deploy:prod", "--fast"], {
  stdio: "inherit",
  cwd: root,
});
process.exit(result.status ?? 1);
