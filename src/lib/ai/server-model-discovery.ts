import {
  getProviderHandshakeUrl,
  getDefaultModelsForProvider,
  getOpenAiCompatChatBaseUrl,
  PROVIDER_REGISTRY,
  type AiProvider,
} from "@/src/lib/config/app.config";
import {
  isOpenAiCompatibleProvider,
  OPENAI_COMPATIBLE_AI_PROVIDERS,
  providerRequiresCustomBaseUrl,
  resolveOpenAiCompatChatBaseUrl,
  resolveProviderHandshakeUrl,
} from "@/src/lib/config/provider-compat";
import { geminiApiHeaders, geminiModelsListUrl } from "@/src/lib/ai/gemini-api";
import {
  GEMINI_ACCOUNT_BLOCKED_MESSAGE,
  isGeminiProjectDeniedMessage,
} from "@/src/lib/ai/gemini-access-messages";
import { validateGeminiKey } from "@/src/lib/ai/validate-gemini-key";
import { logApiCall } from "@/src/shared/observability";

const OPENAI_COMPATIBLE_PROVIDERS: AiProvider[] = [...OPENAI_COMPATIBLE_AI_PROVIDERS];

export type ProviderHandshakeErrorCode =
  | "invalid_key"
  | "forbidden"
  | "rate_limited"
  | "insufficient_quota"
  | "provider_error"
  | "network_error";

export type ProviderHandshakeResult =
  | { ok: true; models: string[] }
  | { ok: false; code: ProviderHandshakeErrorCode; message: string };

type ProviderErrorBody = {
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
};

function geminiKeyParam(apiKey: string): string {
  return encodeURIComponent(apiKey.trim());
}

/** @deprecated Prefer `geminiApiHeaders` — kept for legacy query-param fallback. */
function geminiLegacyQueryUrl(apiKey: string): string {
  return `${geminiModelsListUrl()}?key=${geminiKeyParam(apiKey)}`;
}

function mapHttpFailure(status: number, body?: ProviderErrorBody | null): ProviderHandshakeResult {
  const providerCode = body?.error?.code ?? body?.error?.type;
  const rawMessage = body?.error?.message ?? "";

  if (providerCode === "insufficient_quota" || status === 402) {
    return {
      ok: false,
      code: "insufficient_quota",
      message: rawMessage || "Insufficient quota for this API key.",
    };
  }

  if (status === 401) {
    return {
      ok: false,
      code: "invalid_key",
      message: rawMessage || "Invalid API key for this provider.",
    };
  }
  if (status === 403) {
    if (isGeminiProjectDeniedMessage(rawMessage)) {
      return {
        ok: false,
        code: "forbidden",
        message: GEMINI_ACCOUNT_BLOCKED_MESSAGE,
      };
    }
    return {
      ok: false,
      code: "forbidden",
      message: rawMessage || "This key cannot list models. Check provider permissions.",
    };
  }
  if (status === 429) {
    return {
      ok: false,
      code: "rate_limited",
      message: body?.error?.message ?? "Provider rate limit hit. Try again in a moment.",
    };
  }
  return {
    ok: false,
    code: "provider_error",
    message: body?.error?.message ?? `Provider returned HTTP ${status}.`,
  };
}

async function parseProviderErrorBody(res: Response): Promise<ProviderErrorBody | null> {
  try {
    return (await res.json()) as ProviderErrorBody;
  } catch {
    return null;
  }
}

export function filterOpenAiDiscoveryModels(provider: AiProvider, ids: string[]): string[] {
  const normalized = ids.filter(Boolean);

  if (provider === "openai") {
    return normalized
      .filter((id) => id.startsWith("gpt-") || id.startsWith("o1-") || id.startsWith("o3-"))
      .sort();
  }

  if (provider === "xai") {
    return normalized.filter((id) => id.startsWith("grok-")).sort();
  }

  return normalized
    .filter((id) => !id.toLowerCase().includes("embed"))
    .sort();
}

function bundledOpenAiCompatibleModels(provider: AiProvider): string[] {
  return filterOpenAiDiscoveryModels(provider, getDefaultModelsForProvider(provider));
}

