import {
  getDefaultModelsForProvider,
  SYSTEM_DEFAULTS,
  type AiProvider,
} from "@/src/lib/config/app.config";

/** Providers validated by the Ignition Gate discovery handshake. */
export type HandshakeProvider = AiProvider;

export const HANDSHAKE_PROVIDERS: HandshakeProvider[] = [
  "gemini",
  "openai",
  "anthropic",
  "groq",
  "deepseek",
  "openrouter",
];

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
    /claude-3-5-sonnet/,
    /claude-3-opus/,
    /claude-opus-4/,
    /claude-sonnet-4/,
    /claude-3-7-sonnet/,
  ],
  gemini: [
    /^gemini-2\.5/,
    /^gemini-2\.0/,
    /^gemini-1\.5-flash/,
    /^gemini-1\.5-pro/,
    /^gemini-pro(?!-vision)/,
    /^gemini-flash-latest$/,
  ],
  groq: [
    /llama-3\.3-70b/,
    /llama-3\.1-70b/,
    /mixtral-8x7b/,
  ],
  deepseek: [/^deepseek-chat$/, /^deepseek-reasoner$/],
  openrouter: [
    /^openai\/gpt-4o$/,
    /^openai\/gpt-4o-mini$/,
    /^anthropic\/claude-3\.5-sonnet/,
    /^anthropic\/claude-3-opus/,
    /^google\/gemini-2\.5/,
    /^deepseek\/deepseek-chat$/,
  ],
};

const CAREER_GRADE_PRIORITY: Record<HandshakeProvider, string[]> = {
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
    "claude-3-5-sonnet-latest",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-sonnet-20240620",
    "claude-3-opus-latest",
    "claude-sonnet-4-20250514",
    "claude-opus-4-20250514",
  ],
  gemini: [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-pro-latest",
    "gemini-1.5-pro",
    "gemini-flash-latest",
  ],
  groq: [
    "llama-3.3-70b-versatile",
    "llama-3.1-70b-versatile",
    "mixtral-8x7b-32768",
  ],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  openrouter: [
    "openai/gpt-4o",
    "anthropic/claude-3.5-sonnet",
    "google/gemini-2.5-pro-preview",
    "deepseek/deepseek-chat",
  ],
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
