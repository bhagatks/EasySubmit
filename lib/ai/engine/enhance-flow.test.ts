import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  clampEnhanceTimeoutMs,
  DEFAULT_ENHANCE_WITH_AI_TIMEOUT_MS,
  parseEnhanceWithAiConfig,
  resolveEnhanceWithAiConfig,
} from "@/src/lib/services/enhance-with-ai-config";

describe("enhance-with-ai-config", () => {
  it("defaults to 90 seconds", () => {
    expect(DEFAULT_ENHANCE_WITH_AI_TIMEOUT_MS).toBe(90_000);
  });

  it("parses enhanceWithAiTimeoutMs from app_config JSON", () => {
    expect(parseEnhanceWithAiConfig({ enhanceWithAiTimeoutMs: 30_000 })).toEqual({
      enhanceWithAiTimeoutMs: 30_000,
    });
  });

  it("accepts legacy EnhanceWithAITimeout key", () => {
    expect(parseEnhanceWithAiConfig({ EnhanceWithAITimeout: 45_000 })).toEqual({
      enhanceWithAiTimeoutMs: 45_000,
    });
  });

  it("clamps timeout to safe bounds", () => {
    expect(clampEnhanceTimeoutMs(100)).toBe(1_000);
    expect(clampEnhanceTimeoutMs(999_999)).toBe(600_000);
  });

  it("falls back when config is invalid", () => {
    expect(resolveEnhanceWithAiConfig(null).enhanceWithAiTimeoutMs).toBe(
      DEFAULT_ENHANCE_WITH_AI_TIMEOUT_MS,
    );
    expect(resolveEnhanceWithAiConfig({ enhanceWithAiTimeoutMs: "nope" })).toEqual({
      enhanceWithAiTimeoutMs: DEFAULT_ENHANCE_WITH_AI_TIMEOUT_MS,
    });
  });
});

describe("raceWithEnhanceTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves when promise finishes before timeout", async () => {
    const { raceWithEnhanceTimeout } = await import("@/src/lib/ai/engine/enhance-timeout");
    const result = await raceWithEnhanceTimeout(
      Promise.resolve({ ok: true }),
      10_000,
      "trace123",
    );
    expect(result).toEqual({ ok: true });
  });

  it("rejects with EnhanceTimeoutError when deadline exceeded", async () => {
    const { raceWithEnhanceTimeout } = await import("@/src/lib/ai/engine/enhance-timeout");

    const pending = new Promise<string>(() => {
      /* never resolves */
    });

    const raced = raceWithEnhanceTimeout(pending, 10_000, "abc12345");
    vi.advanceTimersByTime(10_000);

    await expect(raced).rejects.toMatchObject({
      code: "timeout",
      timeoutMs: 10_000,
      traceId: "abc12345",
    });
  });
});

describe("enhance-pipeline", () => {
  it("maps every pipeline step to an operator hint", async () => {
    const { ENHANCE_PIPELINE, ENHANCE_PIPELINE_HINTS } = await import(
      "@/src/lib/ai/engine/enhance-pipeline"
    );

    for (const step of Object.values(ENHANCE_PIPELINE)) {
      expect(ENHANCE_PIPELINE_HINTS[step]).toMatch(/\S/);
    }
  });
});
