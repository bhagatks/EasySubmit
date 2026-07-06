import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/src/lib/ai/engine/enhance-diagnostics", () => ({
  logEnhance: vi.fn(),
}));

import {
  OPENROUTER_FREE_MODEL_ID,
  OpenRouterFreeGuardError,
  callOpenRouterFreeText,
  isOpenRouterFreeModel,
} from "@/src/lib/ai/engine/openrouter-free-adapter";

describe("isOpenRouterFreeModel", () => {
  it("accepts models ending with :free", () => {
    expect(isOpenRouterFreeModel("deepseek/deepseek-chat:free")).toBe(true);
  });

  it("rejects paid models", () => {
    expect(isOpenRouterFreeModel("deepseek/deepseek-chat")).toBe(false);
  });
});

describe("callOpenRouterFreeText", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.stubGlobal("fetch", originalFetch);
  });

  it("returns text when OpenRouter responds with a :free model", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          model: "deepseek/deepseek-chat:free",
          choices: [{ message: { content: "OK" } }],
          usage: { total_tokens: 12 },
        }),
        { status: 200 },
      ),
    );

    const result = await callOpenRouterFreeText({
      apiKey: "test-key",
      prompt: "Reply OK",
    });

    expect(result.text).toBe("OK");
    expect(result.modelId).toBe("deepseek/deepseek-chat:free");
    expect(result.tokensUsed).toBe(12);
    expect(fetch).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
          "HTTP-Referer": "https://easysubmit.ai",
        }),
        body: expect.stringContaining(OPENROUTER_FREE_MODEL_ID),
      }),
    );
  });

  it("rejects non-free models even on HTTP 200", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          model: "deepseek/deepseek-chat",
          choices: [{ message: { content: "OK" } }],
        }),
        { status: 200 },
      ),
    );

    await expect(
      callOpenRouterFreeText({ apiKey: "test-key", prompt: "Reply OK" }),
    ).rejects.toBeInstanceOf(OpenRouterFreeGuardError);
  });

  it("maps 402 to OpenRouterFreeGuardError", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Payment required" } }), {
        status: 402,
      }),
    );

    await expect(
      callOpenRouterFreeText({ apiKey: "test-key", prompt: "Reply OK" }),
    ).rejects.toMatchObject({ status: 402 });
  });

  it("maps 429 to OpenRouterFreeGuardError", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Rate limited" } }), {
        status: 429,
      }),
    );

    await expect(
      callOpenRouterFreeText({ apiKey: "test-key", prompt: "Reply OK" }),
    ).rejects.toMatchObject({ status: 429 });
  });
});
