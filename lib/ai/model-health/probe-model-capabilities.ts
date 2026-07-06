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

/** Providers where structured json_schema probe is unreliable — text probe is sufficient. */
const TEXT_ONLY_HEALTH_PROVIDERS = new Set<HandshakeProvider>(["groq", "deepseek"]);

const healthSchema = z.object({ ok: z.boolean() });

export function probeCountsAsHealthy(
  provider: HandshakeProvider,
  probes: Pick<ModelProbeResult, "text" | "structured">,
): boolean {
  if (!probes.text) return false;
  if (probes.structured) return true;
  return TEXT_ONLY_HEALTH_PROVIDERS.has(provider);
}

function summarizeProbeError(err: unknown): string {
  const mapped = mapEnhanceProviderError(err, { aiMode: "customer" });
  return mapped.rawMessage.slice(0, 240);
}

export async function probeModelCapabilities(input: {
  provider: HandshakeProvider;
  apiKey: string;
  modelId: string;
  skipTextProbe?: boolean;
  customEndpointUrl?: string | null;
}): Promise<ModelProbeResult & { lastLatencyMs: number }> {
  const model = createAiSdkLanguageModel(input.provider, input.apiKey, input.modelId, {
    customEndpointUrl: input.customEndpointUrl,
  });
  let textOk = false;
  let structuredOk = false;
  let lastError: string | null = null;
  let lastLatencyMs = 0;

  const skipText =
    input.skipTextProbe === true || input.provider === "gemini";

  if (!skipText) {
    const textStartedAt = Date.now();
    try {
      await generateText({
        model,
        prompt: MODEL_HEALTH_PROBE_PROMPT,
        maxOutputTokens: MODEL_HEALTH_PROBE_MAX_OUTPUT_TOKENS,
        maxRetries: 0,
        temperature: 0,
      });
      textOk = true;
      lastLatencyMs = Date.now() - textStartedAt;
    } catch (err) {
      lastError = summarizeProbeError(err);
      lastLatencyMs = Date.now() - textStartedAt;
      return { text: false, structured: false, error: lastError, lastLatencyMs };
    }
  } else {
    textOk = true;
  }

  const structuredStartedAt = Date.now();
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
    lastLatencyMs = Math.max(lastLatencyMs, Date.now() - structuredStartedAt);
  } catch (err) {
    lastError = summarizeProbeError(err);
    lastLatencyMs = Math.max(lastLatencyMs, Date.now() - structuredStartedAt);
  }

  return {
    text: textOk,
    structured: structuredOk,
    error: structuredOk ? null : lastError,
    lastLatencyMs,
  };
}
