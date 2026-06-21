import { GoogleGenerativeAI } from "@google/generative-ai";
import { getDefaultModelsForProvider } from "@/src/lib/config/app.config";

/** Models to ping — flash tiers first (1.5-flash, then newer flash). */
const GEMINI_PING_MODELS = [
  "gemini-1.5-flash",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
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
    return { code: "forbidden", message };
  }

  return { code: "provider_error", message };
}

/**
 * Gemini BYOK validation — minimal `generateContent` ping (1 output token),
 * then bundled career catalog when the ping succeeds.
 */
export async function validateGeminiKey(apiKey: string): Promise<ValidateGeminiKeyResult> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return { ok: false, code: "invalid_key", message: "API key is required." };
  }

  const genAI = new GoogleGenerativeAI(trimmed);
  let lastError: unknown = null;

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
      if (mapped.code === "invalid_key" || mapped.code === "forbidden") {
        return { ok: false, ...mapped };
      }
    }
  }

  const failure = mapGeminiSdkError(lastError);
  return { ok: false, ...failure };
}
