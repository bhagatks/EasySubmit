import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  igniteEngineVault,
  type IgniteEngineVaultResult,
} from "@/app/actions/ai/ignition";
import {
  discoverAiModels,
  type DiscoverAiModelsResult,
} from "@/app/actions/ai/discovery";
import {
  formatIgnitionLockMessage,
  isProviderAuthFailureCode,
  type IgnitionLockSource,
  type LockIgnitionInput,
} from "@/src/lib/ai/ignition-guard";
import {
  clearSessionApiKeyVault,
  encryptSessionApiKey,
  getDecryptedSessionApiKey,
  readSessionApiKeyCipher,
  writeSessionApiKeyCipher,
} from "@/src/lib/ai/session-key-vault";
import { getServiceEntry, SYSTEM_DEFAULTS, type AiProvider } from "@/src/lib/config/app.config";
import {
  intersectCareerGradeModels,
  suggestPrimaryFuel,
  type HandshakeProvider,
} from "@/src/lib/config/career-grade-models";
import { writeLastDiscoveryTimestamp } from "@/src/lib/ai/discovery-timing";
import { getCachedModelsForProvider } from "@/src/lib/config/model-cache";

export type IgnitionProvider = AiProvider;
export type IgnitionDiscoveryStatus = "idle" | "handshaking" | "ready" | "error";

export type IgnitionStoreState = {
  /** False until persist + session key vault have finished rehydrating. */
  _hasHydrated: boolean;
  isLocked: boolean;
  /** AES-GCM ciphertext — never plain text. Cleared on lock(). */
  apiKey: string;
  provider: IgnitionProvider | null;
  availableModels: string[];
  activeModel: string | null;
  lockReason: string | null;
  lockSource: IgnitionLockSource | null;
  discoveryStatus: IgnitionDiscoveryStatus;
  discoveryError: string | null;
  recommendedModel: string | null;
  discoveredAt: number | null;
};

type IgnitionStoreActions = {
  unlock: (key: string, provider: IgnitionProvider, models: string[]) => Promise<void>;
  lock: (reason?: string) => void;
  setActiveModel: (modelId: string) => void;
  hydrateSessionApiKey: () => Promise<void>;
  getPlainApiKey: () => Promise<string | null>;
  runDiscovery: (
    provider: HandshakeProvider,
    apiKey: string,
    options?: { setAsActive?: boolean },
  ) => Promise<IgniteEngineVaultResult>;
  restoreDiscoveryFromCache: (
    provider: HandshakeProvider,
    apiKey: string,
    models: string[],
  ) => Promise<void>;
  lockIgnition: (input: LockIgnitionInput) => void;
  unlockIgnition: () => void;
  reportProviderAuthFailure: (message?: string, code?: string) => void;
  reportMissingApiKey: (message?: string) => void;
  isIgnitionComplete: () => boolean;
  /** Rebuild in-memory discovery state from persisted prefs + session key vault. */
  restoreIgnitionFromSession: () => Promise<boolean>;
  resetIgnition: () => void;
  /** @deprecated Use setActiveModel */
  setPrimaryFuel: (modelId: string) => void;
  /** @deprecated Use unlock flow */
  setProvider: (provider: HandshakeProvider) => void;
  applyDiscoveryResult: (result: DiscoverAiModelsResult) => void;
};

export type IgnitionStore = IgnitionStoreState & IgnitionStoreActions;

const PREFERENCES_STORAGE_KEY = "easysubmit-ignition-prefs";

const memoryPreferenceStorage = new Map<string, string>();

function createPreferencesStorage() {
  if (typeof window !== "undefined" && window.localStorage) {
    return createJSONStorage(() => localStorage);
  }

  return createJSONStorage(() => ({
    getItem: (name) => memoryPreferenceStorage.get(name) ?? null,
    setItem: (name, value) => {
      memoryPreferenceStorage.set(name, value);
    },
    removeItem: (name) => {
      memoryPreferenceStorage.delete(name);
    },
  }));
}

export const INITIAL_IGNITION_STORE: IgnitionStoreState = {
  _hasHydrated: false,
  isLocked: false,
  apiKey: "",
  provider: null,
  availableModels: [],
  activeModel: null,
  lockReason: null,
  lockSource: null,
  discoveryStatus: "idle",
  discoveryError: null,
  recommendedModel: null,
  discoveredAt: null,
};

