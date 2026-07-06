import { describe, expect, it } from "vitest";
import {
  resolveCandidatesFromHealthForTask,
} from "@/lib/ai/model-health/model-candidate-ranking";
import type { ProviderModelHealth } from "@/lib/ai/model-health/types";
import { taskTierFromEnhancePass } from "@/lib/ai/model-health/resolve-byok-task-route";

describe("byok task routing", () => {
  const health: ProviderModelHealth = {
    checkedAt: new Date().toISOString(),
    primaryModelId: "gpt-4o",
    rankedModels: ["gpt-4o-mini", "gpt-4o"],
    discoveredCount: 2,
    entries: {
      "gpt-4o-mini": {
        modelId: "gpt-4o-mini",
        status: "healthy",
        lastCheckedAt: new Date().toISOString(),
        probes: { text: true, structured: true },
        tier: "cheap",
        inputCostPer1M: 0.15,
      },
      "gpt-4o": {
        modelId: "gpt-4o",
        status: "healthy",
        lastCheckedAt: new Date().toISOString(),
        probes: { text: true, structured: true },
        tier: "flagship",
        inputCostPer1M: 2.5,
      },
    },
  };

  it("maps generate pass to cheap tier by default", () => {
    expect(taskTierFromEnhancePass("generate")).toBe("cheap");
    expect(taskTierFromEnhancePass("optimize")).toBe("flagship");
  });

  it("prefers cheap models for cheap task tier", () => {
    const resolved = resolveCandidatesFromHealthForTask("openai", health, "cheap");
    expect(resolved.primaryModelId).toBe("gpt-4o-mini");
    expect(resolved.rankedModels[0]).toBe("gpt-4o-mini");
  });

  it("prefers flagship models for flagship task tier", () => {
    const resolved = resolveCandidatesFromHealthForTask("openai", health, "flagship");
    expect(resolved.primaryModelId).toBe("gpt-4o");
    expect(resolved.rankedModels[0]).toBe("gpt-4o");
  });
});
