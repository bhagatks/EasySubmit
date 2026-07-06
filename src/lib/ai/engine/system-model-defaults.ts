import { isAiProvider, type AiProvider } from "@/src/lib/config/app.config";
import {
  DEEPSEEK_OVERFLOW_SLOT,
  type SystemBillingMode,
} from "@/src/lib/ai/engine/pool-constants";

/** Providers supported by the EasySubmit system key pool. */
export type SystemPoolProvider = Extract<AiProvider, "deepseek" | "openrouter" | "gemini">;

export const SYSTEM_POOL_PROVIDERS: readonly SystemPoolProvider[] = [
  "deepseek",
  "openrouter",
  "gemini",
];

/** Resume enhance (`generateText`) defaults per system provider. */
export const SYSTEM_RESUME_MODEL_DEFAULTS: Record<SystemPoolProvider, string> = {
  deepseek: "deepseek-v4-flash",
  openrouter: "openrouter/free",
  gemini: "gemini-2.5-flash",
};

/** JD structured extract (`generateObject`) defaults per system provider. */
export const SYSTEM_JD_EXTRACT_MODEL_DEFAULTS: Record<SystemPoolProvider, string> = {
  deepseek: "deepseek-v4-flash",
  openrouter: "openrouter/free",
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

export function defaultSlotModelForProvider(
  provider: SystemPoolProvider,
  slot?: number,
): string {
  if (provider === "openrouter" || slot === 0) {
    return SYSTEM_JD_EXTRACT_MODEL_DEFAULTS.openrouter;
  }
  return SYSTEM_JD_EXTRACT_MODEL_DEFAULTS[provider];
}

export function defaultSlotProviderForIndex(slot: number): SystemPoolProvider {
  return slot === DEEPSEEK_OVERFLOW_SLOT ? "deepseek" : "openrouter";
}

export function defaultBillingModeForSlot(slot: number): SystemBillingMode {
  return slot === DEEPSEEK_OVERFLOW_SLOT ? "paid" : "free";
}

/** Env var for comma-separated system pool keys — e.g. `EASYSUBMIT_SYSTEM_DEEPSEEK_API_KEYS`. */
export function systemPoolEnvKeysVar(provider: SystemPoolProvider): string {
  return `EASYSUBMIT_SYSTEM_${provider.toUpperCase()}_API_KEYS`;
}

/** Legacy single-key env var (Gemini only). */
export function systemPoolEnvKeyVar(provider: SystemPoolProvider): string {
  return `EASYSUBMIT_SYSTEM_${provider.toUpperCase()}_API_KEY`;
}
