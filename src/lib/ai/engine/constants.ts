import { AI_ENGINE_DEFAULTS } from "@/src/lib/services/ai-engine-config";

/** @deprecated Use `getAppConfig('aiEngine')`. */
export const SYSTEM_AI_DAILY_ENHANCEMENT_LIMIT =
  AI_ENGINE_DEFAULTS.quotas.system.dailyUserEnhancements;

/** @deprecated Use `getAppConfig('aiEngine')`. */
export const SYSTEM_AI_DAILY_CALL_LIMIT = AI_ENGINE_DEFAULTS.quotas.system.dailyUserCalls;

/** @deprecated Use `getAppConfig('aiEngine').system.modelId`. Env override still supported. */
export const SYSTEM_GEMINI_MODEL =
  process.env.EASYSUBMIT_SYSTEM_GEMINI_MODEL?.trim() || AI_ENGINE_DEFAULTS.system.modelId;

export type AiSourcePreference = "auto" | "customer" | "system" | "disabled";

export type AiRouteMode = "customer" | "system";
