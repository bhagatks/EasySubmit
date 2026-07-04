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

vi.mock("@/lib/ai/model-health/resolve-model-candidates", () => ({
  resolveCustomerModelCandidates: vi.fn(async () => ({
    primaryModelId: "gemini-2.5-flash",
    rankedModels: ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
    source: "defaults",
    healthCheckedAt: null,
  })),
}));

vi.mock("@/src/lib/ai/engine/system-key-pool", () => ({
  hasSystemPoolKeys: vi.fn().mockResolvedValue(true),
  hasSystemGeminiKeys: vi.fn().mockResolvedValue(true),
  hasHealthySystemPoolSlot: vi.fn().mockResolvedValue(true),
}));

import { resolveEffectiveAiSource, resolveAiRoute } from "@/src/lib/ai/engine/router";
import {
  hasHealthySystemPoolSlot,
  hasSystemPoolKeys,
} from "@/src/lib/ai/engine/system-key-pool";

describe("resolveEffectiveAiSource", () => {
  it("always routes to customer when system AI is disabled", () => {
    expect(resolveEffectiveAiSource("system", false, false)).toBe("customer");
    expect(resolveEffectiveAiSource("auto", false, false, true)).toBe("customer");
  });

  it("uses system when enabled and forceSystem is true", () => {
    expect(resolveEffectiveAiSource("auto", false, true, true)).toBe("system");
  });

  it("prefers customer when auto + vault key and system is not forced", () => {
    expect(resolveEffectiveAiSource("auto", true, true)).toBe("customer");
  });

  it("uses system when forceSystem even with vault key", () => {
    expect(resolveEffectiveAiSource("auto", true, true, true)).toBe("system");
    expect(resolveEffectiveAiSource("system", true, true, true)).toBe("system");
  });

  it("uses system when preference is system even with vault key", () => {
    expect(resolveEffectiveAiSource("system", true, true)).toBe("system");
  });

  it("forces customer when forceCustomer is true and vault key exists", () => {
    expect(resolveEffectiveAiSource("system", true, true, false, true)).toBe("customer");
  });
});

describe("resolveAiRoute", () => {
  const originalGlobalAi = process.env.EASYSUBMIT_AI_GLOBALLY_ENABLED;

  beforeEach(() => {
    vi.mocked(hasSystemPoolKeys).mockResolvedValue(true);
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
      modelCandidates: expect.any(Array),
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
      modelCandidates: expect.any(Array),
    });
  });
});
