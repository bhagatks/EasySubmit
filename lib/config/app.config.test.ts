import { describe, expect, it } from "vitest";
import {
  AI_PROVIDERS,
  ALL_AI_PROVIDERS,
  APP_RUNTIME,
  appConfig,
  buildDefaultModelCatalog,
  getDefaultModelsForProvider,
  getMaxTokenBuffer,
  getProviderConfig,
  getProviderDocumentationUrl,
  getProviderHandshakeUrl,
  getProviderIconRef,
  getProviderModelsUrl,
  getProviderRegistryEntry,
  getTargetAiModel,
  isAiProvider,
  PROVIDER_REGISTRY,
  SERVICE_REGISTRY,
  SYSTEM_DEFAULTS,
} from "@/src/lib/config/app.config";

import { HANDSHAKE_PROVIDERS } from "@/src/lib/config/career-grade-models";

describe("app.config", () => {
  it("defines PROVIDER_REGISTRY with base URLs, handshake endpoints, icons, and docs", () => {
    expect(ALL_AI_PROVIDERS).toEqual([...HANDSHAKE_PROVIDERS]);
    expect(ALL_AI_PROVIDERS.length).toBeGreaterThanOrEqual(13);

    expect(PROVIDER_REGISTRY.openai.baseUrl).toBe("https://api.openai.com");
    expect(PROVIDER_REGISTRY.openai.handshakeEndpoint).toBe("/v1/models");
    expect(PROVIDER_REGISTRY.openai.icon).toBe("sparkles");

    expect(PROVIDER_REGISTRY.groq.baseUrl).toBe("https://api.groq.com/openai");
    expect(PROVIDER_REGISTRY.deepseek.handshakeEndpoint).toBe("/v1/models");
    expect(PROVIDER_REGISTRY.openrouter.documentationUrl).toContain("openrouter.ai");

    expect(getProviderHandshakeUrl("openai")).toBe("https://api.openai.com/v1/models");
    expect(getProviderModelsUrl("groq")).toBe("https://api.groq.com/openai/v1/models");
    expect(getProviderModelsUrl("openrouter")).toBe("https://openrouter.ai/api/v1/models");
    expect(getProviderModelsUrl("gemini")).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models",
    );
    expect(getProviderDocumentationUrl("anthropic")).toBe("https://docs.anthropic.com");
    expect(getProviderIconRef("deepseek")).toBe("brain");
    expect(getProviderRegistryEntry("openrouter").label).toBe("OpenRouter");
  });

  it("mirrors handshakeEndpoint into legacy SERVICE_REGISTRY.modelsPath", () => {
    for (const provider of ALL_AI_PROVIDERS) {
      expect(SERVICE_REGISTRY[provider].modelsPath).toBe(
        PROVIDER_REGISTRY[provider].handshakeEndpoint,
      );
    }
  });

  it("exposes SYSTEM_DEFAULTS for target model and token buffer", () => {
    expect(SYSTEM_DEFAULTS.targetAiProvider).toBe("gemini");
    expect(SYSTEM_DEFAULTS.targetAiModel).toBe("gemini-2.5-flash");
    expect(SYSTEM_DEFAULTS.maxTokenBuffer).toBe(8192);
    expect(getMaxTokenBuffer()).toBe(8192);
    expect(getTargetAiModel()).toBe("gemini-2.5-flash");
  });

  it("builds default model catalog from registry", () => {
    const catalog = buildDefaultModelCatalog();
    expect(Object.keys(catalog).sort()).toEqual([...ALL_AI_PROVIDERS].sort());
    for (const provider of ALL_AI_PROVIDERS) {
      expect(catalog[provider]).toEqual(getDefaultModelsForProvider(provider));
    }
  });

  it("validates provider ids", () => {
    expect(isAiProvider("openai")).toBe(true);
    expect(isAiProvider("mistral")).toBe(true);
    expect(isAiProvider("custom")).toBe(true);
    expect(isAiProvider("grok")).toBe(false);
  });

  it("keeps legacy appConfig shim in sync", () => {
    expect(appConfig.DEFAULT_AI_PROVIDER).toBe(SYSTEM_DEFAULTS.targetAiProvider);
    expect(appConfig.AI_MODELS_UPDATE_HOURS).toBe(SYSTEM_DEFAULTS.aiModelsUpdateHours);
    expect(appConfig.DASHBOARD_URL).toBe(APP_RUNTIME.DASHBOARD_URL);
    expect(getProviderConfig("openai")).toBe(SERVICE_REGISTRY.openai);
    expect(appConfig.DEFAULT_MODEL_BY_PROVIDER.openai).toBe(
      AI_PROVIDERS.openai.defaultModels[0],
    );
  });
});