function pickActiveModel(
  provider: IgnitionProvider,
  models: string[],
  preferred: string | null,
): string | null {
  if (preferred && models.includes(preferred)) return preferred;
  if (provider === SYSTEM_DEFAULTS.targetAiProvider && models.includes(SYSTEM_DEFAULTS.targetAiModel)) {
    return SYSTEM_DEFAULTS.targetAiModel;
  }
  return suggestPrimaryFuel(provider as HandshakeProvider, models) || models[0] || null;
}

export const useIgnitionStore = create<IgnitionStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_IGNITION_STORE,

      unlock: async (key, provider, models) => {
        const encrypted = await encryptSessionApiKey(key);
        writeSessionApiKeyCipher(encrypted);

        const activeModel = pickActiveModel(provider, models, get().activeModel);

        set({
          isLocked: false,
          apiKey: encrypted,
          provider,
          availableModels: models,
          activeModel,
          lockReason: null,
          lockSource: null,
          discoveryStatus: "ready",
          discoveryError: null,
          recommendedModel: suggestPrimaryFuel(provider as HandshakeProvider, models),
          discoveredAt: Date.now(),
        });
      },

      lock: (reason) => {
        clearSessionApiKeyVault();
        set({
          isLocked: true,
          apiKey: "",
          availableModels: [],
          discoveryStatus: "idle",
          discoveryError: null,
          lockReason: reason ?? formatIgnitionLockMessage("manual"),
          lockSource: "manual",
        });
      },

      setActiveModel: (modelId) => {
        const trimmed = modelId.trim();
        if (!trimmed) return;
        const { availableModels } = get();
        if (availableModels.length > 0 && !availableModels.includes(trimmed)) return;
        set({ activeModel: trimmed });
      },

      hydrateSessionApiKey: async () => {
        const cipher = readSessionApiKeyCipher();
        if (!cipher) {
          set((state) => ({
            ...state,
            apiKey: "",
          }));
          return;
        }

        const plain = await getDecryptedSessionApiKey(cipher);
        set((state) => ({
          ...state,
          apiKey: plain ? cipher : "",
        }));
      },

      getPlainApiKey: async () => getDecryptedSessionApiKey(get().apiKey),

      runDiscovery: async (provider, apiKey, options) => {
        set({
          provider,
          discoveryStatus: "handshaking",
          discoveryError: null,
          availableModels: [],
          activeModel: null,
          recommendedModel: null,
          discoveredAt: null,
        });

        const result = await igniteEngineVault({
          rawKey: apiKey,
          provider,
          setAsActive: options?.setAsActive ?? true,
        });

        if (result.success && result.unlocked) {
          await get().unlock(apiKey, result.provider, result.models);
          writeLastDiscoveryTimestamp(result.discoveredAt);
          set({
            recommendedModel: result.suggestedPrimaryFuel,
            activeModel: result.suggestedPrimaryFuel,
            discoveredAt: result.discoveredAt,
          });
        } else if (!result.success) {
          const terminalMessage = result.terminalLine ?? result.error;
          set({
            discoveryStatus: "error",
            discoveryError: terminalMessage,
            availableModels: [],
            activeModel: null,
            recommendedModel: null,
            apiKey: "",
          });
          clearSessionApiKeyVault();
        }

        return result;
      },

      restoreDiscoveryFromCache: async (provider, apiKey, models) => {
        const careerModels = intersectCareerGradeModels(provider, models);
        if (careerModels.length === 0) {
          throw new Error("No career-grade models in cached catalog.");
        }

        await get().unlock(apiKey, provider, careerModels);
        set({
          recommendedModel: suggestPrimaryFuel(provider, careerModels),
          activeModel: pickActiveModel(provider, careerModels, get().activeModel),
          discoveryStatus: "ready",
          discoveryError: null,
        });
      },

      lockIgnition: ({ reason, source = "manual" }) => {
        clearSessionApiKeyVault();
        set({
          isLocked: true,
          apiKey: "",
          availableModels: [],
          discoveryStatus: "idle",
          lockReason: formatIgnitionLockMessage(source, reason),
          lockSource: source,
        });
      },

      unlockIgnition: () => {
        set({
          isLocked: false,
          lockReason: null,
          lockSource: null,
        });
      },

      reportProviderAuthFailure: (message, code) => {
        if (code && !isProviderAuthFailureCode(code)) return;
        get().lockIgnition({
          reason: formatIgnitionLockMessage("auth_failure", message),
          source: "auth_failure",
        });
      },

      reportMissingApiKey: (message) => {
        get().lockIgnition({
          reason: formatIgnitionLockMessage("missing_key", message),
          source: "missing_key",
        });
      },

      isIgnitionComplete: () => {
        const state = get();
        return Boolean(
          !state.isLocked &&
            state.provider &&
            state.apiKey &&
            state.activeModel &&
            state.availableModels.includes(state.activeModel),
        );
      },

      restoreIgnitionFromSession: async () => {
        const state = get();
        if (state.isIgnitionComplete()) return true;
        if (!state.provider || !state.activeModel) return false;

        const cipher = state.apiKey || readSessionApiKeyCipher();
        if (!cipher) return false;

        const plain = await getDecryptedSessionApiKey(cipher);
        if (!plain) return false;

        const cachedModels = getCachedModelsForProvider(state.provider);
        if (cachedModels.length === 0) return false;

        try {
          await get().restoreDiscoveryFromCache(
            state.provider as HandshakeProvider,
            plain,
            cachedModels,
          );
          return get().isIgnitionComplete();
        } catch {
          const careerModels = intersectCareerGradeModels(
            state.provider as HandshakeProvider,
            cachedModels,
          );
          if (careerModels.length === 0) return false;

          const activeModel = careerModels.includes(state.activeModel)
            ? state.activeModel
            : pickActiveModel(state.provider, careerModels, state.activeModel);

          set({
            isLocked: false,
            apiKey: cipher,
            availableModels: careerModels,
            activeModel,
            discoveryStatus: "ready",
            discoveryError: null,
            lockReason: null,
            lockSource: null,
            recommendedModel: suggestPrimaryFuel(state.provider as HandshakeProvider, careerModels),
          });

          return get().isIgnitionComplete();
        }
      },

      resetIgnition: () => {
        clearSessionApiKeyVault();
        set({ ...INITIAL_IGNITION_STORE });
      },

      setPrimaryFuel: (modelId) => {
        get().setActiveModel(modelId);
      },

      setProvider: (provider) => {
        set({
          provider,
          availableModels: [],
          activeModel: null,
          recommendedModel: null,
          discoveryStatus: "idle",
          discoveryError: null,
          discoveredAt: null,
        });
      },

      applyDiscoveryResult: (result) => {
        if (!result.success) {
          set({
            discoveryStatus: "error",
            discoveryError: result.error,
            availableModels: [],
            activeModel: null,
            recommendedModel: null,
            isLocked: true,
            apiKey: "",
          });
          clearSessionApiKeyVault();
          return;
        }

        set({
          provider: result.provider,
          availableModels: result.models,
          activeModel: result.suggestedPrimaryFuel,
          recommendedModel: result.suggestedPrimaryFuel,
          discoveryStatus: "ready",
          discoveryError: null,
          discoveredAt: result.discoveredAt,
        });
      },
    }),
    {
      name: PREFERENCES_STORAGE_KEY,
      version: 1,
      storage: createPreferencesStorage(),
      partialize: (state) => ({
        provider: state.provider,
        activeModel: state.activeModel,
      }),
      onRehydrateStorage: () => (state, error) => {
        void (async () => {
          if (state && !error) {
            await state.hydrateSessionApiKey();
            await state.restoreIgnitionFromSession();
          }
          useIgnitionStore.setState({ _hasHydrated: true });
        })();
      },
    },
  ),
);

/** Display label for the active provider (Ignition Gate UI). */
export function getIgnitionProviderLabel(provider: IgnitionProvider | null): string | null {
  if (!provider) return null;
  return getServiceEntry(provider).label;
}

/** @deprecated Legacy alias */
export const INITIAL_IGNITION_STATE = INITIAL_IGNITION_STORE;

/** Compatibility selectors for components migrating from the legacy store shape. */
export function selectDiscoveredModels(state: IgnitionStore): string[] {
  return state.availableModels;
}

export function selectPrimaryFuel(state: IgnitionStore): string | null {
  return state.activeModel;
}

export function selectHandshakeValidated(state: IgnitionStore): boolean {
  return !state.isLocked && state.availableModels.length > 0 && Boolean(state.apiKey);
}
