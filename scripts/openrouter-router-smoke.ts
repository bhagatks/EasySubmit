#!/usr/bin/env npx tsx
/**
 * Hard-gate smoke for production OpenRouter path (`openrouter/free` router + adapter).
 *
 *   npx tsx scripts/openrouter-router-smoke.ts --case 001 --attempts 5
 */
import dotenv from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

import { resolveSystemOpenRouterApiKey } from "@/lib/ai/openrouter/resolve-system-openrouter-key";
import {
  ENHANCE_QA_CASES,
  type EnhanceQaCaseId,
} from "@/lib/job-tracker/enhance/enhance-qa-fixtures";
import { callOpenRouterFreeText } from "@/src/lib/ai/engine/openrouter-free-adapter";

function parseArgs(argv: string[]) {
  const caseArg =
    argv.find((a) => a.startsWith("--case="))?.split("=")[1] ??
    argv[argv.indexOf("--case") + 1] ??
    "001";
  const attempts = Number(
    argv.find((a) => a.startsWith("--attempts="))?.split("=")[1] ??
      argv[argv.indexOf("--attempts") + 1] ??
      "5",
  );
  const caseId = caseArg as EnhanceQaCaseId;
  if (!ENHANCE_QA_CASES[caseId]) {
    throw new Error(`Unknown case ${caseArg}`);
  }
  return {
    caseId,
    attempts: Number.isFinite(attempts) && attempts > 0 ? attempts : 5,
    outDir: join(process.cwd(), "tmp", "openrouter-free-models-suite"),
  };
}

function parseJsonObject(text: string): { ok: boolean; error?: string } {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) {
    return { ok: false, error: "no_json_object" };
  }
  try {
    JSON.parse(trimmed.slice(start, end + 1));
    return { ok: true };
  } catch {
    return { ok: false, error: "invalid_json" };
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const qaCase = ENHANCE_QA_CASES[opts.caseId];
  const { apiKey, source } = await resolveSystemOpenRouterApiKey();
  console.log(`OpenRouter key source: ${source}`);
  console.log(`Probing openrouter/free router (${opts.attempts} attempts, case ${opts.caseId})…`);

  const system =
    "You are a resume enhancement assistant. Return concise JSON with keys summary and skillsAdded.";
  const prompt = `Target role: ${qaCase.targetRole}\n\nJD excerpt:\n${qaCase.jobDescription.slice(0, 1200)}\n\nReturn JSON only.`;

  const results: Array<{
    attempt: number;
    ok: boolean;
    modelId: string;
    textLength: number;
    durationMs: number;
    parseOk: boolean;
    error?: string;
  }> = [];

  for (let attempt = 1; attempt <= opts.attempts; attempt += 1) {
    const startedAt = Date.now();
    try {
      const response = await callOpenRouterFreeText({
        apiKey,
        system,
        prompt,
        maxOutputTokens: 512,
        temperature: 0.1,
        traceId: `router-smoke-${opts.caseId}-${attempt}`,
      });
      const parsed = parseJsonObject(response.text);
      const ok = Boolean(response.text.trim()) && parsed.ok;
      results.push({
        attempt,
        ok,
        modelId: response.modelId,
        textLength: response.text.length,
        durationMs: Date.now() - startedAt,
        parseOk: parsed.ok,
        error: ok ? undefined : parsed.error ?? "empty_response",
      });
      process.stdout.write(ok ? "." : "x");
    } catch (error) {
      results.push({
        attempt,
        ok: false,
        modelId: "openrouter/free",
        textLength: 0,
        durationMs: Date.now() - startedAt,
        parseOk: false,
        error: error instanceof Error ? error.message : String(error),
      });
      process.stdout.write("E");
    }
  }
  process.stdout.write("\n");

  mkdirSync(opts.outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = join(opts.outDir, `router-smoke-${opts.caseId}-${stamp}.json`);
  const okCount = results.filter((r) => r.ok).length;
  const summary = {
    router: "openrouter/free",
    caseId: opts.caseId,
    attempts: opts.attempts,
    ok: okCount,
    fail: results.length - okCount,
    keySource: source,
    results,
  };
  writeFileSync(outPath, JSON.stringify(summary, null, 2));
  console.log(`Wrote ${outPath}`);
  console.log(`Router smoke: ${okCount}/${results.length} OK`);

  if (okCount < Math.ceil(opts.attempts * 0.6)) {
    console.error("Hard gate FAIL — openrouter/free router below 60% success.");
    process.exit(1);
  }
  console.log("Hard gate PASS — production router path acceptable.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
