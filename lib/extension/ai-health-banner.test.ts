import { describe, expect, it } from "vitest";
import {
  getExtensionAiHealthBlockMessage,
  isExtensionApplyBlockedByAiHealth,
  resolveExtensionAiHealthBanner,
  shouldHidePipelineErrorInBody,
} from "@/src/shared/extension/ai-health-banner";

describe("resolveExtensionAiHealthBanner", () => {
  it("uses config aiHealthError when present", () => {
    const banner = resolveExtensionAiHealthBanner({
      aiHealthError: "Daily enhancement limit reached (5/day). Add your API key for more.",
      byokKeyInvalid: false,
      systemQuotaExceeded: true,
    } as never);
    expect(banner?.message).toContain("Daily enhancement");
    expect(banner?.fixPath).toBe("/dashboard/settings?aiSource=auto");
  });

  it("falls back to pipeline quota error when config message is missing", () => {
    const banner = resolveExtensionAiHealthBanner(
      { systemQuotaExceeded: false, byokKeyInvalid: false } as never,
      "Daily enhancement limit reached (5/day). Add your API key for more.",
    );
    expect(banner?.message).toContain("Daily enhancement");
  });

  it("routes key issues to Settings add-key flow", () => {
    const banner = resolveExtensionAiHealthBanner({
      aiHealthError: "Your API key is failing. Check it in AI Keys settings.",
      byokKeyInvalid: true,
      systemQuotaExceeded: false,
    } as never);
    expect(banner?.fixPath).toBe("/dashboard/settings?addKey=1");
    expect(banner?.bannerLabel).toBe("Key issue");
  });

  it("hides duplicate pipeline error in card body", () => {
    const message = "Daily enhancement limit reached (5/day). Add your API key for more.";
    const banner = resolveExtensionAiHealthBanner({ aiHealthError: message } as never);
    expect(shouldHidePipelineErrorInBody(banner, message)).toBe(true);
    expect(shouldHidePipelineErrorInBody(banner, "Other error")).toBe(false);
  });
});

describe("isExtensionApplyBlockedByAiHealth", () => {
  it("blocks only when system quota is exhausted", () => {
    expect(
      isExtensionApplyBlockedByAiHealth({
        aiHealthError: "Daily enhancement limit reached (5/day).",
        systemQuotaExceeded: false,
        byokKeyInvalid: false,
      } as never),
    ).toBe(true);
    expect(
      isExtensionApplyBlockedByAiHealth({
        aiHealthError: null,
        systemQuotaExceeded: true,
        byokKeyInvalid: false,
      } as never),
    ).toBe(true);
  });

  it("allows apply for key or API advisory errors", () => {
    expect(
      isExtensionApplyBlockedByAiHealth({
        aiHealthError: "Your API key is failing. Check it in AI Keys settings.",
        systemQuotaExceeded: false,
        byokKeyInvalid: true,
      } as never),
    ).toBe(false);
    expect(
      isExtensionApplyBlockedByAiHealth({
        aiHealthError: "Add your API key in AI Keys to unlock AI enhancements.",
        systemQuotaExceeded: false,
        byokKeyInvalid: false,
      } as never),
    ).toBe(false);
  });

  it("still shows advisory banner when apply is allowed", () => {
    const config = {
      aiHealthError: "Your API key is failing. Check it in AI Keys settings.",
      systemQuotaExceeded: false,
      byokKeyInvalid: true,
    } as never;
    expect(isExtensionApplyBlockedByAiHealth(config)).toBe(false);
    expect(getExtensionAiHealthBlockMessage(config)).toBeNull();
    expect(resolveExtensionAiHealthBanner(config)?.message).toContain("API key");
  });

  it("allows apply when config is healthy", () => {
    expect(
      isExtensionApplyBlockedByAiHealth({
        aiHealthError: null,
        systemQuotaExceeded: false,
        byokKeyInvalid: false,
      } as never),
    ).toBe(false);
    expect(getExtensionAiHealthBlockMessage({ aiHealthError: null } as never)).toBeNull();
  });
});
