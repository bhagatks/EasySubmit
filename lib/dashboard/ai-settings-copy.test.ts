import { describe, expect, it } from "vitest";
import {
  AI_NOT_AVAILABLE_MESSAGE,
  buildAiSettingsStatusText,
  isAiTailoringAvailable,
} from "@/lib/dashboard/ai-settings-copy";

describe("isAiTailoringAvailable", () => {
  it("is false when shared AI flag is off and no BYOK key", () => {
    expect(
      isAiTailoringAvailable({ systemAiFeatureEnabled: false, hasByokKey: false }),
    ).toBe(false);
  });

  it("is true when BYOK key exists even if shared AI flag is off", () => {
    expect(
      isAiTailoringAvailable({ systemAiFeatureEnabled: false, hasByokKey: true }),
    ).toBe(true);
  });
});

describe("buildAiSettingsStatusText", () => {
  const base = {
    customerAiDailyUnlimited: false,
    customerDailyEnhancementLimit: 50,
    systemDailyLimit: 50,
    isSubscribed: false,
    systemAiFeatureEnabled: true,
  };

  it("shared AI kill switch with no key", () => {
    expect(
      buildAiSettingsStatusText({
        ...base,
        aiEnabled: true,
        hasByokKey: false,
        systemAiFeatureEnabled: false,
      }),
    ).toBe(AI_NOT_AVAILABLE_MESSAGE);
  });

  it("S0 — AI tailoring off", () => {
    expect(
      buildAiSettingsStatusText({
        ...base,
        aiEnabled: false,
        hasByokKey: true,
        customerAiDailyUnlimited: true,
      }),
    ).toBe("AI tailoring is off — resume editing uses the rules engine only.");
  });

  it("S2 — shared AI, limited, no key", () => {
    expect(
      buildAiSettingsStatusText({
        ...base,
        aiEnabled: true,
        hasByokKey: false,
      }),
    ).toBe("Using EasySubmit shared AI — 50 enhancements per day.");
  });

  it("S3 — shared AI, unlimited flag, no key", () => {
    expect(
      buildAiSettingsStatusText({
        ...base,
        aiEnabled: true,
        hasByokKey: false,
        customerAiDailyUnlimited: true,
      }),
    ).toBe(
      "Using EasySubmit shared AI — 50 enhancements per day. Add a provider key below for unlimited.",
    );
  });

  it("S4 — subscribed, no key", () => {
    expect(
      buildAiSettingsStatusText({
        ...base,
        aiEnabled: true,
        hasByokKey: false,
        isSubscribed: true,
      }),
    ).toBe("Using EasySubmit shared AI — unlimited with your subscription.");
  });

  it("S5 — BYOK unlimited", () => {
    expect(
      buildAiSettingsStatusText({
        ...base,
        aiEnabled: true,
        hasByokKey: true,
        customerAiDailyUnlimited: true,
      }),
    ).toBe("Using your provider key — unlimited enhancements.");
  });

  it("S6 — BYOK capped", () => {
    expect(
      buildAiSettingsStatusText({
        ...base,
        aiEnabled: true,
        hasByokKey: true,
        customerDailyEnhancementLimit: 25,
      }),
    ).toBe("Using your provider key — 25 enhancements per day.");
  });

  it("BYOK still works when shared AI flag is off", () => {
    expect(
      buildAiSettingsStatusText({
        ...base,
        aiEnabled: true,
        hasByokKey: true,
        systemAiFeatureEnabled: false,
        customerAiDailyUnlimited: true,
      }),
    ).toBe("Using your provider key — unlimited enhancements.");
  });
});
