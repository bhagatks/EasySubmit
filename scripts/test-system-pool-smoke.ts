#!/usr/bin/env npx tsx
/**
 * Smoke-test system key pool — confirms BYOK tier work did not alter system routing.
 */
import dotenv from "dotenv";
import { generateText } from "ai";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function main() {
  const { getAppConfig } = await import("../src/lib/services/config-service");
  const { executeWithPoolRetry } = await import("../src/lib/ai/engine/system-key-pool");
  const { createAiSdkLanguageModel } = await import("../src/lib/ai/ai-sdk-provider");
  const { resolveSystemResumeModel } = await import("../src/lib/ai/engine/system-model-defaults");

  const cfg = await getAppConfig("aiEngine");
  const expectedModel = resolveSystemResumeModel(cfg.system.provider, cfg.system.modelId);

  console.log("\n=== system pool config ===");
  console.log({
    provider: cfg.system.provider,
    configuredModelId: cfg.system.modelId,
    resolvedResumeModel: expectedModel,
    jdExtractModel: cfg.system.jdExtractionModelId,
  });

  console.log("\n=== live pool call (max_tokens=1) ===");
  const startedAt = Date.now();

  try {
    const result = await executeWithPoolRetry(
      async ({ apiKey, modelId, provider, slot }) => {
        const model = createAiSdkLanguageModel(provider, apiKey, modelId);
        const text = await generateText({
          model,
          prompt: "Reply OK",
          maxOutputTokens: 4,
          temperature: 0,
          maxRetries: 0,
        });
        return { text: text.text, modelId, provider, slot };
      },
      { config: cfg },
    );

    console.log({
      ok: true,
      durationMs: Date.now() - startedAt,
      slot: result.slot,
      label: result.label,
      provider: result.provider,
      modelId: result.modelId,
      billingMode: result.billingMode,
      keySource: result.keySource,
      responsePreview: result.result.text.slice(0, 40),
      modelMatchesConfig: result.modelId === expectedModel || result.modelId === cfg.system.modelId,
    });
  } catch (error) {
    console.log({
      ok: false,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
      code: (error as { code?: string }).code ?? null,
    });
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
