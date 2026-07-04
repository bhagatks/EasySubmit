import { describe, expect, it } from "vitest";
import {
  AI_ENGINE_DEFAULTS,
  parseAiEngineConfig,
  resolveCustomerEnhancementLimit,
  resolveJdExtractionSystemModel,
} from "@/src/lib/services/ai-engine-config";

describe("parseAiEngineConfig", () => {
  it("returns defaults for invalid input", () => {
    expect(parseAiEngineConfig(null)).toBeNull();
    expect(parseAiEngineConfig("bad")).toBeNull();
    expect(AI_ENGINE_DEFAULTS.system.maxKeySlots).toBe(3);
    expect(AI_ENGINE_DEFAULTS.quotas.system.enable).toBe(true);
    expect(AI_ENGINE_DEFAULTS.quotas.customer.aiDailyUnlimited).toBe(true);
  });

  it("defaults resume to gemini-2.5-flash and JD extract to gemini-2.5-flash-lite", () => {
    expect(AI_ENGINE_DEFAULTS.system.modelId).toBe("gemini-2.5-flash");
    expect(AI_ENGINE_DEFAULTS.system.jdExtractionModelId).toBe("gemini-2.5-flash-lite");
  });

  it("parses model, enable flag, and quotas", () => {
    const config = parseAiEngineConfig({
      system: {
        modelId: "gemini-2.5-flash",
        jdExtractionModelId: "gemini-2.5-flash-lite",
        maxKeySlots: 3,
      },
      quotas: {
        system: { enable: false, dailyEnhancements: 10, dailyCalls: 40 },
        customer: { aiDailyUnlimited: false, dailyEnhancements: 100, dailyCalls: 500 },
      },
      customerDailyEnhancementCap: 75,
    });

    expect(config?.system.modelId).toBe("gemini-2.5-flash");
    expect(config?.system.jdExtractionModelId).toBe("gemini-2.5-flash-lite");
    expect(config?.system.maxKeySlots).toBe(3);
    expect(config?.quotas.system.enable).toBe(false);
    expect(config?.quotas.system.dailyEnhancements).toBe(10);
    expect(config?.quotas.customer.aiDailyUnlimited).toBe(false);
    expect(config?.customerDailyEnhancementCap).toBe(75);
  });

  it("allows zero system quotas when explicitly set", () => {
    const config = parseAiEngineConfig({
      quotas: {
        system: { enable: true, dailyEnhancements: 0, dailyCalls: 0 },
      },
    });

    expect(config?.quotas.system.dailyEnhancements).toBe(0);
    expect(config?.quotas.system.dailyCalls).toBe(0);
  });

  it("clamps maxKeySlots", () => {
    const config = parseAiEngineConfig({ system: { maxKeySlots: 99 } });
    expect(config?.system.maxKeySlots).toBe(10);
  });
});

describe("resolveCustomerEnhancementLimit", () => {
  it("returns null when customer quota is unlimited in app config", () => {
    expect(resolveCustomerEnhancementLimit(AI_ENGINE_DEFAULTS)).toBeNull();
  });

  it("returns cap from config when customer quota is limited", () => {
    const limited = parseAiEngineConfig({
      quotas: {
        customer: { aiDailyUnlimited: false, dailyEnhancements: 50, dailyCalls: 200 },
      },
      customerDailyEnhancementCap: 50,
    })!;

    expect(resolveCustomerEnhancementLimit(limited)).toBe(50);
  });
});

describe("resolveJdExtractionSystemModel", () => {
  it("returns the same model as system resume enhance", () => {
    expect(resolveJdExtractionSystemModel(AI_ENGINE_DEFAULTS)).toBe(
      AI_ENGINE_DEFAULTS.system.modelId,
    );
  });
});
