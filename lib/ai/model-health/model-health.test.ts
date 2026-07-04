import { describe, expect, it } from "vitest";
import {
  buildDefaultModelCandidates,
  resolveCandidatesFromHealth,
} from "@/lib/ai/model-health/model-candidate-ranking";
import type { ProviderModelHealth } from "@/lib/ai/model-health/types";

describe("model-health candidates", () => {
  it("prefers dated anthropic defaults over -latest aliases", () => {
    const candidates = buildDefaultModelCandidates("anthropic");
    expect(candidates.primaryModelId).toBe("claude-sonnet-4-20250514");
    expect(candidates.rankedModels[0]).toBe("claude-sonnet-4-20250514");
  });

  it("skips models in cooldown when resolving from health", () => {
    const health: ProviderModelHealth = {
      checkedAt: new Date().toISOString(),
      primaryModelId: "claude-3-5-sonnet-latest",
      rankedModels: ["claude-3-5-sonnet-latest", "claude-3-5-sonnet-20241022"],
      discoveredCount: 2,
      entries: {
        "claude-3-5-sonnet-latest": {
          modelId: "claude-3-5-sonnet-latest",
          status: "failed",
          lastCheckedAt: new Date().toISOString(),
          lastError: "invalid model",
          cooldownUntil: new Date(Date.now() + 60_000).toISOString(),
          probes: { text: false, structured: false, error: "invalid model" },
        },
        "claude-3-5-sonnet-20241022": {
          modelId: "claude-3-5-sonnet-20241022",
          status: "healthy",
          lastCheckedAt: new Date().toISOString(),
          probes: { text: true, structured: true },
        },
      },
    };

    const resolved = resolveCandidatesFromHealth("anthropic", health);
    expect(resolved.primaryModelId).toBe("claude-3-5-sonnet-20241022");
    expect(resolved.rankedModels).not.toContain("claude-3-5-sonnet-latest");
  });
});
