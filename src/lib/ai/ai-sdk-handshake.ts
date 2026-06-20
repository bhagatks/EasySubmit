import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { APICallError } from "@ai-sdk/provider";
import {
  PROVIDER_REGISTRY,
  type AiProvider,
} from "@/src/lib/config/app.config";

const VERIFY_PROMPT = "Reply with the single word OK.";

const VERIFY_MODEL: Record<AiProvider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-haiku-latest",
  gemini: "gemini-2.0-flash",
  groq: "llama-3.3-70b-versatile",
  deepseek: "deepseek-chat",
  openrouter: "openai/gpt-4o-mini",
};

export type AiSdkVerifyErrorCode =
  | "missing_key"
  | "invalid_key"
  | "forbidden"
  | "rate_limited"
  | "insufficient_quota"
  | "provider_error"
  | "network_error";

export type AiSdkVerifyResult =
  | { ok: true }
  | { ok: false; code: AiSdkVerifyErrorCode; message: string };

function mapAiSdkFailure(error: unknown): AiSdkVerifyResult {
  if (error instanceof APICallError) {
    const status = error.statusCode ?? 0;
    const message = error.message || "Provider rejected the API key.";

    if (status === 401) {
      return { ok: false, code: "invalid_key", message };
    }
    if (status === 403) {
      return { ok: false, code: "forbidden", message };
    }
    if (status === 402) {
      return { ok: false, code: "insufficient_quota", message };
    }
    if (status === 429) {
      return { ok: false, code: "rate_limited", message };
    }

    return { ok: false, code: "provider_error", message };
  }

  if (error instanceof Error) {
    if (/fetch|network|ENOTFOUND|ECONNREFUSED/i.test(error.message)) {
      return {
        ok: false,
        code: "network_error",
        message: "Could not reach the provider. Check your connection and try again.",
      };
    }

    return { ok: false, code: "provider_error", message: error.message };
  }

  return {
    ok: false,
    code: "provider_error",
    message: "Provider returned an unexpected error during handshake.",
  };
}

/**
 * Minimal Vercel AI SDK handshake — confirms the BYOK key can invoke a model.
 * The key is never logged and must be scrubbed by the caller after use.
 */
export async function verifyApiKeyWithAiSdk(
  provider: AiProvider,
  apiKey: string,
): Promise<AiSdkVerifyResult> {
  const key = apiKey.trim();
  if (!key) {
    return { ok: false, code: "missing_key", message: "API key is required." };
  }

  try {
    const modelId = VERIFY_MODEL[provider];

    if (provider === "anthropic") {
      const anthropic = createAnthropic({ apiKey: key });
      await generateText({
        model: anthropic(modelId),
        prompt: VERIFY_PROMPT,
        maxOutputTokens: 1,
      });
      return { ok: true };
    }

    if (provider === "gemini") {
      const google = createGoogleGenerativeAI({ apiKey: key });
      await generateText({
        model: google(modelId),
        prompt: VERIFY_PROMPT,
        maxOutputTokens: 1,
      });
      return { ok: true };
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

    await generateText({
      model: openai(modelId),
      prompt: VERIFY_PROMPT,
      maxOutputTokens: 1,
    });

    return { ok: true };
  } catch (error) {
    return mapAiSdkFailure(error);
  }
}
