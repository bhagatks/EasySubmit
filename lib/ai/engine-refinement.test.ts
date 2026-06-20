import { describe, expect, it } from "vitest";
import {
  buildEngineRefinementPrompt,
  parseRefinedArchitectureJson,
} from "@/src/lib/ai/engine-refinement";
import { shouldTriggerIgnitionGate } from "@/src/lib/ai/engine-refinement-client";
import {
  buildUsageLogFromGeneration,
  estimateUsageCostUsd,
} from "@/src/lib/ai/estimate-usage-cost";
import { formatIgnitionLockMessage } from "@/src/lib/ai/ignition-guard";

describe("engine-refinement", () => {
  it("builds a prompt with target role and architecture JSON", () => {
    const prompt = buildEngineRefinementPrompt("Staff Engineer", {
      skills: ["TypeScript"],
    });
    expect(prompt).toContain("Staff Engineer");
    expect(prompt).toContain("TypeScript");
  });

  it("parses raw JSON architecture responses", () => {
    const parsed = parseRefinedArchitectureJson('{"skills":["Go"]}');
    expect(parsed).toEqual({ skills: ["Go"] });
  });

  it("extracts JSON from fenced model output", () => {
    const parsed = parseRefinedArchitectureJson(
      'Here is the result:\n{"skills":["Rust"]}\nDone.',
    );
    expect(parsed).toEqual({ skills: ["Rust"] });
  });
});

describe("estimate-usage-cost", () => {
  it("estimates non-zero USD for token usage", () => {
    const cost = estimateUsageCostUsd({
      modelId: "gpt-4o-mini",
      inputTokens: 1000,
      outputTokens: 500,
    });
    expect(cost).toBeGreaterThan(0);
  });

  it("builds usage log payload from generation usage", () => {
    const payload = buildUsageLogFromGeneration("claude-3-5-haiku-latest", {
      inputTokens: 200,
      outputTokens: 100,
    });
    expect(payload.tokensUsed).toBe(300);
    expect(payload.modelId).toBe("claude-3-5-haiku-latest");
    expect(payload.estimatedCost).toBeGreaterThan(0);
  });
});

describe("ignition-guard vault_lock", () => {
  it("formats vault lock copy for Ignition Gate", () => {
    expect(formatIgnitionLockMessage("vault_lock")).toContain("Ignition Gate");
  });
});

describe("engine-refinement-client", () => {
  it("detects VAULT_LOCK responses", () => {
    expect(
      shouldTriggerIgnitionGate({
        success: false,
        status: "VAULT_LOCK",
        error: "expired",
      }),
    ).toBe(true);
  });
});
