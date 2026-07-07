#!/usr/bin/env npx tsx
/**
 * Probe all OpenRouter `:free` models against Case 001 enhance prompt slice.
 * Writes JSON report under tmp/openrouter-free-models-suite/.
 *
 *   npx tsx scripts/openrouter-free-models-suite.ts
 *   npx tsx scripts/openrouter-free-models-suite.ts --case 002 --attempts 2
 */
import dotenv from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

import { fetchOpenRouterFreeModelIds } from "@/lib/ai/openrouter/free-model-catalog";
import {
  ENHANCE_QA_CASES,
  type EnhanceQaCaseId,
} from "@/lib/job-tracker/enhance/enhance-qa-fixtures";
import {
  OPENROUTER_ATTRIBUTION_HEADERS,
  OPENROUTER_CHAT_COMPLETIONS_URL,
  OPENROUTER_FREE_MAX_PRICE,
} from "@/src/lib/ai/engine/openrouter-free-adapter";

import { resolveSystemOpenRouterApiKey } from "@/lib/ai/openrouter/resolve-system-openrouter-key";

type ProbeResult = {
  modelId: string;
  attempt: number;
  ok: boolean;
  durationMs: number;
  textLength: number;
  error?: string;
};

function parseArgs(argv: string[]) {
  const caseArg =
    argv.find((arg) => arg.startsWith("--case="))?.split("=")[1] ??
    argv[argv.indexOf("--case") + 1] ??
    "001";
  const caseId = caseArg as EnhanceQaCaseId;
  if (!ENHANCE_QA_CASES[caseId]) {
    throw new Error(`Unknown case ${caseArg}. Use 001, 002, or 003.`);
  }
  const attempts = Number(
    argv.find((arg) => arg.startsWith("--attempts="))?.split("=")[1] ??
      argv[argv.indexOf("--attempts") + 1] ??
      "1",
  );
  const limit = Number(
    argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1] ??
      argv[argv.indexOf("--limit") + 1] ??
      "0",
  );
  return {
    caseId,
    attempts: Number.isFinite(attempts) && attempts > 0 ? attempts : 1,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 0,
    outDir: join(process.cwd(), "tmp", "openrouter-free-models-suite"),
  };
}

async function resolveOpenRouterApiKey(): Promise<{ apiKey: string; source: "env" | "vault" }> {
  return resolveSystemOpenRouterApiKey();
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const qaCase = ENHANCE_QA_CASES[opts.caseId];
  const { apiKey, source } = await resolveOpenRouterApiKey();
  console.log(`OpenRouter key source: ${source}`);

  const modelIds = await fetchOpenRouterFreeModelIds({ apiKey });
  const selected = opts.limit > 0 ? modelIds.slice(0, opts.limit) : modelIds;
  console.log(`Probing ${selected.length} OpenRouter free models (case ${opts.caseId})…`);

  const system =
    "You are a resume enhancement assistant. Return concise JSON with keys summary, skillsAdded.";
  const prompt = `Target role: ${qaCase.targetRole}\n\nJD excerpt:\n${qaCase.jobDescription.slice(0, 1200)}\n\nReturn JSON only.`;

  const results: ProbeResult[] = [];
  for (const modelId of selected) {
    for (let attempt = 1; attempt <= opts.attempts; attempt += 1) {
      const startedAt = Date.now();
      try {
        const response = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            ...OPENROUTER_ATTRIBUTION_HEADERS,
          },
          body: JSON.stringify({
            model: modelId,
            messages: [
              { role: "system", content: system },
              { role: "user", content: prompt },
            ],
            max_tokens: 512,
            temperature: 0.1,
            response_format: { type: "json_object" },
            provider: { sort: "throughput" },
            models: [modelId],
            max_price: OPENROUTER_FREE_MAX_PRICE,
          }),
        });
        const payload = (await response.json()) as {
          model?: string;
          choices?: Array<{ message?: { content?: string | null } }>;
          error?: { message?: string };
        };
        const text = payload.choices?.[0]?.message?.content?.trim() ?? "";
        if (!response.ok) {
          throw new Error(payload.error?.message ?? `HTTP ${response.status}`);
        }
        results.push({
          modelId: payload.model ?? modelId,
          attempt,
          ok: Boolean(text),
          durationMs: Date.now() - startedAt,
          textLength: text.length,
        });
        process.stdout.write(text ? "." : "x");
      } catch (error) {
        results.push({
          modelId,
          attempt,
          ok: false,
          durationMs: Date.now() - startedAt,
          textLength: 0,
          error: error instanceof Error ? error.message : String(error),
        });
        process.stdout.write("E");
      }
    }
  }
  process.stdout.write("\n");

  mkdirSync(opts.outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = join(opts.outDir, `case-${opts.caseId}-${stamp}.json`);
  const summary = {
    caseId: opts.caseId,
    modelCount: selected.length,
    attempts: opts.attempts,
    ok: results.filter((r) => r.ok).length,
    fail: results.filter((r) => !r.ok).length,
    results,
  };
  writeFileSync(outPath, JSON.stringify(summary, null, 2));
  console.log(`Wrote ${outPath}`);
  console.log(`OK ${summary.ok} / ${results.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