/**
 * Restricted OpenAI project keys often cannot list models but can chat.
 * Chat completion fallback: one minimal completion, then bundled career catalog.
 */
async function probeOpenAiCompatibleChat(
  provider: AiProvider,
  apiKey: string,
  customEndpointUrl?: string | null,
  customModelId?: string | null,
): Promise<ProviderHandshakeResult> {
  if (!isOpenAiCompatibleProvider(provider)) {
    return {
      ok: false,
      code: "forbidden",
      message: "This key cannot list models. Check provider permissions.",
    };
  }

  const entry = PROVIDER_REGISTRY[provider];
  const trimmedCustomModel = customModelId?.trim() ?? "";
  const probeModel =
    provider === "custom"
      ? trimmedCustomModel || entry.defaultModels[0]
      : entry.defaultModels[0];
  const url = `${resolveOpenAiCompatChatBaseUrl(provider, customEndpointUrl)}/chat/completions`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey.trim()}`,
    "Content-Type": "application/json",
  };

  if (provider === "openrouter") {
    headers["HTTP-Referer"] = "https://easysubmit.ai";
    headers["X-Title"] = "EasySubmit";
  }

  const probeStartedAt = Date.now();

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: probeModel,
      messages: [{ role: "user", content: "OK" }],
      max_tokens: 1,
    }),
    cache: "no-store",
  });

  if (res.ok || res.status === 429) {
    if (provider === "custom") {
      logApiCall({
        domain: "ai",
        operation: "ai.discovery.custom_chat_probe",
        provider,
        status: "success",
        durationMs: Date.now() - probeStartedAt,
        aiMode: "customer",
        metadata: {
          feature: "ignition_handshake",
          verifiedModel: probeModel,
          hasCustomModelId: Boolean(trimmedCustomModel),
        },
      });
      return { ok: true, models: [probeModel] };
    }

    const models = bundledOpenAiCompatibleModels(provider);
    if (models.length === 0) {
      return {
        ok: false,
        code: "provider_error",
        message: "Key verified via chat but no bundled models are configured.",
      };
    }
    return { ok: true, models };
  }

  const body = await parseProviderErrorBody(res);
  const failure = mapHttpFailure(res.status, body);
  if (provider === "custom" && !failure.ok) {
    logApiCall({
      domain: "ai",
      operation: "ai.discovery.custom_chat_probe",
      provider,
      status: "error",
      durationMs: Date.now() - probeStartedAt,
      aiMode: "customer",
      errorCode: failure.code,
      errorMessage: failure.message,
      metadata: { feature: "ignition_handshake", probeModel },
    });
  }
  return failure;
}

function appendCustomModelId(
  provider: AiProvider,
  models: string[],
  customModelId?: string | null,
): string[] {
  const trimmed = customModelId?.trim();
  if (provider !== "custom" || !trimmed || models.includes(trimmed)) {
    return models;
  }
  return [...models, trimmed].sort();
}

async function fetchOpenAiCompatibleModels(
  provider: AiProvider,
  apiKey: string,
  customEndpointUrl?: string | null,
  customModelId?: string | null,
): Promise<ProviderHandshakeResult> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey.trim()}`,
  };

  if (provider === "openrouter") {
    headers["HTTP-Referer"] = "https://easysubmit.ai";
    headers["X-Title"] = "EasySubmit";
  }

  const res = await fetch(resolveProviderHandshakeUrl(provider, customEndpointUrl), {
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await parseProviderErrorBody(res);
    if (res.status === 403 || res.status === 404) {
      return probeOpenAiCompatibleChat(provider, apiKey, customEndpointUrl, customModelId);
    }
    return mapHttpFailure(res.status, body);
  }

  const json = (await res.json()) as { data?: Array<{ id: string }> };
  let models = filterOpenAiDiscoveryModels(
    provider,
    (json.data ?? []).map((entry) => entry.id),
  );
  models = appendCustomModelId(provider, models, customModelId);

  if (models.length === 0) {
    return probeOpenAiCompatibleChat(provider, apiKey, customEndpointUrl, customModelId);
  }

  return { ok: true, models };
}

