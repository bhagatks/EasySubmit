import { logEnhance } from "@/src/lib/ai/engine/enhance-logger";

export const OPENROUTER_FREE_MODEL_ID = "openrouter/free";
export const OPENROUTER_CHAT_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions";

export const OPENROUTER_ATTRIBUTION_HEADERS = {
  "HTTP-Referer": "https://easysubmit.ai",
  "X-OpenRouter-Title": "EasySubmit Application Suite",
  "X-Title": "EasySubmit",
} as const;

export const OPENROUTER_FREE_MAX_PRICE = {
  prompt: 0,
  completion: 0,
  request: 0,
  image: 0,
} as const;

export class OpenRouterFreeGuardError extends Error {
  readonly status?: number;
  readonly code: string;

  constructor(message: string, options: { status?: number; code?: string } = {}) {
    super(message);
    this.name = "OpenRouterFreeGuardError";
    this.status = options.status;
    this.code = options.code ?? "openrouter_free_guard";
  }
}

export function isOpenRouterFreeModel(model: unknown): model is string {
  return typeof model === "string" && model.endsWith(":free");
}

export function isOpenRouterFreeFailureStatus(status: number | undefined): boolean {
  return status === 402 || status === 429 || status === 503 || status === 504;
}

type OpenRouterChatResponse = {
  model?: string;
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { total_tokens?: number; prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string; code?: string | number };
};

export type OpenRouterFreeTextResult = {
  text: string;
  tokensUsed: number;
  modelId: string;
};

function buildOpenRouterFreeBody(input: {
  system?: string;
  prompt: string;
  maxOutputTokens?: number;
  temperature?: number;
}): Record<string, unknown> {
  const messages: Array<{ role: string; content: string }> = [];
  if (input.system?.trim()) {
    messages.push({ role: "system", content: input.system });
  }
  messages.push({ role: "user", content: input.prompt });

  return {
    model: OPENROUTER_FREE_MODEL_ID,
    messages,
    max_tokens: input.maxOutputTokens ?? 8192,
    temperature: input.temperature ?? 0.1,
    response_format: { type: "json_object" },
    provider: {
      max_price: OPENROUTER_FREE_MAX_PRICE,
    },
  };
}

function tokensFromUsage(usage: OpenRouterChatResponse["usage"]): number {
  if (!usage) return 0;
  if (typeof usage.total_tokens === "number") return usage.total_tokens;
  return (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0);
}

export async function callOpenRouterFreeText(input: {
  apiKey: string;
  system?: string;
  prompt: string;
  maxOutputTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  traceId?: string;
}): Promise<OpenRouterFreeTextResult> {
  const startedAt = Date.now();
  logEnhance("engine", "openrouter.free.start", {
    traceId: input.traceId,
    model: OPENROUTER_FREE_MODEL_ID,
  });

  const controller = new AbortController();
  const timeoutMs = input.timeoutMs ?? 90_000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey.trim()}`,
        "Content-Type": "application/json",
        ...OPENROUTER_ATTRIBUTION_HEADERS,
      },
      body: JSON.stringify(buildOpenRouterFreeBody(input)),
      signal: controller.signal,
    });

    const payload = (await response.json()) as OpenRouterChatResponse;
    const modelId = payload.model?.trim() ?? "";

    if (!response.ok) {
      const message =
        payload.error?.message?.trim() ||
        `OpenRouter free request failed (${response.status})`;
      logEnhance("engine", "openrouter.free.fail", {
        traceId: input.traceId,
        status: response.status,
        modelId: modelId || null,
        durationMs: Date.now() - startedAt,
        message,
      });
      throw new OpenRouterFreeGuardError(message, {
        status: response.status,
        code: String(payload.error?.code ?? response.status),
      });
    }

    if (modelId && !isOpenRouterFreeModel(modelId)) {
      const message = `OpenRouter returned non-free model "${modelId}"`;
      logEnhance("engine", "openrouter.free.fail", {
        traceId: input.traceId,
        status: response.status,
        modelId,
        durationMs: Date.now() - startedAt,
        message,
      });
      throw new OpenRouterFreeGuardError(message, {
        status: response.status,
        code: "non_free_model",
      });
    }

    const effectiveModelId = modelId || OPENROUTER_FREE_MODEL_ID;

    const text = payload.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) {
      throw new OpenRouterFreeGuardError("OpenRouter free response was empty", {
        status: response.status,
        code: "empty_response",
      });
    }

    logEnhance("engine", "openrouter.free.done", {
      traceId: input.traceId,
      modelId: effectiveModelId,
      durationMs: Date.now() - startedAt,
      tokensUsed: tokensFromUsage(payload.usage),
      responseChars: text.length,
    });

    return {
      text,
      tokensUsed: tokensFromUsage(payload.usage),
      modelId: effectiveModelId,
    };
  } catch (err) {
    if (err instanceof OpenRouterFreeGuardError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    const timedOut = /aborted|timeout|ETIMEDOUT/i.test(message);
    logEnhance("engine", "openrouter.free.fail", {
      traceId: input.traceId,
      durationMs: Date.now() - startedAt,
      message,
      timedOut,
    });
    throw new OpenRouterFreeGuardError(message, {
      status: timedOut ? 504 : undefined,
      code: timedOut ? "timeout" : "network_error",
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function callOpenRouterFreeStructured<T>(input: {
  apiKey: string;
  system: string;
  prompt: string;
  maxOutputTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  traceId?: string;
  parse: (text: string) => T;
}): Promise<{ object: T; tokensUsed: number; modelId: string }> {
  const result = await callOpenRouterFreeText({
    apiKey: input.apiKey,
    system: input.system,
    prompt: input.prompt,
    maxOutputTokens: input.maxOutputTokens,
    temperature: input.temperature,
    timeoutMs: input.timeoutMs,
    traceId: input.traceId,
  });

  try {
    return {
      object: input.parse(result.text),
      tokensUsed: result.tokensUsed,
      modelId: result.modelId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new OpenRouterFreeGuardError(`OpenRouter free JSON parse failed: ${message}`, {
      code: "parse_error",
    });
  }
}
