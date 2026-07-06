import { prisma } from "@/lib/prisma";
import { unvaultSystemApiKey } from "@/lib/vault/system-key-vault";
import { mapEnhanceProviderError } from "@/src/lib/ai/engine/map-enhance-provider-error";
import {
  isKeyCooling,
  markKeyCooling,
  resetPoolCooldownForTests,
} from "@/src/lib/ai/engine/pool-cooldown";
import {
  DEEPSEEK_OVERFLOW_SLOT,
  FREE_SLOT_DAILY_CALL_CAP,
  MAX_POOL_ATTEMPTS,
  OPENROUTER_FREE_SLOT,
  PLATFORM_DAILY_CALL_CAP,
  slotLabelForIndex,
  type SystemBillingMode,
} from "@/src/lib/ai/engine/pool-constants";
import {
  defaultBillingModeForSlot,
  defaultSlotModelForProvider,
  defaultSlotProviderForIndex,
  parseSystemPoolProvider,
  systemPoolEnvKeyVar,
  systemPoolEnvKeysVar,
  type SystemPoolProvider,
} from "@/src/lib/ai/engine/system-model-defaults";
import {
  incrementGlobalDeepSeekPaidCall,
  incrementGlobalOpenRouterCall,
} from "@/src/lib/ai/engine/global-system-quota";
import {
  isOpenRouterFreeFailureStatus,
  OpenRouterFreeGuardError,
} from "@/src/lib/ai/engine/openrouter-free-adapter";
import {
  getTodayPacificDateString,
  nextPacificMidnight,
} from "@/src/lib/ai/engine/pacific-time";
import type { AiEngineConfig } from "@/src/lib/services/ai-engine-config";
import { AI_ENGINE_DEFAULTS } from "@/src/lib/services/ai-engine-config";

type EnvMockSlot = {
  label: string;
  billingMode: SystemBillingMode;
  provider: SystemPoolProvider;
  modelId: string;
  callsToday: number;
  exhaustedUntil: Date | null;
  quotaResetDate: string;
  enabled: boolean;
};

export type SystemSlotRow = {
  slot: number;
  label: string;
  enabled: boolean;
  provider: SystemPoolProvider;
  billingMode: SystemBillingMode;
  modelId: string;
  callsToday: number;
  exhaustedUntil: Date | null;
  quotaResetDate: string;
  source: "vault" | "env";
};

export type PoolCallMeta = {
  slot: number;
  label: string;
  provider: SystemPoolProvider;
  billingMode: SystemBillingMode;
  modelId: string;
  keySource: "vault" | "env";
};

export type PoolCallResult<T> = PoolCallMeta & {
  result: T;
};

export type SystemKeyPoolErrorCode = "capacity_exhausted" | "pool_exhausted";

export class SystemKeyPoolError extends Error {
  readonly code: SystemKeyPoolErrorCode;

  constructor(code: SystemKeyPoolErrorCode, message: string) {
    super(message);
    this.name = "SystemKeyPoolError";
    this.code = code;
  }
}

const envMockSlots = new Map<number, EnvMockSlot>();
let roundRobinIndex = 0;

function slotProviderForIndex(slot: number, rowProvider?: string | null): SystemPoolProvider {
  if (rowProvider) {
    return parseSystemPoolProvider(rowProvider, defaultSlotProviderForIndex(slot));
  }
  return defaultSlotProviderForIndex(slot);
}

function slotBillingModeForIndex(
  slot: number,
  rowBillingMode?: string | null,
): SystemBillingMode {
  if (rowBillingMode === "paid" || rowBillingMode === "free") {
    return rowBillingMode;
  }
  return defaultBillingModeForSlot(slot);
}

function slotModelForRow(slot: number, provider: SystemPoolProvider, modelId?: string | null): string {
  const trimmed = modelId?.trim();
  if (trimmed) return trimmed;
  return defaultSlotModelForProvider(provider, slot);
}

