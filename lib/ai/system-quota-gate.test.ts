import { describe, expect, it } from "vitest";
import { AI_ENGINE_DEFAULTS } from "@/src/lib/services/ai-engine-config";
import {
  evaluateSystemQuotaGate,
  formatSystemQuotaBlockedMessage,
  resolveQuotaRowWithReset,
} from "@/src/lib/ai/engine/system-quota-gate";

const now = new Date();

describe("evaluateSystemQuotaGate", () => {
  it("returns exceeded false when under system limits", () => {
    const result = evaluateSystemQuotaGate(
      { aiEnhancementsToday: 2, aiCallsToday: 10, aiQuotaResetAt: now },
      AI_ENGINE_DEFAULTS,
      { isEnhancement: true, estimatedCalls: 2 },
    );
    expect(result).toMatchObject({ applies: true, exceeded: false });
  });

  it("flags enhancement_limit at 5/5", () => {
    const result = evaluateSystemQuotaGate(
      { aiEnhancementsToday: 5, aiCallsToday: 0, aiQuotaResetAt: now },
      AI_ENGINE_DEFAULTS,
      { isEnhancement: true, estimatedCalls: 2 },
    );
    expect(result.exceeded).toBe(true);
    expect(result.reason).toBe("enhancement_limit");
    expect(result.code).toBe("quota_enhancement");
    expect(result.message).toContain("Daily enhancement limit reached (5/day)");
  });

  it("flags call_limit before hard cap when job needs 2 calls", () => {
    const result = evaluateSystemQuotaGate(
      { aiEnhancementsToday: 0, aiCallsToday: 49, aiQuotaResetAt: now },
      AI_ENGINE_DEFAULTS,
      { isEnhancement: true, estimatedCalls: 2 },
    );
    expect(result.exceeded).toBe(true);
    expect(result.reason).toBe("call_limit");
    expect(result.code).toBe("quota_calls");
  });
});

describe("formatSystemQuotaBlockedMessage", () => {
  it("matches pipeline enhancement copy", () => {
    const message = formatSystemQuotaBlockedMessage({
      ok: false,
      reason: "enhancement_limit",
      snapshot: {
        enhancementsUsed: 5,
        enhancementsLimit: 5,
        callsUsed: 0,
        callsLimit: 50,
        resetsAt: now,
      },
    });
    expect(message).toBe(
      "Daily enhancement limit reached (5/day). Add your API key for more.",
    );
  });
});

describe("resolveQuotaRowWithReset", () => {
  it("resets counters after UTC day rollover", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { quotaRow, resetPatch } = resolveQuotaRowWithReset({
      vaultKeyId: null,
      activeProvider: null,
      aiSourcePreference: "system",
      aiEnhancementsToday: 5,
      aiCallsToday: 40,
      aiQuotaResetAt: yesterday,
    });
    expect(resetPatch).not.toBeNull();
    expect(quotaRow.aiEnhancementsToday).toBe(0);
    expect(quotaRow.aiCallsToday).toBe(0);
  });
});
