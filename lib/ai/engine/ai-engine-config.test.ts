import { describe, expect, it } from "vitest";
import {
  AI_ENGINE_CONFIG_INFO,
  AI_ENGINE_DEFAULTS,
  parseAiEngineConfig,
  resolveCustomerEnhancementLimit,
  resolveJdExtractionSystemModel,
} from "@/src/lib/services/ai-engine-config";

describe("parseAiEngineConfig", () => {
  it("returns defaults for invalid input", () => {
    expect(parseAiEngineConfig(null)).toBeNull();
    expect(parseAiEngineConfig("bad")).toBeNull();
    expect(AI_ENGINE_DEFAULTS.system.maxKeySlots).toBe(2);
    expect(AI_ENGINE_DEFAULTS.enabled).toBe(true);
    expect(AI_ENGINE_DEFAULTS.quotas.customer.aiDailyUnlimited).toBe(true);
    expect(AI_ENGINE_DEFAULTS.quotas.system.dailyTotalSystemCalls).toBe(1000);
    expect(AI_ENGINE_DEFAULTS.quotas.system.dailyUserEnhancements).toBe(5);
  });

  it("defaults resume to deepseek-v4-flash and JD extract to deepseek-v4-flash", () => {
    expect(AI_ENGINE_DEFAULTS.system.provider).toBe("deepseek");
    expect(AI_ENGINE_DEFAULTS.system.modelId).toBe("deepseek-v4-flash");
    expect(AI_ENGINE_DEFAULTS.system.jdExtractionModelId).toBe("deepseek-v4-flash");
  });

  it("parses enabled flag, provider, model, and new system quotas", () => {
    const config = parseAiEngineConfig({
      enabled: false,
      system: {
        provider: "gemini",
        modelId: "gemini-2.5-flash",
        jdExtractionModelId: "gemini-2.5-flash-lite",
        maxKeySlots: 2,
      },
      quotas: {
        system: {
          dailyTotalSystemCalls: 900,
          dailyTotalSystemEnhancements: 150,
          dailyUserCalls: 40,
          dailyUserEnhancements: 10,
        },
        customer: { aiDailyUnlimited: false, dailyEnhancements: 100, dailyCalls: 500 },
      },
    });

    expect(config?.enabled).toBe(false);
    expect(config?.system.provider).toBe("gemini");
    expect(config?.system.modelId).toBe("gemini-2.5-flash");
    expect(config?.system.jdExtractionModelId).toBe("gemini-2.5-flash-lite");
    expect(config?.system.maxKeySlots).toBe(2);
    expect(config?.quotas.system.dailyUserEnhancements).toBe(10);
    expect(config?.quotas.system.dailyTotalSystemCalls).toBe(900);
    expect(config?.quotas.customer.aiDailyUnlimited).toBe(false);
    expect(config?.quotas.customer.dailyEnhancements).toBe(100);
  });

  it("maps legacy dailyCalls/dailyEnhancements to per-user system caps", () => {
    const config = parseAiEngineConfig({
      quotas: {
        system: { dailyEnhancements: 8, dailyCalls: 30 },
      },
    });

    expect(config?.quotas.system.dailyUserEnhancements).toBe(8);
    expect(config?.quotas.system.dailyUserCalls).toBe(30);
    expect(config?.quotas.system.dailyTotalSystemCalls).toBe(1000);
  });

  it("allows zero system quotas when explicitly set", () => {
    const config = parseAiEngineConfig({
      quotas: {
        system: {
          dailyTotalSystemCalls: 0,
          dailyTotalSystemEnhancements: 0,
          dailyUserCalls: 0,
          dailyUserEnhancements: 0,
        },
      },
    });

    expect(config?.quotas.system.dailyUserEnhancements).toBe(0);
    expect(config?.quotas.system.dailyUserCalls).toBe(0);
  });

  it("clamps maxKeySlots", () => {
    const config = parseAiEngineConfig({ system: { maxKeySlots: 99 } });
    expect(config?.system.maxKeySlots).toBe(10);
  });

  it("normalizes legacy deepseek-chat in app_config to deepseek-v4-flash", () => {
    const config = parseAiEngineConfig({
      system: {
        provider: "deepseek",
        modelId: "deepseek-chat",
        jdExtractionModelId: "deepseek-chat",
      },
    });

    expect(config?.system.modelId).toBe("deepseek-v4-flash");
    expect(config?.system.jdExtractionModelId).toBe("deepseek-v4-flash");
  });

  it("exports aiEngine info metadata for app_config.info seeding", () => {
    expect(AI_ENGINE_CONFIG_INFO.openRouter.freeRequestsPerDay).toBe(1000);
    expect(AI_ENGINE_CONFIG_INFO.fields["system.slot0"]).toContain("openrouter/free");
  });
});

describe("resolveCustomerEnhancementLimit", () => {
  it("returns null when customer quota is unlimited in app config", () => {
    expect(resolveCustomerEnhancementLimit(AI_ENGINE_DEFAULTS)).toBeNull();
  });

  it("returns cap from quotas.customer when customer quota is limited", () => {
    const limited = parseAiEngineConfig({
      quotas: {
        customer: { aiDailyUnlimited: false, dailyEnhancements: 50, dailyCalls: 200 },
      },
    })!;

    expect(resolveCustomerEnhancementLimit(limited)).toBe(50);
  });
});

describe("resolveJdExtractionSystemModel", () => {
  it("returns the configured JD extraction model for system pool", () => {
    expect(resolveJdExtractionSystemModel(AI_ENGINE_DEFAULTS)).toBe(
      AI_ENGINE_DEFAULTS.system.jdExtractionModelId,
    );
  });
});