function parseEnvSystemKeys(provider: SystemPoolProvider): string[] {
  const keysVar = systemPoolEnvKeysVar(provider);
  const keyVar = systemPoolEnvKeyVar(provider);
  const raw =
    process.env[keysVar]?.trim() ||
    process.env[keyVar]?.trim() ||
    (provider === "gemini"
      ? process.env.EASYSUBMIT_SYSTEM_GEMINI_API_KEYS?.trim() ||
        process.env.EASYSUBMIT_SYSTEM_GEMINI_API_KEY?.trim() ||
        ""
      : "");
  if (!raw) return [];
  return raw
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
}

function ensureEnvMockSlot(slot: number): EnvMockSlot {
  const existing = envMockSlots.get(slot);
  if (existing) return existing;

  const provider = defaultSlotProviderForIndex(slot);
  const today = getTodayPacificDateString();
  const created: EnvMockSlot = {
    label: slotLabelForIndex(slot),
    billingMode: defaultBillingModeForSlot(slot),
    provider,
    modelId: defaultSlotModelForProvider(provider, slot),
    callsToday: 0,
    exhaustedUntil: null,
    quotaResetDate: today,
    enabled: true,
  };
  envMockSlots.set(slot, created);
  return created;
}

export function markSystemKeyRateLimited(slot: number, cooldownMs = 60_000): void {
  markKeyCooling(slot, cooldownMs);
}

export function resetSystemKeyPoolForTests(): void {
  resetPoolCooldownForTests();
  envMockSlots.clear();
  roundRobinIndex = 0;
}

/** Test helper — toggle slot billing mode in env mock mode. */
export function setEnvSlotBillingModeForTests(
  slot: number,
  billingMode: SystemBillingMode,
): void {
  const mock = ensureEnvMockSlot(slot);
  mock.billingMode = billingMode;
}

export function isRetryableProviderStatus(status: number): boolean {
  return status === 429 || status === 503 || status === 502 || status === 500;
}

type ProviderFailureKind = "rpm" | "daily_quota" | "transient" | "fatal";

function classifyProviderFailure(err: unknown): {
  kind: ProviderFailureKind;
  status?: number;
  retryAfterSec?: number;
  message: string;
} {
  if (err instanceof OpenRouterFreeGuardError) {
    const status = err.status;
    if (status === 429) {
      return {
        kind: "rpm",
        status,
        message: err.message,
      };
    }
    if (status != null && isOpenRouterFreeFailureStatus(status)) {
      return { kind: "transient", status, message: err.message };
    }
    if (status === 402) {
      return { kind: "daily_quota", status, message: err.message };
    }
    return { kind: "fatal", status, message: err.message };
  }

  const message = err instanceof Error ? err.message : String(err);
  const status = (err as { status?: number }).status;
  const mapped = mapEnhanceProviderError(err, { aiMode: "system" });

  if (mapped.code === "insufficient_quota") {
    return {
      kind: "daily_quota",
      status,
      retryAfterSec: mapped.retryAfterSec,
      message: mapped.rawMessage,
    };
  }

  if (mapped.code === "rate_limited") {
    return {
      kind: "rpm",
      status,
      retryAfterSec: mapped.retryAfterSec,
      message: mapped.rawMessage,
    };
  }

  if (
    status === 503 ||
    status === 502 ||
    status === 500 ||
    /timeout|timed out|ETIMEDOUT|ECONNRESET|fetch failed/i.test(message)
  ) {
    return { kind: "transient", status, message };
  }

  return { kind: "fatal", status, message };
}

async function resetSlotQuotaIfNeeded(row: SystemSlotRow): Promise<SystemSlotRow> {
  const today = getTodayPacificDateString();
  if (row.quotaResetDate && today <= row.quotaResetDate) {
    return row;
  }

  if (row.source === "env") {
    const mock = ensureEnvMockSlot(row.slot);
    mock.callsToday = 0;
    mock.exhaustedUntil = null;
    mock.quotaResetDate = today;
    return {
      ...row,
      callsToday: 0,
      exhaustedUntil: null,
      quotaResetDate: today,
    };
  }

  await prisma.systemApiKey.update({
    where: { slot: row.slot },
    data: {
      callsToday: 0,
      exhaustedUntil: null,
      quotaResetDate: today,
    },
  });

  return {
    ...row,
    callsToday: 0,
    exhaustedUntil: null,
    quotaResetDate: today,
  };
}

