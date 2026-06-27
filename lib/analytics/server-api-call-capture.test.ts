import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => "1" });

describe("captureApiCallLogged", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockClear();
    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = "true";
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://us.i.posthog.com";
    process.env.NEXT_PUBLIC_ANALYTICS_ENV = "dev";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_ANALYTICS_ENABLED;
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
    delete process.env.NEXT_PUBLIC_ANALYTICS_ENV;
  });

  it("sends api_call_logged to PostHog with sanitized fields", async () => {
    const { captureApiCallLogged } = await import("@/src/shared/analytics/server-api-call-capture");

    captureApiCallLogged({
      apiLogId: "log_abc",
      traceId: "e0a3a0b0",
      userId: "user_1",
      domain: "ai",
      operation: "ai.enhance.generate_text",
      provider: "gemini",
      modelId: "gemini-2.5-flash-lite",
      status: "success",
      durationMs: 4200,
      tokensUsed: 1200,
      aiMode: "system",
      keySlot: 0,
      metadata: { pass: "generate", apiKey: "secret" },
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(String(init?.body));
    expect(body.event).toBe("api_call_logged");
    expect(body.distinct_id).toBe("user_1");
    expect(body.properties.operation).toBe("ai.enhance.generate_text");
    expect(body.properties.api_log_id).toBe("log_abc");
    expect(body.properties.metadata).toEqual({ pass: "generate" });
    expect(JSON.stringify(body)).not.toContain("secret");
  });

  it("no-ops when analytics disabled", async () => {
    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = "false";
    const { captureApiCallLogged } = await import("@/src/shared/analytics/server-api-call-capture");

    captureApiCallLogged({
      apiLogId: "log_abc",
      domain: "ai",
      operation: "ai.enhance.generate_text",
      status: "success",
      durationMs: 1,
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
