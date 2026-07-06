import {
  getDefaultModelsForProvider,
  SYSTEM_DEFAULTS,
  type AiProvider,
} from "@/src/lib/config/app.config";
import { ALL_AI_PROVIDERS } from "@/src/lib/config/app.config";

/** Providers validated by the Ignition Gate discovery handshake. */
export type HandshakeProvider = AiProvider;

/** Dropdown order matches BYOK spec. */
export const HANDSHAKE_PROVIDERS: HandshakeProvider[] = [...ALL_AI_PROVIDERS];

const EXCLUDED_MODEL_FRAGMENTS = [
  "embedding",
  "embed",
  "vision",
  "audio",
  "realtime",
  "transcribe",
  "tts",
  "whisper",
  "dall-e",
  "moderation",
  "instruct",
  "legacy",
  "search",
  "preview-tts",
  "aqa",
  "imagen",
] as const;

const CAREER_GRADE_PATTERNS: Record<HandshakeProvider, RegExp[]> = {
  gemini: [
    /^gemini-2\.5/,
    /^gemini-2\.0/,
    /^gemini-1\.5-flash/,
    /^gemini-1\.5-pro/,
    /^gemini-pro(?!-vision)/,
    /^gemini-flash-latest$/,
  ],
  openai: [
    /^gpt-4o$/,
    /^gpt-4o-\d{4}-\d{2}-\d{2}$/,
    /^gpt-4o-mini$/,
    /^gpt-4o-mini-\d{4}-\d{2}-\d{2}$/,
    /^gpt-4-turbo/,
    /^gpt-4(?!\.|-vision|-0314)/,
    /^o1$/,
    /^o1-mini$/,
    /^o1-preview$/,
    /^o3$/,
    /^o3-mini$/,
  ],
  anthropic: [
    /claude-3-5-haiku/,
    /claude-3-5-sonnet/,
    /claude-3-opus/,
    /claude-opus-4/,
    /claude-sonnet-4/,
    /claude-3-7-sonnet/,
  ],
  deepseek: [/^deepseek-v4-flash$/, /^deepseek-v4-pro$/, /^deepseek-chat$/, /^deepseek-reasoner$/],
  zai: [/glm-5/, /glm-4/],
  openrouter: [
    /^openai\/gpt-4o$/,
    /^openai\/gpt-4o-mini$/,
    /^anthropic\/claude-3\.5-sonnet/,
    /^anthropic\/claude-3-opus/,
    /^google\/gemini-2\.5/,
    /^meta-llama\/llama-3\.3/,
    /^deepseek\/deepseek/,
  ],
  deepinfra: [/Qwen\/Qwen3/, /Llama-3\.3/, /DeepSeek-V/],
  xai: [/^grok-/],
  groq: [/llama-3\.3-70b/, /llama-3\.1-70b/, /llama-3\.1-8b/],
  siliconflow: [/DeepSeek-V/, /DeepSeek-R/, /Qwen\/Qwen3/],
  together: [/Llama-3\.3/, /Qwen/],
  mistral: [/mistral-large/, /mistral-small/, /open-mistral/],
  custom: [/.+/],
};

