#!/usr/bin/env npx tsx
/**
 * Live smoke: JD structured extract through the system key pool (OpenRouter → DeepSeek).
 */
import dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function main() {
  const { getAppConfig } = await import("../src/lib/services/config-service");
  const { executeWithPoolRetry } = await import("../src/lib/ai/engine/system-key-pool");
  const { createAiSdkLanguageModel } = await import("../src/lib/ai/ai-sdk-provider");
  const {
    generateStructuredWithFallback,
    parseJsonObjectFromModelText,
  } = await import("../src/lib/ai/engine/structured-extract");
  const { callOpenRouterFreeStructured } = await import("../src/lib/ai/engine/openrouter-free-adapter");
  const { JD_EXTRACTION_TIMEOUT_MS } = await import("../lib/job-tracker/jd/resolve-jd-extraction-model");
  const { jdAiExtractSchema } = await import("../lib/job-tracker/jd/jd-ai-extract-schema");

  const cfg = await getAppConfig("aiEngine");
  const system = "You are an expert technical recruiter. Extract structured job intelligence.";
  const prompt = `Target role: Senior Manager, Software Engineering

REQUIREMENTS:
"""
5+ years leading engineering teams. Experience with AWS, Java, Angular. Agile delivery.
"""

Return JSON with mustHaveSkills, preferredSkills, summaryTheme, emphasisAreas.`;

  const poolResult = await executeWithPoolRetry(
    async ({ apiKey, provider, billingMode, slot, modelId }) => {
      if (provider === "openrouter" && billingMode === "free") {
        return callOpenRouterFreeStructured({
          apiKey,
          system,
          prompt,
          maxOutputTokens: 1024,
          timeoutMs: JD_EXTRACTION_TIMEOUT_MS,
          traceId: "pool-jd-smoke",
          parse: (text) => jdAiExtractSchema.parse(parseJsonObjectFromModelText(text)),
        });
      }
      const model = createAiSdkLanguageModel(provider, apiKey, modelId);
      const result = await generateStructuredWithFallback({
        model,
        provider,
        system,
        prompt,
        schema: jdAiExtractSchema,
        maxOutputTokens: 1024,
        timeoutMs: JD_EXTRACTION_TIMEOUT_MS,
      });
      return {
        object: result.object,
        tokensUsed: result.tokensUsed,
        modelId,
      };
    },
    { config: cfg },
  );

  console.log({
    ok: true,
    slot: poolResult.slot,
    label: poolResult.label,
    provider: poolResult.provider,
    mustHaveSkills: poolResult.result.object.mustHaveSkills?.slice(0, 5),
  });
}

main().catch((err) => {
  console.error({ ok: false, error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
