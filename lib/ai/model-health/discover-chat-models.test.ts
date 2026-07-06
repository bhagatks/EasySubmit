import { describe, expect, it } from "vitest";
import {
  filterDiscoverableChatModels,
  resolveDiscoverableModels,
} from "@/lib/ai/model-health/discover-chat-models";

describe("discover-chat-models", () => {
  it("excludes embedding and infrastructure models", () => {
    const models = filterDiscoverableChatModels("openai", [
      "gpt-4o",
      "text-embedding-3-small",
      "gpt-4o-mini",
      "whisper-1",
    ]);
    expect(models).toEqual(["gpt-4o", "gpt-4o-mini"]);
  });

  it("includes newly released model ids without regex allowlists", () => {
    const models = filterDiscoverableChatModels("openai", [
      "gpt-5.4-mini",
      "gpt-3.5-turbo",
    ]);
    expect(models).toContain("gpt-5.4-mini");
    expect(models).toContain("gpt-3.5-turbo");
  });

  it("falls back to bundled defaults when api list is empty", () => {
    const models = resolveDiscoverableModels("gemini", []);
    expect(models.length).toBeGreaterThan(0);
    expect(models.some((id) => id.includes("gemini"))).toBe(true);
  });

  it("does not fall back to bundled OpenAI defaults for custom provider", () => {
    const models = resolveDiscoverableModels("custom", []);
    expect(models).toEqual([]);
  });
});
