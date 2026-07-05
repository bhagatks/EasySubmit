import { generateObject, generateText } from "ai";
import { z } from "zod";
import { createAiSdkLanguageModel } from "@/src/lib/ai/ai-sdk-provider";
import { mapEnhanceProviderError } from "@/src/lib/ai/engine/map-enhance-provider-error";
import type { HandshakeProvider } from "@/src/lib/config/career-grade-models";
import {
  MODEL_HEALTH_PROBE_MAX_OUTPUT_TOKENS,
  MODEL_HEALTH_PROBE_PROMPT,
  MODEL_HEALTH_STRUCTURED_PROBE_MAX_OUTPUT_TOKENS,
} from "@/lib/ai/model-health/constants";
import type { ModelProbeResult } from "@/lib/ai/model-health/types";

const healthSchema = z.object({ ok: z.literal(true) });

function summarizeProbeError(err: unknown): string {
  const mapped = mapEnhanceProviderError(err, { aiMode: "customer" });
  return mapped.rawMessage.slice(0, 240);
}

export async function probeModelCapabilities(input: {
  provider: HandshakeProvider;
  apiKey: string;
  modelId: string;
}): Promise<ModelProbeResult> {
  const model = createAiSdkLanguageModel(input.provider, input.apiKey, input.modelId);
  let textOk = false;
  let structuredOk = false;
  let lastError: string | null = null;

  try {
    await generateText({
      model,
      prompt: MODEL_HEALTH_PROBE_PROMPT,
      maxOutputTokens: MODEL_HEALTH_PROBE_MAX_OUTPUT_TOKENS,
      maxRetries: 0,
      temperature: 0,
    });
    textOk = true;
  } catch (err) {
    lastError = summarizeProbeError(err);
    return { text: false, structured: false, error: lastError };
  }

  try {
    await generateObject({
      model,
      prompt: 'Return JSON: {"ok": true}',
      schema: healthSchema,
      maxOutputTokens: MODEL_HEALTH_STRUCTURED_PROBE_MAX_OUTPUT_TOKENS,
      maxRetries: 0,
      temperature: 0,
    });
    structuredOk = true;
  } catch (err) {
    lastError = summarizeProbeError(err);
  }

  return {
    text: textOk,
    structured: structuredOk,
    error: structuredOk ? null : lastError,
  };
}
