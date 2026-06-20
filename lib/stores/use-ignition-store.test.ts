import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/ai/ignition", () => ({
  igniteEngineVault: vi.fn(),
}));

vi.mock("@/app/actions/ai/discovery-service", () => ({
  runEngineDiscovery: vi.fn(),
}));

import { useIgnitionStore, INITIAL_IGNITION_STORE } from "@/src/stores/use-ignition-store";

function createStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
}

describe("useIgnitionStore", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", createStorageMock());
    useIgnitionStore.getState().resetIgnition();
  });

  it("unlock stores encrypted apiKey and clears lock", async () => {
    await useIgnitionStore.getState().unlock("sk-live-test", "openai", ["gpt-4o", "gpt-4o-mini"]);

    const state = useIgnitionStore.getState();
    expect(state.isLocked).toBe(false);
    expect(state.provider).toBe("openai");
    expect(state.availableModels).toEqual(["gpt-4o", "gpt-4o-mini"]);
    expect(state.activeModel).toBe("gpt-4o");
    expect(state.apiKey).not.toBe("sk-live-test");
    expect(state.apiKey.length).toBeGreaterThan(0);
  });

  it("lock clears session key material and forces gate", () => {
    useIgnitionStore.setState({
      ...INITIAL_IGNITION_STORE,
      isLocked: false,
      apiKey: "cipher-text",
      availableModels: ["gpt-4o"],
      activeModel: "gpt-4o",
      provider: "openai",
    });

    useIgnitionStore.getState().lock("Session expired");

    const state = useIgnitionStore.getState();
    expect(state.isLocked).toBe(true);
    expect(state.apiKey).toBe("");
    expect(state.availableModels).toEqual([]);
  });

  it("setActiveModel updates primary fuel when model is available", async () => {
    await useIgnitionStore.getState().unlock("sk-test", "anthropic", [
      "claude-3-5-sonnet-latest",
      "claude-3-opus-latest",
    ]);

    useIgnitionStore.getState().setActiveModel("claude-3-opus-latest");
    expect(useIgnitionStore.getState().activeModel).toBe("claude-3-opus-latest");
  });

  it("isIgnitionComplete requires unlocked state with active model", async () => {
    expect(useIgnitionStore.getState().isIgnitionComplete()).toBe(false);

    await useIgnitionStore.getState().unlock("sk-test", "openai", ["gpt-4o"]);
    expect(useIgnitionStore.getState().isIgnitionComplete()).toBe(true);
  });

  it("restoreDiscoveryFromCache unlocks without a server handshake", async () => {
    await useIgnitionStore.getState().restoreDiscoveryFromCache("openai", "sk-test", [
      "gpt-4o",
      "gpt-4o-mini",
      "text-embedding-3-small",
    ]);

    const state = useIgnitionStore.getState();
    expect(state.discoveryStatus).toBe("ready");
    expect(state.availableModels).toEqual(["gpt-4o", "gpt-4o-mini"]);
    expect(state.isIgnitionComplete()).toBe(true);
  });

  it("restoreIgnitionFromSession rebuilds models after persist rehydration", async () => {
    await useIgnitionStore.getState().unlock("sk-test", "openai", ["gpt-4o", "gpt-4o-mini"]);

    const cipher = useIgnitionStore.getState().apiKey;
    useIgnitionStore.setState({
      ...INITIAL_IGNITION_STORE,
      _hasHydrated: true,
      provider: "openai",
      activeModel: "gpt-4o",
      apiKey: cipher,
      availableModels: [],
      isLocked: false,
    });

    const restored = await useIgnitionStore.getState().restoreIgnitionFromSession();
    expect(restored).toBe(true);
    expect(useIgnitionStore.getState().isIgnitionComplete()).toBe(true);
    expect(useIgnitionStore.getState().availableModels).toContain("gpt-4o");
  });
});
