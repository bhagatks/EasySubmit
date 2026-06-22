import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { APICallError } from "@ai-sdk/provider";
import {
  GEMINI_ACCOUNT_BLOCKED_MESSAGE,
  isGeminiProjectDeniedMessage,
} from "@/src/lib/ai/gemini-access-messages";
import {
  PROVIDER_REGISTRY,
  type AiProvider,
} from "@/src/lib/config/app.config";

const VERIFY_PROMPT = "Reply with the single word OK.";

const VERIFY_MODEL: Record<AiProvider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-haiku-latest",
  gemini: "gemini-2.5-flash",
  groq: "llama-3.3-70b-versatile",
  deepseek: "deepseek-chat",
  openrouter: "openai/gpt-4o-mini",
};

/** Models to try when verifying Gemini BYOK — newest first. */
const GEMINI_VERIFY_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
] as const;

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

function isQuotaOrBillingFailure(message: string): boolean {
  return /spending cap|quota|billing|exceeded.*(limit|cap)|insufficient.*(quota|credit|balance)/i.test(
    message,
  );
}

function summarizeGeminiQuotaError(message: string): string | null {
  if (!/free_tier|generativelanguage\.googleapis\.com/i.test(message)) {
    return null;
  }

  if (/limit:\s*0/i.test(message)) {
    return (
      "Gemini free tier is not active for this API key project (limit: 0). " +
      "Link a billing account to the Google Cloud project behind the key in AI Studio / Cloud Console — " +
      "free-tier quotas often stay at zero until billing is linked. " +
      "Check rate limits under AI Studio → API keys. " +
      "Docs: https://ai.google.dev/gemini-api/docs/rate-limits"
    );
  }

  return null;
}

function normalizeProviderFailureMessage(message: string): string {
  return summarizeGeminiQuotaError(message) ?? message;
}

function mapAiSdkFailure(error: unknown): AiSdkVerifyResult {
  if (error instanceof APICallError) {
    const status = error.statusCode ?? 0;
    const message = error.message || "Provider rejected the API key.";

    if (status === 401) {
      return { ok: false, code: "invalid_key", message };
    }
    if (status === 403) {
      if (/denied access|project has been denied/i.test(message)) {
        return {
          ok: false,
          code: "forbidden",
          message: GEMINI_ACCOUNT_BLOCKED_MESSAGE,
        };
      }
      return { ok: false, code: "forbidden", message };
    }
    if (status === 402 || isQuotaOrBillingFailure(message)) {
      return {
        ok: false,
        code: "insufficient_quota",
        message: normalizeProviderFailureMessage(message),
      };
    }
    if (status === 429) {
      const normalized = normalizeProviderFailureMessage(message);
      const code =
        /limit:\s*0/i.test(message) || isQuotaOrBillingFailure(message)
          ? "insufficient_quota"
          : "rate_limited";
      return { ok: false, code, message: normalized };
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

    if (isQuotaOrBillingFailure(error.message)) {
      return {
        ok: false,
        code: "insufficient_quota",
        message: normalizeProviderFailureMessage(error.message),
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
        maxRetries: 0,
      });
      return { ok: true };
    }

    if (provider === "gemini") {
      const google = createGoogleGenerativeAI({ apiKey: key });
      let lastFailure: AiSdkVerifyResult = {
        ok: false,
        code: "provider_error",
        message: "Gemini handshake failed.",
      };

      for (const modelId of GEMINI_VERIFY_MODELS) {
        try {
          await generateText({
            model: google(modelId),
            prompt: VERIFY_PROMPT,
            maxOutputTokens: 1,
            maxRetries: 0,
          });
          return { ok: true };
        } catch (error) {
          lastFailure = mapAiSdkFailure(error);
          if (!lastFailure.ok && lastFailure.code === "invalid_key") {
            return lastFailure;
          }
          if (
            !lastFailure.ok &&
            lastFailure.code === "forbidden" &&
            isGeminiProjectDeniedMessage(lastFailure.message)
          ) {
            continue;
          }
        }
      }

      if (
        !lastFailure.ok &&
        lastFailure.code === "forbidden" &&
        isGeminiProjectDeniedMessage(lastFailure.message)
      ) {
        return { ok: false, code: "forbidden", message: GEMINI_ACCOUNT_BLOCKED_MESSAGE };
      }

      return lastFailure;
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
      maxRetries: 0,
    });

    return { ok: true };
  } catch (error) {
    return mapAiSdkFailure(error);
  }
}
