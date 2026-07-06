import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import {
  getOpenAiCompatChatBaseUrl,
  type AiProvider,
} from "@/src/lib/config/app.config";

/** Build a Vercel AI SDK model for BYOK execution — key must be scrubbed after use. */
export function createAiSdkLanguageModel(
  provider: AiProvider,
  apiKey: string,
  modelId: string,
  options?: { customEndpointUrl?: string | null },
): LanguageModel {
  const key = apiKey.trim();

  if (provider === "anthropic") {
    return createAnthropic({ apiKey: key })(modelId);
  }

  if (provider === "gemini") {
    // Default baseURL is https://generativelanguage.googleapis.com/v1beta
    return createGoogleGenerativeAI({ apiKey: key })(modelId);
  }

  const openai = createOpenAI({
    apiKey: key,
    baseURL: getOpenAiCompatChatBaseUrl(provider, options?.customEndpointUrl),
    ...(provider === "openrouter"
      ? {
          headers: {
            "HTTP-Referer": "https://easysubmit.ai",
            "X-OpenRouter-Title": "EasySubmit Application Suite",
            "X-Title": "EasySubmit",
          },
        }
      : {}),
  });

  return openai.chat(modelId);
}
