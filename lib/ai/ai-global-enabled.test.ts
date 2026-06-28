import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  isAiGloballyEnabled,
  isClientAiGloballyEnabled,
  isClientUserAiEnhancementEnabled,
  isUserAiEnhancementEnabled,
} from "@/lib/ai/ai-global-enabled";

describe("ai-global-enabled", () => {
  const originalServer = process.env.EASYSUBMIT_AI_GLOBALLY_ENABLED;
  const originalClient = process.env.NEXT_PUBLIC_AI_GLOBALLY_ENABLED;

  afterEach(() => {
    if (originalServer === undefined) {
      delete process.env.EASYSUBMIT_AI_GLOBALLY_ENABLED;
    } else {
      process.env.EASYSUBMIT_AI_GLOBALLY_ENABLED = originalServer;
    }
    if (originalClient === undefined) {
      delete process.env.NEXT_PUBLIC_AI_GLOBALLY_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_AI_GLOBALLY_ENABLED = originalClient;
    }
  });

  describe("isAiGloballyEnabled", () => {
    it("defaults to enabled", () => {
      delete process.env.EASYSUBMIT_AI_GLOBALLY_ENABLED;
      expect(isAiGloballyEnabled()).toBe(true);
    });

    it("returns false when env is false", () => {
      process.env.EASYSUBMIT_AI_GLOBALLY_ENABLED = "false";
      expect(isAiGloballyEnabled()).toBe(false);
    });
  });

  describe("isClientAiGloballyEnabled", () => {
    it("defaults to enabled", () => {
      delete process.env.NEXT_PUBLIC_AI_GLOBALLY_ENABLED;
      expect(isClientAiGloballyEnabled()).toBe(true);
    });

    it("returns false when public env is false", () => {
      process.env.NEXT_PUBLIC_AI_GLOBALLY_ENABLED = "false";
      expect(isClientAiGloballyEnabled()).toBe(false);
    });
  });

  describe("isUserAiEnhancementEnabled", () => {
    beforeEach(() => {
      delete process.env.EASYSUBMIT_AI_GLOBALLY_ENABLED;
    });

    it("returns false when preference is disabled", () => {
      expect(isUserAiEnhancementEnabled("disabled")).toBe(false);
      expect(isUserAiEnhancementEnabled(null)).toBe(false);
    });

    it("returns true for auto when globally enabled", () => {
      expect(isUserAiEnhancementEnabled("auto")).toBe(true);
    });

    it("returns false when globally disabled even if preference is auto", () => {
      process.env.EASYSUBMIT_AI_GLOBALLY_ENABLED = "false";
      expect(isUserAiEnhancementEnabled("auto")).toBe(false);
    });
  });

  describe("isClientUserAiEnhancementEnabled", () => {
    beforeEach(() => {
      delete process.env.NEXT_PUBLIC_AI_GLOBALLY_ENABLED;
    });

    it("mirrors client global + preference rules", () => {
      expect(isClientUserAiEnhancementEnabled("auto")).toBe(true);
      process.env.NEXT_PUBLIC_AI_GLOBALLY_ENABLED = "false";
      expect(isClientUserAiEnhancementEnabled("auto")).toBe(false);
    });
  });
});