async function loadSystemSlots(config?: AiEngineConfig): Promise<SystemSlotRow[]> {
  const maxSlots = config?.system.maxKeySlots ?? AI_ENGINE_DEFAULTS.system.maxKeySlots;
  const today = getTodayPacificDateString();

  const rows = await prisma.systemApiKey.findMany({
    where: { enabled: true, slot: { lt: maxSlots } },
    orderBy: { slot: "asc" },
  });

  if (rows.length > 0) {
    const slots: SystemSlotRow[] = [];
    for (const row of rows) {
      const provider = slotProviderForIndex(row.slot, row.provider);
      const billingMode = slotBillingModeForIndex(row.slot, row.billingMode);
      const base: SystemSlotRow = {
        slot: row.slot,
        label: row.label?.trim() || slotLabelForIndex(row.slot),
        enabled: row.enabled,
        provider,
        billingMode,
        modelId: slotModelForRow(row.slot, provider, row.modelId),
        callsToday: row.callsToday,
        exhaustedUntil: row.exhaustedUntil,
        quotaResetDate: row.quotaResetDate ?? today,
        source: "vault",
      };
      slots.push(await resetSlotQuotaIfNeeded(base));
    }
    return slots.sort((a, b) => a.slot - b.slot);
  }

  const openRouterKeys = parseEnvSystemKeys("openrouter");
  const deepSeekKeys = parseEnvSystemKeys("deepseek");
  const slots: SystemSlotRow[] = [];

  if (openRouterKeys[0] && maxSlots > OPENROUTER_FREE_SLOT) {
    const mock = ensureEnvMockSlot(OPENROUTER_FREE_SLOT);
    slots.push(
      await resetSlotQuotaIfNeeded({
        slot: OPENROUTER_FREE_SLOT,
        label: mock.label,
        enabled: mock.enabled,
        provider: "openrouter",
        billingMode: "free",
        modelId: mock.modelId,
        callsToday: mock.callsToday,
        exhaustedUntil: mock.exhaustedUntil,
        quotaResetDate: mock.quotaResetDate,
        source: "env",
      }),
    );
  }

  if (deepSeekKeys[0] && maxSlots > DEEPSEEK_OVERFLOW_SLOT) {
    const mock = ensureEnvMockSlot(DEEPSEEK_OVERFLOW_SLOT);
    slots.push(
      await resetSlotQuotaIfNeeded({
        slot: DEEPSEEK_OVERFLOW_SLOT,
        label: mock.label,
        enabled: mock.enabled,
        provider: "deepseek",
        billingMode: "paid",
        modelId: slotModelForRow(DEEPSEEK_OVERFLOW_SLOT, "deepseek", mock.modelId),
        callsToday: mock.callsToday,
        exhaustedUntil: mock.exhaustedUntil,
        quotaResetDate: mock.quotaResetDate,
        source: "env",
      }),
    );
  }

  return slots;
}

function buildAttemptOrder(
  slots: SystemSlotRow[],
  now: Date,
  options: { preferredSlot?: number },
): number[] {
  const bySlot = new Map(slots.map((slot) => [slot.slot, slot]));
  const orderedSlots = [OPENROUTER_FREE_SLOT, DEEPSEEK_OVERFLOW_SLOT]
    .map((slotIndex) => bySlot.get(slotIndex))
    .filter(
      (slot): slot is SystemSlotRow =>
        Boolean(slot?.enabled && isSlotHealthy(slot, now)),
    );

  let ordered = orderedSlots.map((slot) => slot.slot);

  if (options.preferredSlot != null) {
    const preferred = bySlot.get(options.preferredSlot);
    if (preferred && ordered.includes(options.preferredSlot) && isSlotHealthy(preferred, now)) {
      ordered = [
        options.preferredSlot,
        ...ordered.filter((slot) => slot !== options.preferredSlot),
      ];
    }
  }

  return ordered.slice(0, MAX_POOL_ATTEMPTS);
}

