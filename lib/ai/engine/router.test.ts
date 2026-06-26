import { beforeEach, describe, expect, it, vi } from "vitest";
import { AI_ENGINE_DEFAULTS, parseAiEngineConfig } from "@/src/lib/services/ai-engine-config";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    systemApiKey: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(1),
    },
  },
}));

vi.mock("@/src/lib/ai/engine/system-key-pool", () => ({
  hasSystemGeminiKeys: vi.fn().mockResolvedValue(true),
  hasHealthySystemPoolSlot: vi.fn().mockResolvedValue(true),
}));

import { resolveEffectiveAiSource, resolveAiRoute } from "@/src/lib/ai/engine/router";
import {
  hasHealthySystemPoolSlot,
  hasSystemGeminiKeys,
} from "@/src/lib/ai/engine/system-key-pool";

describe("resolveEffectiveAiSource", () => {
  const systemDisabled = parseAiEngineConfig({
    quotas: { system: { enable: false, dailyEnhancements: 5, dailyCalls: 20 } },
  })!;

  it("always routes to customer when system AI is disabled", () => {
    expect(resolveEffectiveAiSource("system", false, systemDisabled)).toBe("customer");
    expect(resolveEffectiveAiSource("auto", false, systemDisabled, true)).toBe("customer");
  });

  it("uses system when enabled and forceSystem is true", () => {
    expect(resolveEffectiveAiSource("auto", false, AI_ENGINE_DEFAULTS, true)).toBe("system");
  });

  it("prefers customer on auto when a vault key exists", () => {
    expect(resolveEffectiveAiSource("auto", true, AI_ENGINE_DEFAULTS)).toBe("customer");
  });
});

describe("resolveAiRoute", () => {
  beforeEach(() => {
    vi.mocked(hasSystemGeminiKeys).mockResolvedValue(true);
    vi.mocked(hasHealthySystemPoolSlot).mockResolvedValue(true);
  });

  it("returns system_pool_exhausted when pool is down and user has not opted into BYOK", async () => {
    vi.mocked(hasHealthySystemPoolSlot).mockResolvedValue(false);

    const route = await resolveAiRoute({
      aiSourcePreference: "system",
      vaultKeyId: "vault-1",
      activeProvider: "gemini",
    });

    expect(route).toEqual({ error: "system_pool_exhausted", byokAvailable: true });
  });

  it("uses BYOK only when user explicitly allows fallback", async () => {
    vi.mocked(hasHealthySystemPoolSlot).mockResolvedValue(false);

    const route = await resolveAiRoute({
      aiSourcePreference: "system",
      vaultKeyId: "vault-1",
      activeProvider: "gemini",
      allowByokFallback: true,
    });

    expect(route).toEqual({
      mode: "customer",
      provider: "gemini",
      vaultKeyId: "vault-1",
      modelId: expect.any(String),
    });
  });
});
