import { GoogleGenerativeAI } from "@google/generative-ai";
import { getDefaultModelsForProvider } from "@/src/lib/config/app.config";
import {
  GEMINI_ACCOUNT_BLOCKED_MESSAGE,
  isGeminiProjectDeniedMessage,
} from "@/src/lib/ai/gemini-access-messages";

/** Newer models first — legacy 1.5 often 404s on fresh AI Studio projects. */
const GEMINI_PING_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-flash-latest",
  "gemini-1.5-flash",
] as const;

type GeminiValidationErrorCode =
  | "invalid_key"
  | "forbidden"
  | "rate_limited"
  | "insufficient_quota"
  | "provider_error";

export type ValidateGeminiKeyResult =
  | { ok: true; models: string[]; pingModel: string }
  | { ok: false; code: GeminiValidationErrorCode; message: string };

function mapGeminiSdkError(error: unknown): {
  code: GeminiValidationErrorCode;
  message: string;
} {
  const message =
    error instanceof Error ? error.message : "Gemini rejected this API key.";

  if (isGeminiProjectDeniedMessage(message)) {
    return {
      code: "forbidden",
      message: GEMINI_ACCOUNT_BLOCKED_MESSAGE,
    };
  }

  if (/api.?key|invalid|401|unauthorized|permission denied/i.test(message)) {
    return { code: "invalid_key", message };
  }
  if (/quota|billing|spending cap|limit:\s*0|exceeded/i.test(message)) {
    return { code: "insufficient_quota", message };
  }
  if (/429|rate.?limit|too many requests/i.test(message)) {
    return { code: "rate_limited", message };
  }
  if (/403|forbidden/i.test(message)) {
    return {
      code: "forbidden",
      message:
        "This Gemini key cannot call the model (403). Try another model in AI Studio or switch provider.",
    };
  }

  return { code: "provider_error", message };
}

/**
 * Gemini BYOK validation — minimal `generateContent` ping (1 output token).
 * Used as a fallback when the REST models list is unavailable.
 */
export async function validateGeminiKey(apiKey: string): Promise<ValidateGeminiKeyResult> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return { ok: false, code: "invalid_key", message: "API key is required." };
  }

  const genAI = new GoogleGenerativeAI(trimmed);
  let lastError: unknown = null;
  let projectDeniedAttempts = 0;

  for (const modelId of GEMINI_PING_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelId });
      await model.generateContent({
        contents: [{ role: "user", parts: [{ text: "ping" }] }],
        generationConfig: { maxOutputTokens: 1 },
      });

      return {
        ok: true,
        pingModel: modelId,
        models: [...getDefaultModelsForProvider("gemini")],
      };
    } catch (error) {
      lastError = error;
      const mapped = mapGeminiSdkError(error);
      if (mapped.code === "invalid_key") {
        return { ok: false, ...mapped };
      }
      if (isGeminiProjectDeniedMessage(mapped.message)) {
        projectDeniedAttempts += 1;
        continue;
      }
    }
  }

  if (projectDeniedAttempts === GEMINI_PING_MODELS.length) {
    return {
      ok: false,
      code: "forbidden",
      message: GEMINI_ACCOUNT_BLOCKED_MESSAGE,
    };
  }

  const failure = mapGeminiSdkError(lastError);
  return { ok: false, ...failure };
}
