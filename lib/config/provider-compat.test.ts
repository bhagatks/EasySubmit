import { describe, expect, it } from "vitest";
import {
  isOpenAiCompatibleProvider,
  normalizeCustomOpenAiBaseUrl,
  resolveOpenAiCompatChatBaseUrl,
  resolveProviderHandshakeUrl,
} from "@/src/lib/config/provider-compat";

describe("provider-compat", () => {
  it("resolves DeepSeek chat base without /v1", () => {
    expect(resolveOpenAiCompatChatBaseUrl("deepseek")).toBe("https://api.deepseek.com");
  });

  it("resolves DeepInfra OpenAI-compatible base", () => {
    expect(resolveOpenAiCompatChatBaseUrl("deepinfra")).toBe(
      "https://api.deepinfra.com/v1/openai",
    );
    expect(resolveProviderHandshakeUrl("deepinfra")).toBe(
      "https://api.deepinfra.com/v1/openai/models",
    );
  });

  it("uses custom endpoint URL for custom provider", () => {
    expect(resolveOpenAiCompatChatBaseUrl("custom", "https://proxy.example.com/v1")).toBe(
      "https://proxy.example.com/v1",
    );
    expect(resolveProviderHandshakeUrl("custom", "https://proxy.example.com/v1")).toBe(
      "https://proxy.example.com/v1/models",
    );
  });

  it("normalizes trailing slashes on custom URLs", () => {
    expect(normalizeCustomOpenAiBaseUrl("https://proxy.example.com/v1/")).toBe(
      "https://proxy.example.com/v1",
    );
  });

  it("classifies OpenAI-compatible providers", () => {
    expect(isOpenAiCompatibleProvider("mistral")).toBe(true);
    expect(isOpenAiCompatibleProvider("anthropic")).toBe(false);
    expect(isOpenAiCompatibleProvider("gemini")).toBe(false);
  });
});
