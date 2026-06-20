import {
  getProviderHandshakeUrl,
  type AiProvider,
} from "@/src/lib/config/app.config";

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

function mapHttpFailure(status: number, body?: ProviderErrorBody | null): ProviderHandshakeResult {
  const providerCode = body?.error?.code ?? body?.error?.type;

  if (providerCode === "insufficient_quota" || status === 402) {
    return {
      ok: false,
      code: "insufficient_quota",
      message: body?.error?.message ?? "Insufficient quota for this API key.",
    };
  }

  if (status === 401) {
    return {
      ok: false,
      code: "invalid_key",
      message: body?.error?.message ?? "Invalid API key for this provider.",
    };
  }
  if (status === 403) {
    return {
      ok: false,
      code: "forbidden",
      message: body?.error?.message ?? "This key cannot list models. Check provider permissions.",
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

function filterOpenAiDiscoveryModels(provider: AiProvider, ids: string[]): string[] {
  const normalized = ids.filter(Boolean);

  if (provider === "openai") {
    return normalized
      .filter((id) => id.startsWith("gpt-") || id.startsWith("o1-") || id.startsWith("o3-"))
      .sort();
  }

  return normalized
    .filter((id) => !id.toLowerCase().includes("embed"))
    .sort();
}

async function fetchOpenAiCompatibleModels(
  provider: AiProvider,
  apiKey: string,
): Promise<ProviderHandshakeResult> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey.trim()}`,
  };

  if (provider === "openrouter") {
    headers["HTTP-Referer"] = "https://easysubmit.ai";
    headers["X-Title"] = "EasySubmit";
  }

  const res = await fetch(getProviderHandshakeUrl(provider), {
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await parseProviderErrorBody(res);
    return mapHttpFailure(res.status, body);
  }

  const json = (await res.json()) as { data?: Array<{ id: string }> };
  const models = filterOpenAiDiscoveryModels(
    provider,
    (json.data ?? []).map((entry) => entry.id),
  );

  if (models.length === 0) {
    return {
      ok: false,
      code: "provider_error",
      message: "Provider handshake succeeded but returned no chat models.",
    };
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

async function fetchGeminiModels(apiKey: string): Promise<ProviderHandshakeResult> {
  const url = `${getProviderHandshakeUrl("gemini")}?key=${geminiKeyParam(apiKey)}`;
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    const body = await parseProviderErrorBody(res);
    return mapHttpFailure(res.status, body);
  }

  const json = (await res.json()) as {
    models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
  };

  const models = (json.models ?? [])
    .filter(
      (model) =>
        model.supportedGenerationMethods?.includes("generateContent") &&
        model.name?.includes("gemini-") &&
        !model.name?.includes("embedding") &&
        !model.name?.includes("vision"),
    )
    .map((model) => model.name!.replace("models/", ""));

  if (models.length === 0) {
    return {
      ok: false,
      code: "provider_error",
      message: "Gemini handshake succeeded but returned no generation models.",
    };
  }

  return { ok: true, models };
}

/**
 * Server-side provider handshake: lists models using the user's BYOK key.
 * Keys are never persisted — used only for this request.
 */
export async function handshakeProviderModels(
  provider: AiProvider,
  apiKey: string,
): Promise<ProviderHandshakeResult> {
  const key = apiKey.trim();
  if (!key) {
    return { ok: false, code: "invalid_key", message: "API key is required." };
  }

  try {
    if (provider === "anthropic") {
      return fetchAnthropicModels(key);
    }

    if (provider === "gemini") {
      return fetchGeminiModels(key);
    }

    if (
      provider === "openai" ||
      provider === "groq" ||
      provider === "deepseek" ||
      provider === "openrouter"
    ) {
      return fetchOpenAiCompatibleModels(provider, key);
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
