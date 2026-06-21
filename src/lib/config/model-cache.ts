/**
 * In-memory model catalog with optional persisted cache.
 * Optional local persistence only — no realtime sync layer.
 */
import {
  AI_MODELS_CACHE_KEY,
  ALL_AI_PROVIDERS,
  buildDefaultModelCatalog,
  getDefaultModelsForProvider,
  SYSTEM_DEFAULTS,
  type AiModelsCache,
  type AiProvider,
} from "@/src/lib/config/app.config";
import { fetchProviderModelsFromApi } from "@/src/lib/config/model-discovery";

export interface ModelCacheStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const memoryStorage = new Map<string, string>();

const noopStorage: ModelCacheStorage = {
  async getItem() {
    return null;
  },
  async setItem(_key, value) {
    memoryStorage.set(_key, value);
  },
  async removeItem(key) {
    memoryStorage.delete(key);
  },
};

function createLocalStorageAdapter(): ModelCacheStorage | null {
  if (typeof window === "undefined") return null;
  try {
    const { localStorage } = window;
    return {
      async getItem(key) {
        return localStorage.getItem(key);
      },
      async setItem(key, value) {
        localStorage.setItem(key, value);
      },
      async removeItem(key) {
        localStorage.removeItem(key);
      },
    };
  } catch {
    return null;
  }
}

let storageAdapter: ModelCacheStorage = createLocalStorageAdapter() ?? noopStorage;
let memoryCatalog: Record<AiProvider, string[]> | null = null;
let backgroundTimer: ReturnType<typeof setInterval> | null = null;

export function setModelCacheStorage(adapter: ModelCacheStorage): void {
  storageAdapter = adapter;
}

function hoursToMs(hours: number): number {
  return hours * 60 * 60 * 1000;
}

function shouldAlwaysRefreshModels(): boolean {
  return SYSTEM_DEFAULTS.aiModelsUpdateHours === 0;
}

function applyMemoryCatalog(catalog: Record<AiProvider, string[]>): void {
  memoryCatalog = catalog;
}

async function readPersistedCatalog(): Promise<Record<AiProvider, string[]> | null> {
  try {
    const raw = await storageAdapter.getItem(AI_MODELS_CACHE_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw) as AiModelsCache;
    const catalog = buildDefaultModelCatalog();
    for (const provider of ALL_AI_PROVIDERS) {
      const models = payload[provider];
      if (Array.isArray(models) && models.length > 0) {
        catalog[provider] = models;
      }
    }
    return catalog;
  } catch {
    return null;
  }
}

async function persistCatalog(catalog: Record<AiProvider, string[]>): Promise<void> {
  if (shouldAlwaysRefreshModels()) return;
  const payload: AiModelsCache = { ...catalog, updatedAt: Date.now() };
  await storageAdapter.setItem(AI_MODELS_CACHE_KEY, JSON.stringify(payload));
}

/** Synchronous read — serves from memory with zero latency. */
export function getCachedModels(): Record<AiProvider, string[]> {
  if (memoryCatalog) return memoryCatalog;
  return buildDefaultModelCatalog();
}

export function getCachedModelsForProvider(provider: AiProvider): string[] {
  return getCachedModels()[provider] ?? getDefaultModelsForProvider(provider);
}

export async function updateCachedProviderModels(
  provider: AiProvider,
  models: string[],
): Promise<void> {
  const catalog = { ...getCachedModels(), [provider]: models };
  applyMemoryCatalog(catalog);
  await persistCatalog(catalog);
}

export type RefreshModelCacheOptions = {
  apiKeys?: Partial<Record<AiProvider, string>>;
  activeProvider?: AiProvider;
  activeApiKey?: string;
};

export async function refreshModelCache(
  options: RefreshModelCacheOptions = {},
): Promise<Record<AiProvider, string[]>> {
  const persisted = shouldAlwaysRefreshModels()
    ? null
    : (memoryCatalog ?? (await readPersistedCatalog()));
  const base = persisted ?? buildDefaultModelCatalog();
  const { activeProvider, activeApiKey, apiKeys = {} } = options;

  const entries = await Promise.all(
    ALL_AI_PROVIDERS.map(async (provider) => {
      const key =
        (activeProvider === provider ? activeApiKey : undefined)?.trim() ||
        apiKeys[provider]?.trim() ||
        "";

      if (!key) {
        if (base[provider]?.length) {
          return [provider, base[provider]] as const;
        }
        return [provider, getDefaultModelsForProvider(provider)] as const;
      }

      const fromApi = await fetchProviderModelsFromApi(provider, key);
      if (fromApi?.length) {
        return [provider, fromApi] as const;
      }
      if (base[provider]?.length) {
        return [provider, base[provider]] as const;
      }
      return [provider, getDefaultModelsForProvider(provider)] as const;
    }),
  );

  const catalog = Object.fromEntries(entries) as Record<AiProvider, string[]>;
  applyMemoryCatalog(catalog);
  await persistCatalog(catalog);
  return catalog;
}

export async function bootstrapModelCache(
  options: RefreshModelCacheOptions = {},
): Promise<void> {
  await hydrateModelCacheFromStorage();
  scheduleBackgroundModelRefresh(SYSTEM_DEFAULTS.aiModelsUpdateHours);

  if (shouldAlwaysRefreshModels() || !memoryCatalog) {
    await refreshModelCache(options);
  }
}

export async function hydrateModelCacheFromStorage(): Promise<void> {
  if (memoryCatalog || shouldAlwaysRefreshModels()) return;
  const persisted = await readPersistedCatalog();
  if (persisted) {
    applyMemoryCatalog(persisted);
  }
}

function clearBackgroundTimer(): void {
  if (backgroundTimer) {
    clearInterval(backgroundTimer);
    backgroundTimer = null;
  }
}

export function scheduleBackgroundModelRefresh(intervalHours: number): void {
  clearBackgroundTimer();
  if (intervalHours <= 0) return;

  backgroundTimer = setInterval(() => {
    void refreshModelCache().catch(() => {
      /* scheduled refresh is best-effort */
    });
  }, hoursToMs(intervalHours));
}

export function stopBackgroundModelRefresh(): void {
  clearBackgroundTimer();
}

export async function clearAiModelsCache(): Promise<void> {
  stopBackgroundModelRefresh();
  memoryCatalog = null;
  await storageAdapter.removeItem(AI_MODELS_CACHE_KEY);
}
