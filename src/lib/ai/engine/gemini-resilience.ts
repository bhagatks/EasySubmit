import { generateText } from "ai";
import { createAiSdkLanguageModel } from "@/src/lib/ai/ai-sdk-provider";
import type { AiProvider } from "@/src/lib/config/app.config";

/** Structured JD extract — light JSON via generateObject. */
export const GEMINI_JD_EXTRACT_MODEL = "gemini-2.5-flash-lite";

/** Heavy resume enhance passes — generateText. */
export const GEMINI_RESUME_PRIMARY_MODEL = "gemini-2.5-flash";

/** Fallback when primary flash is 503-overloaded. */
export const GEMINI_RESUME_FALLBACK_MODEL = "gemini-2.5-flash-lite";

/** Deprecated on v1beta — never route production calls here. */
export const GEMINI_DEPRECATED_JD_MODEL = "gemini-1.5-flash";

export const GEMINI_503_MAX_RETRIES = 5;
export const GEMINI_503_BACKOFF_MIN_MS = 2_000;
export const GEMINI_503_BACKOFF_MAX_MS = 45_000;

/** Cap combined system+user chars when falling back to flash-lite. */
export const GEMINI_LITE_FALLBACK_MAX_PROMPT_CHARS = 12_000;

/** Disable AI SDK default retries — we own 503 backoff in this module. */
export const GEMINI_SDK_MAX_RETRIES = 0;

/** Google provider options for structured JSON via generateObject. */
export const GEMINI_STRUCTURED_PROVIDER_OPTIONS = {
  google: { structuredOutputs: true as const },
};

export function isGeminiHighDemandError(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  if (status === 503) return true;
  const message = err instanceof Error ? err.message : String(err);
  return /high demand|experiencing high demand|overloaded|\b503\b|service unavailable|temporarily unavailable/i.test(
    message,
  );
}

/** Jittered exponential backoff: 2s → 4s → 8s → … capped at 45s. */
export function jitteredBackoffMs(attemptIndex: number): number {
  const exponential = GEMINI_503_BACKOFF_MIN_MS * 2 ** attemptIndex;
  const base = Math.min(GEMINI_503_BACKOFF_MAX_MS, exponential);
  const jitter = Math.floor(Math.random() * base * 0.25);
  return Math.min(GEMINI_503_BACKOFF_MAX_MS, base + jitter);
}

export function clipPromptForLiteFallback(
  system: string,
  prompt: string,
  maxChars: number = GEMINI_LITE_FALLBACK_MAX_PROMPT_CHARS,
): { system: string; prompt: string; clipped: boolean } {
  const total = system.length + prompt.length;
  if (total <= maxChars) {
    return { system, prompt, clipped: false };
  }
  const systemBudget = Math.min(system.length, Math.floor(maxChars * 0.2));
  const promptBudget = maxChars - systemBudget;
  return {
    system: system.slice(0, systemBudget),
    prompt: prompt.slice(0, promptBudget),
    clipped: true,
  };
}

export async function sleepMs(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export type GeminiTextResilienceResult = {
  text: string;
  tokensUsed: number;
  modelId: string;
  usedFallbackModel: boolean;
  clippedForFallback: boolean;
  retryCount: number;
};

/**
 * Gemini generateText with 503 backoff (up to 5 attempts) then flash-lite fallback
 * with a fresh retry budget (matches EasySubmitPipeline cascade behavior).
 * Non-Gemini providers: single call, no fallback.
 */
export async function generateGeminiTextWith503Resilience(input: {
  provider: AiProvider;
  apiKey: string;
  primaryModelId: string;
  fallbackModelId?: string;
  system: string;
  prompt: string;
  maxOutputTokens?: number;
  temperature?: number;
}): Promise<GeminiTextResilienceResult> {
  const fallbackModelId = input.fallbackModelId ?? GEMINI_RESUME_FALLBACK_MODEL;
  const genParams = {
    maxOutputTokens: input.maxOutputTokens ?? 8192,
    temperature: input.temperature ?? 0.1,
    maxRetries: GEMINI_SDK_MAX_RETRIES,
  };

  if (input.provider !== "gemini") {
    const model = createAiSdkLanguageModel(input.provider, input.apiKey, input.primaryModelId);
    const result = await generateText({
      model,
      system: input.system,
      prompt: input.prompt,
      ...genParams,
    });
    return {
      text: result.text,
      tokensUsed: result.usage?.totalTokens ?? 0,
      modelId: input.primaryModelId,
      usedFallbackModel: false,
      clippedForFallback: false,
      retryCount: 0,
    };
  }

  let attempts = 0;
  let currentModelId = input.primaryModelId;
  let system = input.system;
  let prompt = input.prompt;
  let usedFallbackModel = false;
  let clippedForFallback = false;

  while (attempts < GEMINI_503_MAX_RETRIES) {
    try {
      const model = createAiSdkLanguageModel("gemini", input.apiKey, currentModelId);
      const result = await generateText({
        model,
        system,
        prompt,
        ...genParams,
      });
      return {
        text: result.text,
        tokensUsed: result.usage?.totalTokens ?? 0,
        modelId: currentModelId,
        usedFallbackModel,
        clippedForFallback,
        retryCount: attempts,
      };
    } catch (err) {
      if (!isGeminiHighDemandError(err)) {
        throw err;
      }

      attempts++;
      if (attempts < GEMINI_503_MAX_RETRIES) {
        await sleepMs(jitteredBackoffMs(attempts - 1));
        continue;
      }

      if (currentModelId === input.primaryModelId && input.primaryModelId !== fallbackModelId) {
        usedFallbackModel = true;
        currentModelId = fallbackModelId;
        const clipped = clipPromptForLiteFallback(input.system, input.prompt);
        system = clipped.system;
        prompt = clipped.prompt;
        clippedForFallback = clipped.clipped;
        attempts = 0;
        continue;
      }

      throw err;
    }
  }

  throw new Error("Resume enhancement failed after maximum model allocation attempts.");
}