async function resolveApiKey(slot: SystemSlotRow): Promise<string | null> {
  if (slot.source === "env") {
    const keys = parseEnvSystemKeys(slot.provider);
    if (slot.slot === OPENROUTER_FREE_SLOT) {
      return keys[0]?.trim() || null;
    }
    if (slot.slot === DEEPSEEK_OVERFLOW_SLOT) {
      return keys[0]?.trim() || null;
    }
    return keys[slot.slot]?.trim() || null;
  }
  return unvaultSystemApiKey(slot.slot);
}

function platformCallsToday(slots: SystemSlotRow[]): number {
  return slots.reduce((sum, slot) => sum + slot.callsToday, 0);
}

function isSlotHealthy(slot: SystemSlotRow, now: Date): boolean {
  if (!slot.enabled) return false;
  if (isKeyCooling(slot.slot)) return false;
  if (slot.exhaustedUntil && slot.exhaustedUntil > now) return false;
  if (slot.billingMode === "free" && slot.callsToday >= FREE_SLOT_DAILY_CALL_CAP) {
    return false;
  }
  return true;
}

async function markSlotDailyExhausted(slot: SystemSlotRow): Promise<void> {
  const exhaustedUntil = nextPacificMidnight();
  if (slot.source === "env") {
    const mock = ensureEnvMockSlot(slot.slot);
    mock.exhaustedUntil = exhaustedUntil;
    mock.callsToday = FREE_SLOT_DAILY_CALL_CAP;
    return;
  }

  await prisma.systemApiKey.update({
    where: { slot: slot.slot },
    data: {
      exhaustedUntil,
      callsToday: Math.max(slot.callsToday, FREE_SLOT_DAILY_CALL_CAP),
    },
  });
}

async function recordSlotSuccess(slot: SystemSlotRow): Promise<void> {
  if (slot.source === "env") {
    const mock = ensureEnvMockSlot(slot.slot);
    mock.callsToday += 1;
  } else {
    await prisma.systemApiKey.update({
      where: { slot: slot.slot },
      data: { callsToday: { increment: 1 } },
    });
  }

  if (slot.provider === "openrouter" && slot.billingMode === "free") {
    await incrementGlobalOpenRouterCall();
  } else if (slot.provider === "deepseek" && slot.billingMode === "paid") {
    await incrementGlobalDeepSeekPaidCall();
  }
}

export async function hasSystemPoolKeys(config?: AiEngineConfig): Promise<boolean> {
  const maxSlots = config?.system.maxKeySlots ?? AI_ENGINE_DEFAULTS.system.maxKeySlots;
  const vaulted = await prisma.systemApiKey.count({
    where: { enabled: true, slot: { lt: maxSlots } },
  });
  if (vaulted > 0) return true;
  if (maxSlots > OPENROUTER_FREE_SLOT && parseEnvSystemKeys("openrouter").length > 0) {
    return true;
  }
  if (maxSlots > DEEPSEEK_OVERFLOW_SLOT && parseEnvSystemKeys("deepseek").length > 0) {
    return true;
  }
  return false;
}

/** @deprecated Use `hasSystemPoolKeys`. */
export const hasSystemGeminiKeys = hasSystemPoolKeys;

/** True when at least one system slot can accept a call right now. */
export async function hasHealthySystemPoolSlot(
  config?: AiEngineConfig,
): Promise<boolean> {
  const slots = await loadSystemSlots(config);
  const now = new Date();
  return slots.some((slot) => isSlotHealthy(slot, now));
}

export type ExecuteWithPoolRetryOptions = {
  preferredSlot?: number;
  config?: AiEngineConfig;
};

/**
 * Acquire a system key per call, retrying up to three slots with failover.
 * Returns pool metadata alongside the caller's result.
 */
