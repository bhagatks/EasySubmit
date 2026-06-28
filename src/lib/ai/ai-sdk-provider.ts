import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import {
  PROVIDER_REGISTRY,
  type AiProvider,
} from "@/src/lib/config/app.config";

/** Build a Vercel AI SDK model for BYOK execution — key must be scrubbed after use. */
export function createAiSdkLanguageModel(
  provider: AiProvider,
  apiKey: string,
  modelId: string,
): LanguageModel {
  const key = apiKey.trim();

  if (provider === "anthropic") {
    return createAnthropic({ apiKey: key })(modelId);
  }

  if (provider === "gemini") {
    // Default baseURL is https://generativelanguage.googleapis.com/v1beta
    return createGoogleGenerativeAI({ apiKey: key })(modelId);
  }

  const entry = PROVIDER_REGISTRY[provider];
  const openai = createOpenAI({
    apiKey: key,
    baseURL: `${entry.baseUrl}/v1`,
    ...(provider === "openrouter"
      ? {
          headers: {
            "HTTP-Referer": "https://easysubmit.ai",
            "X-Title": "EasySubmit",
          },
        }
      : {}),
  });

  return openai(modelId);
}
