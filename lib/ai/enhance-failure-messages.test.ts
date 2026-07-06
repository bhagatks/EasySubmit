import { describe, expect, it } from "vitest";
import {
  formatSystemPoolExhaustedMessage,
  resolveEnhanceAiRuntimeFallbackWarning,
  resolveEnhanceBlockedMessage,
  resolveEnhanceWarningTitle,
  truncateEnhanceUserMessage,
} from "@/lib/ai/enhance-failure-messages";
import {
  SYSTEM_POOL_EXHAUSTED_BYOK_BODY,
  SYSTEM_POOL_EXHAUSTED_HEADLINE,
} from "@/lib/ai/system-pool-messages";

describe("enhance-failure-messages", () => {
  it("formats system pool exhausted with BYOK guidance", () => {
    const message = formatSystemPoolExhaustedMessage(true);
    expect(message).toContain(SYSTEM_POOL_EXHAUSTED_HEADLINE);
    expect(message).toContain(SYSTEM_POOL_EXHAUSTED_BYOK_BODY);
  });

  it("blocked pool_down uses router copy and baseline outcome", () => {
    const message = resolveEnhanceBlockedMessage({
      reason: "pool_down",
      routeError: { error: "system_pool_exhausted", byokAvailable: true },
    });
    expect(message).toContain(SYSTEM_POOL_EXHAUSTED_HEADLINE);
    expect(message).toMatch(/baseline improvements were still applied/i);
  });

  it("runtime capacity message is actionable", () => {
    const message = resolveEnhanceAiRuntimeFallbackWarning({
      code: "capacity_exhausted",
    });
    expect(message).toMatch(/at capacity today/i);
    expect(message).toMatch(/rule-based improvements/i);
    expect(message).toMatch(/add your api key/i);
  });

  it("runtime BYOK auth failure mentions AI Keys", () => {
    const message = resolveEnhanceAiRuntimeFallbackWarning({
      code: "provider_error",
      routeMode: "customer",
      error: "401 unauthorized api key",
    });
    expect(message).toMatch(/api key was rejected/i);
    expect(message).toMatch(/rule-based improvements/i);
  });

  it("warning title maps capacity to shared AI unavailable", () => {
    expect(resolveEnhanceWarningTitle({ code: "capacity_exhausted" })).toBe(
      "EasySubmit AI unavailable",
    );
  });

  it("truncates long card copy", () => {
    const long = "A".repeat(200);
    expect(truncateEnhanceUserMessage(long, 140).endsWith("…")).toBe(true);
  });
});