async function fetchAnthropicModels(apiKey: string): Promise<ProviderHandshakeResult> {
  const res = await fetch(getProviderHandshakeUrl("anthropic"), {
    headers: {
      "x-api-key": apiKey.trim(),
      "anthropic-version": "2023-06-01",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await parseProviderErrorBody(res);
    return mapHttpFailure(res.status, body);
  }

  const json = (await res.json()) as { data?: Array<{ id: string }> };
  const models = (json.data ?? [])
    .map((entry) => entry.id)
    .filter(Boolean)
    .sort();

  if (models.length === 0) {
    return {
      ok: false,
      code: "provider_error",
      message: "Provider handshake succeeded but returned no models.",
    };
  }

  return { ok: true, models };
}

async function fetchGeminiModelsViaRest(apiKey: string): Promise<ProviderHandshakeResult> {
  const trimmedKey = apiKey.trim();
  let res = await fetch(geminiModelsListUrl(), {
    headers: geminiApiHeaders(trimmedKey),
    cache: "no-store",
  });

  if (!res.ok && res.status === 401 && !trimmedKey.startsWith("AQ.")) {
    res = await fetch(geminiLegacyQueryUrl(trimmedKey), { cache: "no-store" });
  }

  if (!res.ok) {
    const body = await parseProviderErrorBody(res);
    return mapHttpFailure(res.status, body);
  }

  const json = (await res.json()) as {
    models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
  };

  const fromApi = (json.models ?? [])
    .filter(
      (model) =>
        model.supportedGenerationMethods?.includes("generateContent") &&
        model.name?.includes("gemini-") &&
        !model.name?.includes("embedding") &&
        !model.name?.includes("vision"),
    )
    .map((model) => model.name!.replace("models/", ""));

  const bundled = getDefaultModelsForProvider("gemini");
  const models = [...new Set([...fromApi, ...bundled])].sort();

  if (models.length === 0) {
    return {
      ok: false,
      code: "provider_error",
      message: "Gemini handshake succeeded but returned no usable models.",
    };
  }

  return { ok: true, models };
}

async function fetchGeminiModels(apiKey: string): Promise<ProviderHandshakeResult> {
  const fromRest = await fetchGeminiModelsViaRest(apiKey);
  if (fromRest.ok) {
    return fromRest;
  }

  if (fromRest.code === "invalid_key" || fromRest.code === "forbidden") {
    return fromRest;
  }

  const validated = await validateGeminiKey(apiKey);
  if (!validated.ok) {
    return {
      ok: false,
      code: validated.code,
      message: validated.message,
    };
  }

  return { ok: true, models: validated.models };
}

/**
 * Server-side provider handshake: lists models using the user's BYOK key.
 * Keys are never persisted — used only for this request.
 */
export async function handshakeProviderModels(
  provider: AiProvider,
  apiKey: string,
  options?: { customEndpointUrl?: string | null; customModelId?: string | null },
): Promise<ProviderHandshakeResult> {
  const key = apiKey.trim();
  if (!key) {
    return { ok: false, code: "invalid_key", message: "API key is required." };
  }

  if (providerRequiresCustomBaseUrl(provider) && !options?.customEndpointUrl?.trim()) {
    return {
      ok: false,
      code: "provider_error",
      message: "Custom endpoint URL is required for this provider.",
    };
  }

  try {
    if (provider === "anthropic") {
      return fetchAnthropicModels(key);
    }

    if (provider === "gemini") {
      return fetchGeminiModels(key);
    }

    if (isOpenAiCompatibleProvider(provider)) {
      return fetchOpenAiCompatibleModels(
        provider,
        key,
        options?.customEndpointUrl,
        options?.customModelId,
      );
    }

    return {
      ok: false,
      code: "provider_error",
      message: `Unsupported provider: ${provider}`,
    };
  } catch {
    return {
      ok: false,
      code: "network_error",
      message: "Could not reach the provider. Check your connection and try again.",
    };
  }
}

/** @deprecated Use handshakeProviderModels("gemini", apiKey) */
export async function handshakeGeminiModels(apiKey: string): Promise<ProviderHandshakeResult> {
  return handshakeProviderModels("gemini", apiKey);
}
