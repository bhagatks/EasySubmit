#!/usr/bin/env node
import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const src = resolve(
  root,
  "node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs",
);
const dest = resolve(root, "public/pdf.worker.min.mjs");

if (!existsSync(src)) {
  console.warn("[copy-pdf-worker] pdfjs-dist worker not found — run npm install");
  process.exit(0);
}

copyFileSync(src, dest);
console.log("[copy-pdf-worker] public/pdf.worker.min.mjs");
