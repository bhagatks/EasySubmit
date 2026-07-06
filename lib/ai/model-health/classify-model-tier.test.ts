import { describe, expect, it } from "vitest";
import {
  classifyModelTier,
  suggestDiscoveredPrimaryFuel,
} from "@/lib/ai/model-health/classify-model-tier";

describe("classify-model-tier", () => {
  it("classifies cheap models from heuristics", () => {
    expect(classifyModelTier("gpt-4o-mini")).toBe("cheap");
    expect(classifyModelTier("gemini-2.5-flash")).toBe("cheap");
    expect(classifyModelTier("deepseek-chat")).toBe("cheap");
  });

  it("forces flagship for reasoning models regardless of cost", () => {
    expect(classifyModelTier("deepseek-reasoner")).toBe("flagship");
    expect(classifyModelTier("o1-mini")).toBe("flagship");
    expect(classifyModelTier("claude-3-opus-20240229")).toBe("flagship");
  });

  it("defaults unknown models to flagship", () => {
    expect(classifyModelTier("brand-new-unknown-model-x")).toBe("flagship");
  });

  it("suggests a flagship primary fuel when available", () => {
    const primary = suggestDiscoveredPrimaryFuel([
      "gpt-4o-mini",
      "gpt-4o",
      "o1-preview",
    ]);
    expect(primary).toBe("gpt-4o");
  });
});