export async function executeWithPoolRetry<T>(
  fn: (input: {
    apiKey: string;
    modelId: string;
    slot: number;
    provider: SystemPoolProvider;
    billingMode: SystemBillingMode;
  }) => Promise<T>,
  options: ExecuteWithPoolRetryOptions = {},
): Promise<PoolCallResult<T>> {
  const slots = await loadSystemSlots(options.config);
  if (!slots.length) {
    throw new SystemKeyPoolError(
      "pool_exhausted",
      "No system AI keys are configured (OpenRouter free + DeepSeek overflow).",
    );
  }

  if (platformCallsToday(slots) >= PLATFORM_DAILY_CALL_CAP) {
    throw new SystemKeyPoolError(
      "capacity_exhausted",
      "EasySubmit AI daily capacity is exhausted. Try again tomorrow or add your own API key.",
    );
  }

  const now = new Date();
  const attemptOrder = buildAttemptOrder(slots, now, {
    preferredSlot: options.preferredSlot,
  });

  if (!attemptOrder.length) {
    throw new SystemKeyPoolError(
      "capacity_exhausted",
      "All EasySubmit AI keys are cooling down or exhausted for today.",
    );
  }

  const slotByIndex = new Map(slots.map((slot) => [slot.slot, slot]));
  const transientRetries = new Map<number, number>();

  for (const slotIndex of attemptOrder) {
    const slot = slotByIndex.get(slotIndex);
    if (!slot) continue;

    const apiKey = await resolveApiKey(slot);
    if (!apiKey) continue;

    try {
      const result = await fn({
        apiKey,
        modelId: slot.modelId,
        slot: slot.slot,
        provider: slot.provider,
        billingMode: slot.billingMode,
      });
      await recordSlotSuccess(slot);
      roundRobinIndex = (slot.slot + 1) % Math.max(slots.length, 1);

      return {
        result,
        slot: slot.slot,
        label: slot.label,
        provider: slot.provider,
        billingMode: slot.billingMode,
        modelId: slot.modelId,
        keySource: slot.source,
      };
    } catch (err) {
      const failure = classifyProviderFailure(err);

      if (failure.kind === "daily_quota") {
        await markSlotDailyExhausted(slot);
        continue;
      }

      if (failure.kind === "rpm") {
        const cooldownMs = failure.retryAfterSec
          ? failure.retryAfterSec * 1000
          : 60_000;
        markSystemKeyRateLimited(slot.slot, cooldownMs);
        continue;
      }

      if (failure.kind === "transient") {
        const retries = transientRetries.get(slot.slot) ?? 0;
        if (retries < 1) {
          transientRetries.set(slot.slot, retries + 1);
          try {
            const result = await fn({
              apiKey,
              modelId: slot.modelId,
              slot: slot.slot,
              provider: slot.provider,
              billingMode: slot.billingMode,
            });
            await recordSlotSuccess(slot);
            roundRobinIndex = (slot.slot + 1) % Math.max(slots.length, 1);
            return {
              result,
              slot: slot.slot,
              label: slot.label,
              provider: slot.provider,
              billingMode: slot.billingMode,
              modelId: slot.modelId,
              keySource: slot.source,
            };
          } catch {
            continue;
          }
        }
        continue;
      }

      continue;
    }
  }

  if (platformCallsToday(slots) >= PLATFORM_DAILY_CALL_CAP) {
    throw new SystemKeyPoolError(
      "capacity_exhausted",
      "EasySubmit AI daily capacity is exhausted. Try again tomorrow or add your own API key.",
    );
  }

  throw new SystemKeyPoolError(
    "pool_exhausted",
    "All EasySubmit AI keys failed or are temporarily unavailable.",
  );
}

/** @deprecated Use executeWithPoolRetry per API call. */
export async function acquireSystemGeminiKey(
  config?: AiEngineConfig,
): Promise<{ apiKey: string; slot: number; source: "vault" | "env" } | null> {
  try {
    const result = await executeWithPoolRetry(
      async ({ apiKey, slot }) => ({ apiKey, slot }),
      { config },
    );
    return { apiKey: result.result.apiKey, slot: result.slot, source: result.keySource };
  } catch {
    return null;
  }
}

export async function listSystemKeySlots(
  config?: AiEngineConfig,
): Promise<
  Array<{ slot: number; label: string | null; enabled: boolean; provider: string; source: "vault" }>
> {
  const maxSlots = config?.system.maxKeySlots ?? AI_ENGINE_DEFAULTS.system.maxKeySlots;
  const rows = await prisma.systemApiKey.findMany({
    where: { enabled: true, slot: { lt: maxSlots } },
    orderBy: { slot: "asc" },
    select: { slot: true, label: true, enabled: true, provider: true },
  });
  return rows.map((row) => ({ ...row, source: "vault" as const }));
}
