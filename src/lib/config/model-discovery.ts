/**
 * Live model discovery against provider APIs.
 * Falls back to null so callers can use bundled defaults from app.config.
 */
import {
  getProviderHandshakeUrl,
  getTargetAiModel,
  type AiProvider,
} from "@/src/lib/config/app.config";
import { geminiApiHeaders, geminiModelsListUrl } from "@/src/lib/ai/gemini-api";

function filterOpenAiModels(provider: AiProvider, ids: string[]): string[] {
  if (provider === "openai") {
    return ids
      .filter((id) => id.startsWith("gpt-") || id.startsWith("o1-") || id.startsWith("o3-"))
      .sort();
  }

  return ids.filter((id) => !id.toLowerCase().includes("embed")).sort();
}

function filterGeminiModels(
  models: Array<{ name?: string; supportedGenerationMethods?: string[] }>,
): string[] {
  return models
    .filter(
      (model) =>
        model.supportedGenerationMethods?.includes("generateContent") &&
        model.name?.includes("gemini-") &&
        !model.name?.includes("embedding") &&
        !model.name?.includes("vision"),
    )
    .map((model) => model.name!.replace("models/", ""));
}

function buildOpenAiCompatibleHeaders(
  provider: AiProvider,
  apiKey: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey.trim()}`,
  };

  if (provider === "openrouter") {
    headers["HTTP-Referer"] = "https://easysubmit.ai";
    headers["X-Title"] = "EasySubmit";
  }

  return headers;
}

export async function fetchProviderModelsFromApi(
  provider: AiProvider,
  apiKey?: string,
): Promise<string[] | null> {
  const key = apiKey?.trim() ?? "";
  if (!key) return null;

  try {
    if (provider === "gemini") {
      const res = await fetch(geminiModelsListUrl(), {
        headers: geminiApiHeaders(key),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as {
        models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
      };
      const models = filterGeminiModels(json.models ?? []);
      return models.length > 0 ? models : null;
    }

    if (provider === "anthropic") {
      const res = await fetch(getProviderHandshakeUrl(provider), {
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { data?: Array<{ id: string }> };
      const models = (json.data ?? [])
        .map((entry) => entry.id)
        .filter(Boolean)
        .sort();
      return models.length > 0 ? models : null;
    }

    if (
      provider === "openai" ||
      provider === "groq" ||
      provider === "deepseek" ||
      provider === "openrouter"
    ) {
      const res = await fetch(getProviderHandshakeUrl(provider), {
        headers: buildOpenAiCompatibleHeaders(provider, key),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { data?: Array<{ id: string }> };
      const models = filterOpenAiModels(provider, (json.data ?? []).map((entry) => entry.id));
      return models.length > 0 ? models : null;
    }
  } catch {
    return null;
  }

  return null;
}

/** Resolve the default model id for a provider (system target or first bundled default). */
export function getDefaultModelForProvider(provider: AiProvider): string {
  return getTargetAiModel(provider);
}
