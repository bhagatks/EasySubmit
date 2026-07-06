import { PROVIDER_REGISTRY, type AiProvider } from "@/src/lib/config/app.config";

/** OpenAI-compatible chat providers (Anthropic + native Gemini excluded). */
export const OPENAI_COMPATIBLE_AI_PROVIDERS = [
  "openai",
  "groq",
  "deepseek",
  "openrouter",
  "zai",
  "deepinfra",
  "xai",
  "siliconflow",
  "together",
  "mistral",
  "custom",
] as const satisfies readonly AiProvider[];

export type OpenAiCompatibleAiProvider = (typeof OPENAI_COMPATIBLE_AI_PROVIDERS)[number];

export function isOpenAiCompatibleProvider(
  provider: AiProvider,
): provider is OpenAiCompatibleAiProvider {
  return (OPENAI_COMPATIBLE_AI_PROVIDERS as readonly string[]).includes(provider);
}

export function providerRequiresCustomBaseUrl(provider: AiProvider): boolean {
  return PROVIDER_REGISTRY[provider].requiresCustomBaseUrl === true;
}

/** Normalize user-supplied OpenAI-compatible base URL (expects …/v1 or provider root). */
export function normalizeCustomOpenAiBaseUrl(raw: string | null | undefined): string {
  const trimmed = raw?.trim();
  if (!trimmed) {
    throw new Error("Custom endpoint URL is required.");
  }
  const withoutTrailing = trimmed.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(withoutTrailing)) {
    throw new Error("Custom endpoint URL must start with http:// or https://");
  }
  return withoutTrailing;
}

export function resolveOpenAiCompatChatBaseUrl(
  provider: AiProvider,
  customEndpointUrl?: string | null,
): string {
  if (provider === "custom") {
    return normalizeCustomOpenAiBaseUrl(customEndpointUrl);
  }

  const entry = PROVIDER_REGISTRY[provider];
  if (entry.openAiCompatBaseUrl) {
    return entry.openAiCompatBaseUrl;
  }
  if (provider === "deepseek") {
    return entry.baseUrl;
  }
  return `${entry.baseUrl}/v1`;
}

export function resolveProviderHandshakeUrl(
  provider: AiProvider,
  customEndpointUrl?: string | null,
): string {
  if (provider === "custom") {
    return `${normalizeCustomOpenAiBaseUrl(customEndpointUrl)}/models`;
  }

  const entry = PROVIDER_REGISTRY[provider];
  if (entry.openAiCompatBaseUrl) {
    return `${entry.openAiCompatBaseUrl}/models`;
  }
  return `${entry.baseUrl}${entry.handshakeEndpoint}`;
}
