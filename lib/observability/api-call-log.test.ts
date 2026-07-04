import { describe, expect, it, vi, beforeEach } from "vitest";

const { createMock } = vi.hoisted(() => ({
  createMock: vi.fn().mockResolvedValue({ id: "log_1" }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    apiCallLog: {
      create: createMock,
    },
  },
}));

import {
  formatApiCallConsolePayload,
  persistApiCallLog,
} from "@/src/shared/observability/api-call-log";
import { routeContextForApiLog } from "@/src/shared/observability/route-context";

describe("formatApiCallConsolePayload", () => {
  it("strips secret-like metadata keys", () => {
    const payload = formatApiCallConsolePayload({
      domain: "ai",
      operation: "ai.enhance.generate_text",
      status: "success",
      durationMs: 1200,
      metadata: {
        pass: "generate",
        apiKey: "should-not-appear",
      },
    });

    expect(payload.metadata).toEqual({ pass: "generate" });
    expect(JSON.stringify(payload)).not.toContain("should-not-appear");
  });
});

describe("routeContextForApiLog", () => {
  it("maps system route without per-job key slot", () => {
    expect(
      routeContextForApiLog({
        mode: "system",
        provider: "deepseek",
        modelId: "deepseek-chat",
      }),
    ).toEqual({
      aiMode: "system",
      provider: "deepseek",
      modelId: "deepseek-chat",
      keySlot: null,
      keySource: null,
    });
  });

  it("maps customer route without key slot", () => {
    expect(
      routeContextForApiLog({
        mode: "customer",
        provider: "anthropic",
        modelId: "claude-3-5-haiku-latest",
        modelCandidates: ["claude-3-5-haiku-latest"],
        vaultKeyId: "uuid",
      }),
    ).toEqual({
      aiMode: "customer",
      provider: "anthropic",
      modelId: "claude-3-5-haiku-latest",
      keySlot: null,
      keySource: "vault",
    });
  });
});

describe("persistApiCallLog", () => {
  beforeEach(() => {
    createMock.mockClear();
  });

  it("writes structured row to prisma", async () => {
    const id = await persistApiCallLog({
      traceId: "abc12345",
      userId: "user_1",
      domain: "ai",
      operation: "ai.enhance.generate_text",
      provider: "gemini",
      modelId: "gemini-2.5-flash-lite",
      status: "success",
      durationMs: 10252,
      tokensUsed: 4699,
      estimatedCost: 0,
      aiMode: "system",
      keySlot: 0,
      keyLabel: "Alpha",
      keySource: "vault",
      billingMode: "free",
      metadata: { pass: "generate" },
    });

    expect(id).toBe("log_1");
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          traceId: "abc12345",
          operation: "ai.enhance.generate_text",
          keySlot: 0,
          status: "success",
        }),
      }),
    );
  });
});
