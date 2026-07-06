import { describe, expect, it } from "vitest";
import {
  buildDefaultModelCandidatesForTask,
  resolveCandidatesFromHealthForTask,
} from "@/lib/ai/model-health/model-candidate-ranking";
import type { ProviderModelHealth } from "@/lib/ai/model-health/types";

describe("custom provider model candidates", () => {
  it("buildDefaultModelCandidatesForTask does not fall back to gpt-4o-mini", () => {
    const resolved = buildDefaultModelCandidatesForTask("custom", "cheap", "coding-glm-5.1-free");
    expect(resolved.rankedModels).not.toContain("gpt-4o-mini");
    expect(resolved.rankedModels).not.toContain("gpt-4o");
    expect(resolved.primaryModelId).toBe("coding-glm-5.1-free");
  });

  it("resolveCandidatesFromHealthForTask uses discovered models only", () => {
    const health: ProviderModelHealth = {
      checkedAt: new Date().toISOString(),
      primaryModelId: "coding-glm-5.1-free",
      rankedModels: ["coding-glm-5.1-free", "coding-glm-5-free"],
      discoveredCount: 2,
      entries: {
        "coding-glm-5.1-free": {
          modelId: "coding-glm-5.1-free",
          status: "healthy",
          lastCheckedAt: new Date().toISOString(),
          lastError: null,
          cooldownUntil: null,
          probes: { text: true, structured: true, error: null },
          tier: "cheap",
          inputCostPer1M: 0,
          lastLatencyMs: 100,
          sunsetHint: false,
        },
      },
    };

    const resolved = resolveCandidatesFromHealthForTask("custom", health, "cheap");
    expect(resolved.rankedModels).not.toContain("gpt-4o-mini");
    expect(resolved.primaryModelId).toBe("coding-glm-5.1-free");
  });
});
