/**
 * EasySubmit AppConfig — single source of truth for AI provider metadata,
 * system defaults, and runtime constants.
 *
 * Provider registry and runtime defaults unified for the Next.js app.
 */

import {
  resolveOpenAiCompatChatBaseUrl,
  resolveProviderHandshakeUrl,
} from "@/src/lib/config/provider-compat";

export type AiProvider =
  | "gemini"
  | "openai"
  | "anthropic"
  | "deepseek"
  | "zai"
  | "openrouter"
  | "deepinfra"
  | "xai"
  | "groq"
  | "siliconflow"
  | "together"
  | "mistral"
  | "custom";

/** Lucide icon ref — resolved in UI via `ProviderIcon`. */
export type ProviderIconRef =
  | "sparkles"
  | "shield-check"
  | "gem"
  | "zap"
  | "brain"
  | "route"
  | "box"
  | "server"
  | "bot"
  | "cpu"
  | "users"
  | "cloud"
  | "plug";

export interface ProviderRegistryEntry {
  id: AiProvider;
  label: string;
  baseUrl: string;
  /** Model discovery handshake path (appended to `baseUrl` unless `openAiCompatBaseUrl` is set). */
  handshakeEndpoint: string;
  /** Relative path for chat/completions requests. */
  chatPath: string;
  /** When set, OpenAI SDK uses this as chat baseURL instead of `baseUrl/v1`. */
  openAiCompatBaseUrl?: string;
  /** User must supply `customEndpointUrl` on vault (custom provider). */
  requiresCustomBaseUrl?: boolean;
  defaultModels: readonly string[];
  /** chrome.storage / sessionStorage BYOK key (extension-ready). */
  storageKey: string;
  icon: ProviderIconRef;
  documentationUrl: string;
}

/** Canonical provider catalog for BYOK discovery and engine routing. */
export const PROVIDER_REGISTRY: Record<AiProvider, ProviderRegistryEntry> = {
  gemini: {
    id: "gemini",
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com",
    handshakeEndpoint: "/v1beta/models",
    chatPath: "/v1beta/models/{model}:generateContent",
    defaultModels: [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-flash-latest",
      "gemini-1.5-flash",
      "gemini-pro-latest",
    ],
    storageKey: "gemini_key",
    icon: "gem",
    documentationUrl: "https://ai.google.dev/gemini-api/docs",
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com",
    handshakeEndpoint: "/v1/models",
    chatPath: "/v1/chat/completions",
    defaultModels: ["gpt-4o-mini", "gpt-4o", "o1-mini", "gpt-4-turbo"],
    storageKey: "openai_key",
    icon: "sparkles",
    documentationUrl: "https://platform.openai.com/docs",
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic",
    baseUrl: "https://api.anthropic.com",
    handshakeEndpoint: "/v1/models",
    chatPath: "/v1/messages",
    defaultModels: [
      "claude-sonnet-4-20250514",
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-5-sonnet-latest",
      "claude-3-opus-latest",
    ],
    storageKey: "anthropic_key",
    icon: "shield-check",
    documentationUrl: "https://docs.anthropic.com",
  },
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    handshakeEndpoint: "/v1/models",
    chatPath: "/chat/completions",
    defaultModels: ["deepseek-v4-flash", "deepseek-v4-pro", "deepseek-chat", "deepseek-reasoner"],
    storageKey: "deepseek_key",
    icon: "brain",
    documentationUrl: "https://api-docs.deepseek.com",
  },
  zai: {
    id: "zai",
    label: "Z.ai (GLM)",
    baseUrl: "https://api.z.ai",
    handshakeEndpoint: "/api/paas/v4/models",
    chatPath: "/api/paas/v4/chat/completions",
    openAiCompatBaseUrl: "https://api.z.ai/api/paas/v4",
    defaultModels: ["glm-5.2", "glm-5-turbo", "glm-4-flash", "glm-4-plus"],
    storageKey: "zai_key",
    icon: "box",
    documentationUrl: "https://docs.z.ai",
  },
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api",
    handshakeEndpoint: "/v1/models",
    chatPath: "/v1/chat/completions",
    defaultModels: [
      "google/gemini-2.5-flash",
      "meta-llama/llama-3.3-70b-instruct",
      "openai/gpt-4o",
      "anthropic/claude-3.5-sonnet",
      "deepseek/deepseek-chat",
    ],
    storageKey: "openrouter_key",
    icon: "route",
    documentationUrl: "https://openrouter.ai/docs",
  },
  deepinfra: {
    id: "deepinfra",
    label: "DeepInfra",
    baseUrl: "https://api.deepinfra.com",
    handshakeEndpoint: "/v1/openai/models",
    chatPath: "/v1/openai/chat/completions",
    openAiCompatBaseUrl: "https://api.deepinfra.com/v1/openai",
    defaultModels: [
      "Qwen/Qwen3-32B",
      "meta-llama/Llama-3.3-70B-Instruct",
      "deepseek-ai/DeepSeek-V3",
    ],
    storageKey: "deepinfra_key",
    icon: "server",
    documentationUrl: "https://deepinfra.com/docs",
  },
  xai: {
    id: "xai",
    label: "xAI (Grok)",
    baseUrl: "https://api.x.ai",
    handshakeEndpoint: "/v1/models",
    chatPath: "/v1/chat/completions",
    defaultModels: ["grok-3-mini", "grok-3", "grok-2-1212"],
    storageKey: "xai_key",
    icon: "bot",
    documentationUrl: "https://docs.x.ai",
  },
  groq: {
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai",
    handshakeEndpoint: "/v1/models",
    chatPath: "/v1/chat/completions",
    defaultModels: [
      "llama-3.3-70b-versatile",
      "llama-3.1-70b-versatile",
      "llama-3.1-8b-instant",
    ],
    storageKey: "groq_key",
    icon: "zap",
    documentationUrl: "https://console.groq.com/docs",
  },
  siliconflow: {
    id: "siliconflow",
    label: "SiliconFlow",
    baseUrl: "https://api.siliconflow.com",
    handshakeEndpoint: "/v1/models",
    chatPath: "/v1/chat/completions",
    defaultModels: [
      "deepseek-ai/DeepSeek-V3",
      "Qwen/Qwen3-32B",
      "Pro/deepseek-ai/DeepSeek-R1",
    ],
    storageKey: "siliconflow_key",
    icon: "cpu",
    documentationUrl: "https://docs.siliconflow.com",
  },
  together: {
    id: "together",
    label: "Together AI",
    baseUrl: "https://api.together.xyz",
    handshakeEndpoint: "/v1/models",
    chatPath: "/v1/chat/completions",
    defaultModels: [
      "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      "meta-llama/Llama-3.3-70B-Instruct",
      "Qwen/Qwen2.5-72B-Instruct-Turbo",
    ],
    storageKey: "together_key",
    icon: "users",
    documentationUrl: "https://docs.together.ai",
  },
  mistral: {
    id: "mistral",
    label: "Mistral AI",
    baseUrl: "https://api.mistral.ai",
    handshakeEndpoint: "/v1/models",
    chatPath: "/v1/chat/completions",
    defaultModels: [
      "mistral-large-latest",
      "mistral-small-latest",
      "open-mistral-nemo",
    ],
    storageKey: "mistral_key",
    icon: "cloud",
    documentationUrl: "https://docs.mistral.ai",
  },
  custom: {
    id: "custom",
    label: "Custom Endpoint",
    baseUrl: "",
    handshakeEndpoint: "/models",
    chatPath: "/chat/completions",
    requiresCustomBaseUrl: true,
    defaultModels: ["gpt-4o-mini"],
    storageKey: "custom_key",
    icon: "plug",
    documentationUrl: "https://platform.openai.com/docs/api-reference/chat",
  },
} as const;

