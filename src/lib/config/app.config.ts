/**
 * EasySubmit AppConfig — single source of truth for AI provider metadata,
 * system defaults, and runtime constants.
 *
 * Provider registry and runtime defaults unified for the Next.js app.
 */

export type AiProvider =
  | "openai"
  | "anthropic"
  | "gemini"
  | "groq"
  | "deepseek"
  | "openrouter";

/** Lucide icon ref — resolved in UI via `ProviderIcon`. */
export type ProviderIconRef =
  | "sparkles"
  | "shield-check"
  | "gem"
  | "zap"
  | "brain"
  | "route";

export interface ProviderRegistryEntry {
  id: AiProvider;
  label: string;
  baseUrl: string;
  /** Model discovery handshake path (appended to `baseUrl`). */
  handshakeEndpoint: string;
  /** Relative path for chat/completions requests. */
  chatPath: string;
  defaultModels: readonly string[];
  /** chrome.storage / sessionStorage BYOK key (extension-ready). */
  storageKey: string;
  icon: ProviderIconRef;
  documentationUrl: string;
}

/** Canonical provider catalog for BYOK discovery and engine routing. */
export const PROVIDER_REGISTRY: Record<AiProvider, ProviderRegistryEntry> = {
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
      "claude-3-5-sonnet-latest",
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-latest",
      "claude-3-opus-latest",
    ],
    storageKey: "anthropic_key",
    icon: "shield-check",
    documentationUrl: "https://docs.anthropic.com",
  },
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
  groq: {
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai",
    handshakeEndpoint: "/v1/models",
    chatPath: "/v1/chat/completions",
    defaultModels: [
      "llama-3.3-70b-versatile",
      "llama-3.1-70b-versatile",
      "mixtral-8x7b-32768",
    ],
    storageKey: "groq_key",
    icon: "zap",
    documentationUrl: "https://console.groq.com/docs",
  },
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    handshakeEndpoint: "/v1/models",
    chatPath: "/v1/chat/completions",
    defaultModels: ["deepseek-chat", "deepseek-reasoner"],
    storageKey: "deepseek_key",
    icon: "brain",
    documentationUrl: "https://api-docs.deepseek.com",
  },
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api",
    handshakeEndpoint: "/v1/models",
    chatPath: "/v1/chat/completions",
    defaultModels: [
      "openai/gpt-4o",
      "anthropic/claude-3.5-sonnet",
      "google/gemini-2.5-pro-preview",
      "deepseek/deepseek-chat",
    ],
    storageKey: "openrouter_key",
    icon: "route",
    documentationUrl: "https://openrouter.ai/docs",
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
  "openai",
  "anthropic",
  "gemini",
  "groq",
  "deepseek",
  "openrouter",
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

/** Default BYOK provider — always labeled Recommended in AI provider pickers. */
export const RECOMMENDED_AI_PROVIDER = SYSTEM_DEFAULTS.targetAiProvider;

export function isRecommendedAiProvider(provider: AiProvider): boolean {
  return provider === RECOMMENDED_AI_PROVIDER;
}

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

export function getProviderHandshakeUrl(provider: AiProvider): string {
  const { baseUrl, handshakeEndpoint } = PROVIDER_REGISTRY[provider];
  return `${baseUrl}${handshakeEndpoint}`;
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
