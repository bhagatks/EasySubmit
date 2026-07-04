import { isAiProvider, type AiProvider } from "@/src/lib/config/app.config";

/** Providers supported by the EasySubmit system key pool. */
export type SystemPoolProvider = Extract<AiProvider, "deepseek" | "openrouter" | "gemini">;

export const SYSTEM_POOL_PROVIDERS: readonly SystemPoolProvider[] = [
  "deepseek",
  "openrouter",
  "gemini",
];

/** Resume enhance (`generateText`) defaults per system provider. */
export const SYSTEM_RESUME_MODEL_DEFAULTS: Record<SystemPoolProvider, string> = {
  deepseek: "deepseek-chat",
  openrouter: "z-ai/glm-4-flash",
  gemini: "gemini-2.5-flash",
};

/** JD structured extract (`generateObject`) defaults per system provider. */
export const SYSTEM_JD_EXTRACT_MODEL_DEFAULTS: Record<SystemPoolProvider, string> = {
  deepseek: "deepseek-chat",
  openrouter: "z-ai/glm-4-flash",
  gemini: "gemini-2.5-flash-lite",
};

export const DEFAULT_SYSTEM_POOL_PROVIDER: SystemPoolProvider = "deepseek";

export function isSystemPoolProvider(value: string): value is SystemPoolProvider {
  return (SYSTEM_POOL_PROVIDERS as readonly string[]).includes(value);
}

export function parseSystemPoolProvider(
  value: unknown,
  fallback: SystemPoolProvider = DEFAULT_SYSTEM_POOL_PROVIDER,
): SystemPoolProvider {
  if (typeof value === "string" && isAiProvider(value) && isSystemPoolProvider(value)) {
    return value;
  }
  return fallback;
}

export function resolveSystemResumeModel(
  provider: SystemPoolProvider,
  override?: string,
): string {
  const trimmed = override?.trim();
  if (trimmed) return trimmed;
  return SYSTEM_RESUME_MODEL_DEFAULTS[provider];
}

export function resolveSystemJdExtractModel(
  provider: SystemPoolProvider,
  override?: string,
): string {
  const trimmed = override?.trim();
  if (trimmed) return trimmed;
  return SYSTEM_JD_EXTRACT_MODEL_DEFAULTS[provider];
}

export function defaultSlotModelForProvider(provider: SystemPoolProvider): string {
  return SYSTEM_JD_EXTRACT_MODEL_DEFAULTS[provider];
}

/** Env var for comma-separated system pool keys — e.g. `EASYSUBMIT_SYSTEM_DEEPSEEK_API_KEYS`. */
export function systemPoolEnvKeysVar(provider: SystemPoolProvider): string {
  return `EASYSUBMIT_SYSTEM_${provider.toUpperCase()}_API_KEYS`;
}

/** Legacy single-key env var (Gemini only). */
export function systemPoolEnvKeyVar(provider: SystemPoolProvider): string {
  return `EASYSUBMIT_SYSTEM_${provider.toUpperCase()}_API_KEY`;
}
