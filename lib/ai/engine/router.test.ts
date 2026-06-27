import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { AI_ENGINE_DEFAULTS } from "@/src/lib/services/ai-engine-config";

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
  it("always routes to customer when system AI is disabled", () => {
    expect(resolveEffectiveAiSource("system", false, false)).toBe("customer");
    expect(resolveEffectiveAiSource("auto", false, false, true)).toBe("customer");
  });

  it("uses system when enabled and forceSystem is true", () => {
    expect(resolveEffectiveAiSource("auto", false, true, true)).toBe("system");
  });

  it("prefers customer when a vault key exists (over forceSystem and system preference)", () => {
    expect(resolveEffectiveAiSource("auto", true, true)).toBe("customer");
    expect(resolveEffectiveAiSource("system", true, true, true)).toBe("customer");
    expect(resolveEffectiveAiSource("auto", true, true, true)).toBe("customer");
  });
});

describe("resolveAiRoute", () => {
  const originalGlobalAi = process.env.EASYSUBMIT_AI_GLOBALLY_ENABLED;

  beforeEach(() => {
    vi.mocked(hasSystemGeminiKeys).mockResolvedValue(true);
    vi.mocked(hasHealthySystemPoolSlot).mockResolvedValue(true);
    process.env.EASYSUBMIT_AI_GLOBALLY_ENABLED = "true";
  });

  afterEach(() => {
    if (originalGlobalAi === undefined) {
      delete process.env.EASYSUBMIT_AI_GLOBALLY_ENABLED;
    } else {
      process.env.EASYSUBMIT_AI_GLOBALLY_ENABLED = originalGlobalAi;
    }
  });

  it("returns ai_globally_disabled when global kill switch is off", async () => {
    process.env.EASYSUBMIT_AI_GLOBALLY_ENABLED = "false";

    const route = await resolveAiRoute({
      aiSourcePreference: "auto",
      vaultKeyId: null,
      activeProvider: null,
    });

    expect(route).toEqual({ error: "ai_globally_disabled" });
  });

  it("returns ai_disabled when user preference is disabled", async () => {
    const route = await resolveAiRoute({
      aiSourcePreference: "disabled",
      vaultKeyId: "vault-1",
      activeProvider: "gemini",
    });

    expect(route).toEqual({ error: "ai_disabled" });
  });

  it("returns system_pool_exhausted when pool is down and user has not opted into BYOK", async () => {
    vi.mocked(hasHealthySystemPoolSlot).mockResolvedValue(false);

    const route = await resolveAiRoute({
      aiSourcePreference: "auto",
      vaultKeyId: null,
      activeProvider: null,
    });

    expect(route).toEqual({ error: "system_pool_exhausted", byokAvailable: false });
  });

  it("falls back to BYOK when system pool is down and vault key exists", async () => {
    vi.mocked(hasHealthySystemPoolSlot).mockResolvedValue(false);

    const route = await resolveAiRoute({
      aiSourcePreference: "auto",
      vaultKeyId: "vault-1",
      activeProvider: "gemini",
    });

    expect(route).toEqual({
      mode: "customer",
      provider: "gemini",
      vaultKeyId: "vault-1",
      modelId: expect.any(String),
    });
  });

  it("uses BYOK when user explicitly allows fallback (legacy opt-in still works)", async () => {
    vi.mocked(hasHealthySystemPoolSlot).mockResolvedValue(false);

    const route = await resolveAiRoute({
      aiSourcePreference: "auto",
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
