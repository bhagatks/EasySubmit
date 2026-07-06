import { describe, expect, it } from "vitest";
import {
  ALL_AI_PROVIDERS,
  getOpenAiCompatChatBaseUrl,
  getProviderRegistryEntry,
} from "@/src/lib/config/app.config";
import { HANDSHAKE_PROVIDERS } from "@/src/lib/config/career-grade-models";

describe("expanded BYOK providers", () => {
  it("registers all 13 spec providers in dropdown order", () => {
    expect(ALL_AI_PROVIDERS).toHaveLength(13);
    expect(HANDSHAKE_PROVIDERS).toEqual(ALL_AI_PROVIDERS);
    expect(ALL_AI_PROVIDERS[0]).toBe("gemini");
    expect(ALL_AI_PROVIDERS).toContain("mistral");
    expect(ALL_AI_PROVIDERS).toContain("custom");
  });

  it("labels new providers for the dropdown", () => {
    expect(getProviderRegistryEntry("zai").label).toBe("Z.ai (GLM)");
    expect(getProviderRegistryEntry("deepinfra").label).toBe("DeepInfra");
    expect(getProviderRegistryEntry("xai").label).toBe("xAI (Grok)");
    expect(getProviderRegistryEntry("siliconflow").label).toBe("SiliconFlow");
    expect(getProviderRegistryEntry("together").label).toBe("Together AI");
    expect(getProviderRegistryEntry("mistral").label).toBe("Mistral AI");
    expect(getProviderRegistryEntry("custom").label).toBe("Custom Endpoint");
  });

  it("configures OpenAI-compatible bases for aggregator providers", () => {
    expect(getOpenAiCompatChatBaseUrl("deepinfra")).toBe(
      "https://api.deepinfra.com/v1/openai",
    );
    expect(getOpenAiCompatChatBaseUrl("zai")).toBe("https://api.z.ai/api/paas/v4");
  });
});
