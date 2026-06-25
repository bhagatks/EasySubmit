import { describe, expect, it } from "vitest";
import {
  EXTENSION_RUNTIME_DEFAULTS,
  mergeExtensionRuntimeConfig,
} from "@/src/shared/extension/runtime-config-merge";

describe("mergeExtensionRuntimeConfig", () => {
  it("keeps workday and generic enabled when API config omits them", () => {
    const merged = mergeExtensionRuntimeConfig({
      jobCardEnabled: true,
      enabledPlatforms: ["linkedin"],
      genericFallbackEnabled: false,
      minConfidence: 70,
      apiBaseUrl: "http://localhost:3000",
    });

    expect(merged.enabledPlatforms).toContain("workday");
    expect(merged.enabledPlatforms).toContain("generic");
    expect(merged.minConfidence).toBe(70);
  });

  it("falls back to defaults when config is missing", () => {
    expect(mergeExtensionRuntimeConfig(null)).toEqual(EXTENSION_RUNTIME_DEFAULTS);
  });

  it("preserves aiHealthError from the config API", () => {
    const merged = mergeExtensionRuntimeConfig({
      aiHealthError: "Your API key is failing. Check it in AI Keys settings.",
      apiBaseUrl: "http://localhost:3000",
    });
    expect(merged.aiHealthError).toBe("Your API key is failing. Check it in AI Keys settings.");
  });
});