const CAREER_GRADE_PRIORITY: Record<HandshakeProvider, string[]> = {
  gemini: [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-pro-latest",
    "gemini-1.5-pro",
    "gemini-flash-latest",
  ],
  openai: [
    "gpt-4o",
    "gpt-4o-2024-11-20",
    "gpt-4o-2024-08-06",
    "gpt-4o-mini",
    "o1",
    "o1-mini",
    "o3",
    "o3-mini",
    "gpt-4-turbo",
    "gpt-4",
  ],
  anthropic: [
    "claude-sonnet-4-20250514",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-sonnet-20240620",
    "claude-3-5-haiku-20241022",
    "claude-3-5-sonnet-latest",
    "claude-3-opus-latest",
    "claude-opus-4-20250514",
  ],
  deepseek: ["deepseek-v4-flash", "deepseek-v4-pro", "deepseek-chat", "deepseek-reasoner"],
  zai: ["glm-5.2", "glm-5-turbo", "glm-4-flash", "glm-4-plus"],
  openrouter: [
    "google/gemini-2.5-flash",
    "openai/gpt-4o",
    "anthropic/claude-3.5-sonnet",
    "meta-llama/llama-3.3-70b-instruct",
    "deepseek/deepseek-chat",
  ],
  deepinfra: [
    "Qwen/Qwen3-32B",
    "meta-llama/Llama-3.3-70B-Instruct",
    "deepseek-ai/DeepSeek-V3",
  ],
  xai: ["grok-3-mini", "grok-3", "grok-2-1212"],
  groq: [
    "llama-3.3-70b-versatile",
    "llama-3.1-70b-versatile",
    "llama-3.1-8b-instant",
  ],
  siliconflow: [
    "deepseek-ai/DeepSeek-V3",
    "Qwen/Qwen3-32B",
    "Pro/deepseek-ai/DeepSeek-R1",
  ],
  together: [
    "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    "meta-llama/Llama-3.3-70B-Instruct",
  ],
  mistral: ["mistral-large-latest", "mistral-small-latest", "open-mistral-nemo"],
  custom: [],
};

function isExcludedModel(modelId: string): boolean {
  const normalized = modelId.toLowerCase();
  return EXCLUDED_MODEL_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

export function isCareerGradeModel(
  provider: HandshakeProvider,
  modelId: string,
): boolean {
  const normalized = modelId.trim();
  if (!normalized || isExcludedModel(normalized)) return false;
  return CAREER_GRADE_PATTERNS[provider].some((pattern) => pattern.test(normalized));
}

function rankCareerGradeModel(provider: HandshakeProvider, modelId: string): number {
  const priority = CAREER_GRADE_PRIORITY[provider];
  const exactIndex = priority.indexOf(modelId);
  if (exactIndex >= 0) return exactIndex;

  const prefixIndex = priority.findIndex((candidate) => modelId.startsWith(candidate));
  if (prefixIndex >= 0) return prefixIndex + 0.5;

  return 100;
}

export function sortCareerGradeModels(
  provider: HandshakeProvider,
  modelIds: string[],
): string[] {
  return [...new Set(modelIds)].sort(
    (left, right) =>
      rankCareerGradeModel(provider, left) - rankCareerGradeModel(provider, right),
  );
}

export function filterCareerGradeModels(
  provider: HandshakeProvider,
  modelIds: string[],
): string[] {
  const fromApi = intersectCareerGradeModels(provider, modelIds);

  if (fromApi.length > 0) return fromApi;

  if (provider === "custom") return [];

  return sortCareerGradeModels(
    provider,
    getDefaultModelsForProvider(provider).filter((modelId) =>
      isCareerGradeModel(provider, modelId),
    ),
  );
}

/** Strict filter — API models only (no bundled fallback). Used for BYOK handshake validation. */
export function intersectCareerGradeModels(
  provider: HandshakeProvider,
  modelIds: string[],
): string[] {
  return sortCareerGradeModels(
    provider,
    modelIds.filter((modelId) => isCareerGradeModel(provider, modelId)),
  );
}

export function suggestPrimaryFuel(
  provider: HandshakeProvider,
  modelIds: string[],
): string {
  const sorted = filterCareerGradeModels(provider, modelIds);
  if (
    provider === SYSTEM_DEFAULTS.targetAiProvider &&
    sorted.includes(SYSTEM_DEFAULTS.targetAiModel)
  ) {
    return SYSTEM_DEFAULTS.targetAiModel;
  }
  return sorted[0] ?? CAREER_GRADE_PRIORITY[provider][0] ?? SYSTEM_DEFAULTS.targetAiModel;
}

export function isHandshakeProvider(value: string): value is HandshakeProvider {
  return HANDSHAKE_PROVIDERS.includes(value as HandshakeProvider);
}
