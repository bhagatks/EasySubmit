import { describe, expect, it } from "vitest";
import {
  DEFAULT_SYSTEM_POOL_PROVIDER,
  normalizeSystemDeepSeekModelId,
  parseSystemPoolProvider,
  resolveSystemJdExtractModel,
  resolveSystemResumeModel,
  SYSTEM_DEEPSEEK_MODEL_ID,
  SYSTEM_JD_EXTRACT_MODEL_DEFAULTS,
  SYSTEM_RESUME_MODEL_DEFAULTS,
} from "@/src/lib/ai/engine/system-model-defaults";

describe("system-model-defaults", () => {
  it("defaults to deepseek flash for resume and JD extract", () => {
    expect(DEFAULT_SYSTEM_POOL_PROVIDER).toBe("deepseek");
    expect(SYSTEM_RESUME_MODEL_DEFAULTS.deepseek).toBe("deepseek-v4-flash");
    expect(SYSTEM_JD_EXTRACT_MODEL_DEFAULTS.deepseek).toBe("deepseek-v4-flash");
    expect(SYSTEM_RESUME_MODEL_DEFAULTS.openrouter).toBe("openrouter/free");
  });

  it("parses known system pool providers", () => {
    expect(parseSystemPoolProvider("deepseek")).toBe("deepseek");
    expect(parseSystemPoolProvider("openrouter")).toBe("openrouter");
    expect(parseSystemPoolProvider("gemini")).toBe("gemini");
    expect(parseSystemPoolProvider("openai")).toBe("deepseek");
  });

  it("forces deepseek-v4-flash for system deepseek overrides", () => {
    expect(resolveSystemResumeModel("deepseek", "custom-model")).toBe(SYSTEM_DEEPSEEK_MODEL_ID);
    expect(resolveSystemResumeModel("gemini", "custom-model")).toBe("custom-model");
    expect(resolveSystemJdExtractModel("openrouter")).toBe(SYSTEM_JD_EXTRACT_MODEL_DEFAULTS.openrouter);
  });

  it("normalizes legacy DeepSeek system model ids to v4 flash", () => {
    expect(normalizeSystemDeepSeekModelId("deepseek-chat")).toBe(SYSTEM_DEEPSEEK_MODEL_ID);
    expect(normalizeSystemDeepSeekModelId("deepseek-v4-pro")).toBe(SYSTEM_DEEPSEEK_MODEL_ID);
    expect(resolveSystemResumeModel("deepseek", "deepseek-chat")).toBe(SYSTEM_DEEPSEEK_MODEL_ID);
    expect(resolveSystemJdExtractModel("deepseek", "deepseek-reasoner")).toBe(SYSTEM_DEEPSEEK_MODEL_ID);
  });
});
