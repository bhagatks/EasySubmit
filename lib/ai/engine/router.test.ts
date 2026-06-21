import { describe, expect, it, vi } from "vitest";
import { AI_ENGINE_DEFAULTS, parseAiEngineConfig } from "@/src/lib/services/ai-engine-config";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    systemApiKey: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
  },
}));

import { resolveEffectiveAiSource } from "@/src/lib/ai/engine/router";

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
});
