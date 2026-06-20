import { describe, expect, it } from "vitest";
import {
  AI_PROVIDERS,
  ALL_AI_PROVIDERS,
  appConfig,
  buildDefaultModelCatalog,
  getDefaultModelsForProvider,
  getProviderConfig,
  getProviderHandshakeUrl,
  getProviderModelsUrl,
  isAiProvider,
  PROVIDER_REGISTRY,
} from "@/src/lib/config/ai-config";
import {
  getCachedModels,
  getCachedModelsForProvider,
  refreshModelCache,
  setModelCacheStorage,
} from "@/src/lib/config/model-cache";

describe("ai-config", () => {
  it("defines all supported providers with handshake URLs", () => {
    expect(ALL_AI_PROVIDERS).toHaveLength(6);
    expect(getProviderModelsUrl("openai")).toBe("https://api.openai.com/v1/models");
    expect(getProviderModelsUrl("anthropic")).toBe("https://api.anthropic.com/v1/models");
    expect(getProviderHandshakeUrl("groq")).toBe("https://api.groq.com/openai/v1/models");
    expect(getProviderModelsUrl("deepseek")).toBe("https://api.deepseek.com/v1/models");
    expect(getProviderModelsUrl("openrouter")).toBe("https://openrouter.ai/api/v1/models");
    expect(getProviderModelsUrl("gemini")).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models",
    );
  });

  it("exposes bundled default models per provider", () => {
    for (const provider of ALL_AI_PROVIDERS) {
      const defaults = getDefaultModelsForProvider(provider);
      expect(defaults.length).toBeGreaterThan(0);
      expect(defaults).toEqual([...PROVIDER_REGISTRY[provider].defaultModels]);
      expect(defaults).toEqual([...AI_PROVIDERS[provider].defaultModels]);
    }
  });

  it("builds a full default catalog", () => {
    const catalog = buildDefaultModelCatalog();
    expect(Object.keys(catalog).sort()).toEqual([...ALL_AI_PROVIDERS].sort());
  });

  it("validates provider ids", () => {
    expect(isAiProvider("openai")).toBe(true);
    expect(isAiProvider("deepseek")).toBe(true);
    expect(isAiProvider("grok")).toBe(false);
  });

  it("sets app defaults", () => {
    expect(appConfig.DEFAULT_AI_PROVIDER).toBe("gemini");
    expect(getProviderConfig("openai").label).toBe("OpenAI");
    expect(appConfig.DEFAULT_MODEL_BY_PROVIDER.openai).toBe("gpt-4o-mini");
  });
});

describe("model-cache", () => {
  it("serves bundled defaults when no API keys are supplied", async () => {
    const memory = new Map<string, string>();
    setModelCacheStorage({
      async getItem(key) {
        return memory.get(key) ?? null;
      },
      async setItem(key, value) {
        memory.set(key, value);
      },
      async removeItem(key) {
        memory.delete(key);
      },
    });

    const catalog = await refreshModelCache();
    expect(catalog.openai).toEqual(getDefaultModelsForProvider("openai"));
    expect(getCachedModelsForProvider("openrouter")).toEqual(
      getDefaultModelsForProvider("openrouter"),
    );
    expect(getCachedModels()).toEqual(catalog);
  });
});
