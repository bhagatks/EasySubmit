import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/src/lib/ai/server-model-discovery", () => ({
  handshakeProviderModels: vi.fn(),
}));

import { handshakeProviderModels } from "@/src/lib/ai/server-model-discovery";
import { performEngineHandshake } from "@/src/lib/ai/discovery-service";
import { ENGINE_ERRORS } from "@/src/lib/ai/engine-errors";

describe("performEngineHandshake", () => {
  beforeEach(() => {
    vi.mocked(handshakeProviderModels).mockReset();
  });

  it("returns career-grade models when key lists gpt-4o", async () => {
    vi.mocked(handshakeProviderModels).mockResolvedValue({
      ok: true,
      models: ["gpt-3.5-turbo", "gpt-4o", "gpt-4o-mini"],
    });

    const result = await performEngineHandshake({
      provider: "openai",
      apiKey: "sk-test",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.models).toEqual(["gpt-4o", "gpt-4o-mini"]);
      expect(result.suggestedPrimaryFuel).toBe("gpt-4o");
    }
  });

  it("returns NO_CAREER_MODELS when key lacks flagship access", async () => {
    vi.mocked(handshakeProviderModels).mockResolvedValue({
      ok: true,
      models: ["gpt-3.5-turbo", "text-embedding-3-small"],
    });

    const result = await performEngineHandshake({
      provider: "openai",
      apiKey: "sk-test",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ENGINE_ERRORS.NO_CAREER_MODELS);
      expect(result.error.terminalLine).toContain("NO_CAREER_MODELS");
    }
  });

  it("maps invalid key failures to structured ENGINE_ERRORS", async () => {
    vi.mocked(handshakeProviderModels).mockResolvedValue({
      ok: false,
      code: "invalid_key",
      message: "Incorrect API key provided",
    });

    const result = await performEngineHandshake({
      provider: "anthropic",
      apiKey: "sk-ant-test",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ENGINE_ERRORS.INVALID_KEY);
      expect(result.error.message).toContain("Incorrect API key");
    }
  });
});
