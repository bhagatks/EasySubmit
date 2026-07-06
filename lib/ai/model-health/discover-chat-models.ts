import type { AiProvider } from "@/src/lib/config/app.config";
import { getDefaultModelsForProvider } from "@/src/lib/config/app.config";
import type { HandshakeProvider } from "@/src/lib/config/career-grade-models";

const INFRASTRUCTURE_BLACKLIST = [
  "embed",
  "similarity",
  "tts",
  "whisper",
  "moderation",
  "realtime",
  "vision",
  "edit",
  "search",
  "rerank",
  "audio",
  "transcribe",
  "dall-e",
  "imagen",
  "aqa",
  "preview-tts",
  "instruct",
  "legacy",
] as const;

function isDiscoverableModelId(provider: AiProvider, modelId: string): boolean {
  const lower = modelId.trim().toLowerCase();
  if (!lower) return false;

  if (INFRASTRUCTURE_BLACKLIST.some((block) => lower.includes(block))) {
    return false;
  }

  if (provider === "openai" && (lower.startsWith("text-") || lower.startsWith("babbage"))) {
    return false;
  }

  return true;
}

/** API-driven chat model filter — blacklist infrastructure only (no regex allowlists). */
export function filterDiscoverableChatModels(
  provider: HandshakeProvider | AiProvider,
  modelIds: string[],
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const modelId of modelIds) {
    const trimmed = modelId.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    if (!isDiscoverableModelId(provider, trimmed)) continue;
    seen.add(key);
    out.push(trimmed);
  }

  return out.sort();
}

/** When the provider list is empty, fall back to bundled defaults through the same filter. */
export function resolveDiscoverableModels(
  provider: HandshakeProvider | AiProvider,
  apiModelIds: string[],
): string[] {
  const fromApi = filterDiscoverableChatModels(provider, apiModelIds);
  if (fromApi.length > 0) return fromApi;

  if (provider === "custom") {
    return [];
  }

  return filterDiscoverableChatModels(provider, getDefaultModelsForProvider(provider as AiProvider));
}
