import { describe, expect, it } from "vitest";
import { geminiApiHeaders, geminiModelsListUrl } from "@/src/lib/ai/gemini-api";

describe("gemini-api", () => {
  it("uses x-goog-api-key header for models list (auth AQ. keys)", () => {
    expect(geminiApiHeaders("AQ.test-key")).toEqual({
      "x-goog-api-key": "AQ.test-key",
    });
    expect(geminiModelsListUrl()).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models",
    );
  });
});