/** @deprecated Use PROVIDER_REGISTRY */
export type ServiceRegistryEntry = ProviderRegistryEntry & {
  /** @deprecated Use handshakeEndpoint */
  modelsPath: string;
};

function withLegacyModelsPath(
  entry: ProviderRegistryEntry,
): ServiceRegistryEntry {
  return { ...entry, modelsPath: entry.handshakeEndpoint };
}

/** @deprecated Use PROVIDER_REGISTRY — kept for legacy imports. */
export const SERVICE_REGISTRY: Record<AiProvider, ServiceRegistryEntry> =
  Object.fromEntries(
    Object.entries(PROVIDER_REGISTRY).map(([id, entry]) => [
      id,
      withLegacyModelsPath(entry),
    ]),
  ) as Record<AiProvider, ServiceRegistryEntry>;

export const ALL_AI_PROVIDERS: AiProvider[] = [
  "gemini",
  "openai",
  "anthropic",
  "deepseek",
  "zai",
  "openrouter",
  "deepinfra",
  "xai",
  "groq",
  "siliconflow",
  "together",
  "mistral",
  "custom",
];

export interface SystemDefaults {
  /** Default BYOK provider when none is selected. */
  targetAiProvider: AiProvider;
  /** Career-grade flagship model for resume tuning and apply automation. */
  targetAiModel: string;
  /** Reserved token headroom subtracted from provider context limits per request. */
  maxTokenBuffer: number;
  /** Hours between background model-catalog refreshes; 0 = refresh on each flow entry. */
  aiModelsUpdateHours: number;
}

function getIsDev(): boolean {
  return process.env.NODE_ENV === "development";
}

export const SYSTEM_DEFAULTS: SystemDefaults = {
  targetAiProvider: "gemini",
  targetAiModel: "gemini-2.5-flash",
  maxTokenBuffer: 8192,
  aiModelsUpdateHours: 24,
};

/** Runtime URLs and cache keys derived from system defaults. */
export const APP_RUNTIME = {
  DASHBOARD_URL: getIsDev()
    ? "http://localhost:3000/dashboard"
    : "https://easysubmit.ai/dashboard",
  AI_MODELS_CACHE_KEY: "ai_models_cache_v1",
} as const;

