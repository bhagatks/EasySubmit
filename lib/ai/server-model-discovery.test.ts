import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/src/lib/ai/validate-gemini-key", () => ({
  validateGeminiKey: vi.fn(),
}));

import { validateGeminiKey } from "@/src/lib/ai/validate-gemini-key";
import { handshakeProviderModels } from "@/src/lib/ai/server-model-discovery";

describe("handshakeProviderModels", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.mocked(validateGeminiKey).mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("falls back to chat probe when OpenAI cannot list models (403)", async () => {
    const fetchMock = vi.mocked(fetch);

    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: { message: "You are not allowed to list models" },
          }),
          { status: 403 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "chatcmpl-test" }), { status: 200 }),
      );

    const result = await handshakeProviderModels("openai", "sk-test");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.models).toContain("gpt-4o");
      expect(result.models).toContain("gpt-4o-mini");
    }

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/v1/chat/completions");
  });

  it("uses Gemini REST model list without generateContent ping when REST succeeds", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          models: [
            {
              name: "models/gemini-2.5-flash",
              supportedGenerationMethods: ["generateContent"],
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await handshakeProviderModels("gemini", "AQ.test-key");

    expect(validateGeminiKey).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.models).toContain("gemini-2.5-flash");
      expect(result.models).toContain("gemini-1.5-flash");
    }
  });

  it("returns account-blocked guidance when Gemini REST denies the project", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: { message: "Your project has been denied access. Please contact support." },
        }),
        { status: 403 },
      ),
    );

    const result = await handshakeProviderModels("gemini", "AQ.test-key");

    expect(validateGeminiKey).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("forbidden");
      expect(result.message).toContain("different Google account");
    }
  });
});
