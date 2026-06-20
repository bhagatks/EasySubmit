import { beforeEach, describe, expect, it, vi } from "vitest";

const generateContent = vi.fn();
const getGenerativeModel = vi.fn(() => ({ generateContent }));

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel,
  })),
}));

import { validateGeminiKey } from "@/src/lib/ai/validate-gemini-key";

describe("validateGeminiKey", () => {
  beforeEach(() => {
    generateContent.mockReset();
    getGenerativeModel.mockClear();
  });

  it("returns bundled models after a minimal ping on gemini-1.5-flash", async () => {
    generateContent.mockResolvedValue({ response: { text: () => "OK" } });

    const result = await validateGeminiKey("AQ.test-key");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pingModel).toBe("gemini-1.5-flash");
      expect(result.models).toContain("gemini-2.5-flash");
    }

    expect(getGenerativeModel).toHaveBeenCalledWith({ model: "gemini-1.5-flash" });
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        generationConfig: { maxOutputTokens: 1 },
      }),
    );
  });

  it("maps invalid key errors without trying further models", async () => {
    generateContent.mockRejectedValue(new Error("API key not valid. Please pass a valid API key."));

    const result = await validateGeminiKey("bad-key");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("invalid_key");
    }
    expect(generateContent).toHaveBeenCalledTimes(1);
  });
});
