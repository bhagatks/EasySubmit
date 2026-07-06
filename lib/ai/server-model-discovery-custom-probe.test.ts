import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handshakeProviderModels } from "@/src/lib/ai/server-model-discovery";

describe("handshakeProviderModels custom endpoint probe", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses custom model ID without chat probe when models list is empty", async () => {
    const fetchMock = vi.mocked(fetch);

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }));

    const result = await handshakeProviderModels("custom", "sk-test", {
      customEndpointUrl: "https://gateway.example.com/v1",
      customModelId: "coding-glm-5.1-free",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.models).toEqual(["coding-glm-5.1-free"]);
      expect(result.models).not.toContain("gpt-4o");
      expect(result.models).not.toContain("gpt-4o-mini");
    }

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to chat probe with custom model when models list is forbidden", async () => {
    const fetchMock = vi.mocked(fetch);

    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "Forbidden" } }), { status: 403 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "chatcmpl-test" }), { status: 200 }),
      );

    const result = await handshakeProviderModels("custom", "sk-test", {
      customEndpointUrl: "https://gateway.example.com/v1",
      customModelId: "my-local-model",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.models).toEqual(["my-local-model"]);
    }
  });

  it("appends custom model ID to discovered models when list succeeds", async () => {
    const fetchMock = vi.mocked(fetch);

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [{ id: "other-model" }],
        }),
        { status: 200 },
      ),
    );

    const result = await handshakeProviderModels("custom", "sk-test", {
      customEndpointUrl: "https://gateway.example.com/v1",
      customModelId: "coding-glm-5.1-free",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.models).toContain("other-model");
      expect(result.models).toContain("coding-glm-5.1-free");
    }
  });
});