export interface AiModelsCache {
  openai?: string[];
  anthropic?: string[];
  gemini?: string[];
  groq?: string[];
  deepseek?: string[];
  openrouter?: string[];
  zai?: string[];
  deepinfra?: string[];
  xai?: string[];
  siliconflow?: string[];
  together?: string[];
  mistral?: string[];
  custom?: string[];
  updatedAt?: number;
}

/** @deprecated Use SYSTEM_DEFAULTS + APP_RUNTIME — kept for legacy imports. */
export interface LegacyAppConfig {
  DASHBOARD_URL: string;
  DEFAULT_AI_PROVIDER: AiProvider;
  AI_MODELS_UPDATE_HOURS: number;
  DEFAULT_MODEL_BY_PROVIDER: Record<AiProvider, string>;
}

function buildDefaultModelByProvider(): Record<AiProvider, string> {
  return Object.fromEntries(
    ALL_AI_PROVIDERS.map((provider) => [
      provider,
      PROVIDER_REGISTRY[provider].defaultModels[0] ?? "",
    ]),
  ) as Record<AiProvider, string>;
}

/** @deprecated Use SYSTEM_DEFAULTS — kept for legacy imports. */
export const appConfig: LegacyAppConfig = {
  DASHBOARD_URL: APP_RUNTIME.DASHBOARD_URL,
  DEFAULT_AI_PROVIDER: SYSTEM_DEFAULTS.targetAiProvider,
  AI_MODELS_UPDATE_HOURS: SYSTEM_DEFAULTS.aiModelsUpdateHours,
  DEFAULT_MODEL_BY_PROVIDER: buildDefaultModelByProvider(),
};

/** @deprecated Use ProviderRegistryEntry — kept for legacy imports. */
export type ProviderConfig = ServiceRegistryEntry;

/** @deprecated Use PROVIDER_REGISTRY — kept for legacy imports. */
export const AI_PROVIDERS = SERVICE_REGISTRY;

export const DEFAULT_AI_MODELS_UPDATE_HOURS = SYSTEM_DEFAULTS.aiModelsUpdateHours;
export const AI_MODELS_CACHE_KEY = APP_RUNTIME.AI_MODELS_CACHE_KEY;

export function getProviderRegistryEntry(provider: AiProvider): ProviderRegistryEntry {
  return PROVIDER_REGISTRY[provider];
}

export function getServiceEntry(provider: AiProvider): ServiceRegistryEntry {
  return SERVICE_REGISTRY[provider];
}

/** @deprecated Use getServiceEntry or getProviderRegistryEntry */
export const getProviderConfig = getServiceEntry;

export function getProviderHandshakeUrl(
  provider: AiProvider,
  customEndpointUrl?: string | null,
): string {
  return resolveProviderHandshakeUrl(provider, customEndpointUrl);
}

/** Handshake URL — alias for `getProviderHandshakeUrl`. */
export function getProviderModelsUrl(provider: AiProvider): string {
  return getProviderHandshakeUrl(provider);
}

export function getProviderChatUrl(provider: AiProvider, modelId?: string): string {
  const { baseUrl, chatPath } = PROVIDER_REGISTRY[provider];
  if (provider === "gemini" && modelId) {
    return `${baseUrl}${chatPath.replace("{model}", modelId)}`;
  }
  return `${baseUrl}${chatPath}`;
}

/** OpenAI-compatible SDK base URL — DeepSeek V4 chat omits the `/v1` prefix. */
export function getOpenAiCompatChatBaseUrl(
  provider: AiProvider,
  customEndpointUrl?: string | null,
): string {
  return resolveOpenAiCompatChatBaseUrl(provider, customEndpointUrl);
}

export function getDefaultModelsForProvider(provider: AiProvider): string[] {
  return [...PROVIDER_REGISTRY[provider].defaultModels];
}

export function getTargetAiModel(provider: AiProvider = SYSTEM_DEFAULTS.targetAiProvider): string {
  if (provider === SYSTEM_DEFAULTS.targetAiProvider) {
    return SYSTEM_DEFAULTS.targetAiModel;
  }
  return PROVIDER_REGISTRY[provider].defaultModels[0] ?? SYSTEM_DEFAULTS.targetAiModel;
}

export function getMaxTokenBuffer(): number {
  return SYSTEM_DEFAULTS.maxTokenBuffer;
}

export function buildDefaultModelCatalog(): Record<AiProvider, string[]> {
  return Object.fromEntries(
    ALL_AI_PROVIDERS.map((provider) => [provider, getDefaultModelsForProvider(provider)]),
  ) as Record<AiProvider, string[]>;
}

export function isAiProvider(value: string): value is AiProvider {
  return ALL_AI_PROVIDERS.includes(value as AiProvider);
}

export function getProviderDocumentationUrl(provider: AiProvider): string {
  return PROVIDER_REGISTRY[provider].documentationUrl;
}

export function getProviderIconRef(provider: AiProvider): ProviderIconRef {
  return PROVIDER_REGISTRY[provider].icon;
}
