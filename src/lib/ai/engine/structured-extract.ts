import { generateObject, generateText } from "ai";
import type { LanguageModel } from "ai";
import type { z } from "zod";
import type { AiProvider } from "@/src/lib/config/app.config";
import {
  GEMINI_SDK_MAX_RETRIES,
  GEMINI_STRUCTURED_PROVIDER_OPTIONS,
} from "@/src/lib/ai/engine/gemini-resilience";
import { JD_EXTRACTION_TIMEOUT_MS } from "@/lib/job-tracker/jd/resolve-jd-extraction-model";

/** JD Brain structured extract — procurement JDs need headroom for full JSON. */
export const JD_STRUCTURED_MAX_OUTPUT_TOKENS = 2048;

function structuredProviderOptions(provider?: AiProvider) {
  if (provider === "gemini") return GEMINI_STRUCTURED_PROVIDER_OPTIONS;
  return undefined;
}

export function isStructuredExtractParseError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /no object generated|could not parse the response|schema|json parse|invalid json|failed to parse|type validation|did not match/i.test(
    message,
  );
}

/** Strip markdown fences and extract the outermost JSON object from model text. */
export function parseJsonObjectFromModelText(text: string): unknown {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenceMatch?.[1] ?? trimmed).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new SyntaxError("No JSON object in model text");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

export async function generateStructuredWithFallback<T extends z.ZodTypeAny>(input: {
  model: LanguageModel;
  provider?: AiProvider;
  system: string;
  prompt: string;
  schema: T;
  maxOutputTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}): Promise<{
  object: z.infer<T>;
  tokensUsed: number;
  mode: "object" | "text_fallback";
}> {
  const maxOutputTokens = input.maxOutputTokens ?? JD_STRUCTURED_MAX_OUTPUT_TOKENS;
  const temperature = input.temperature ?? 0;
  const abortSignal =
    input.timeoutMs != null && input.timeoutMs > 0
      ? AbortSignal.timeout(input.timeoutMs)
      : undefined;

  try {
    const result = await generateObject({
      model: input.model,
      system: input.system,
      prompt: input.prompt,
      schema: input.schema,
      temperature,
      maxOutputTokens,
      maxRetries: GEMINI_SDK_MAX_RETRIES,
      providerOptions: structuredProviderOptions(input.provider),
      abortSignal,
    });
    return {
      object: result.object as z.infer<T>,
      tokensUsed: result.usage?.totalTokens ?? 0,
      mode: "object",
    };
  } catch (err) {
    if (!isStructuredExtractParseError(err)) throw err;

    const textResult = await generateText({
      model: input.model,
      system: `${input.system}\nRespond with valid JSON only — one object, no markdown fences.`,
      prompt: `${input.prompt}\n\nReturn ONLY a JSON object matching the schema. No commentary.`,
      temperature,
      maxOutputTokens,
      maxRetries: GEMINI_SDK_MAX_RETRIES,
      abortSignal,
    });

    const raw = parseJsonObjectFromModelText(textResult.text);
    const validated = input.schema.safeParse(raw);
    if (!validated.success) {
      throw err instanceof Error ? err : new Error(String(err));
    }

    return {
      object: validated.data,
      tokensUsed: textResult.usage?.totalTokens ?? 0,
      mode: "text_fallback",
    };
  }
}
