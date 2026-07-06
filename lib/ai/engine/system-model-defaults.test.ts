import { describe, expect, it } from "vitest";
import {
  DEFAULT_SYSTEM_POOL_PROVIDER,
  parseSystemPoolProvider,
  resolveSystemJdExtractModel,
  resolveSystemResumeModel,
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

  it("honors explicit model overrides", () => {
    expect(resolveSystemResumeModel("deepseek", "custom-model")).toBe("custom-model");
    expect(resolveSystemJdExtractModel("openrouter")).toBe(SYSTEM_JD_EXTRACT_MODEL_DEFAULTS.openrouter);
  });
});
