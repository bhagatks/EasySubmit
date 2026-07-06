import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const generateTextMock = vi.fn();
const generateObjectMock = vi.fn();
const withVaultDecryptedSecretMock = vi.fn();
const logApiCallMock = vi.fn();

vi.mock("@/lib/vault/user-key-vault", () => ({
  getUserApiKeyCredentials: vi.fn(async () => null),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock("@/src/lib/services/config-service", () => ({
  getAppConfig: vi.fn(),
}));

vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => generateTextMock(...args),
  generateObject: (...args: unknown[]) => generateObjectMock(...args),
}));

vi.mock("@/lib/vault/decrypt-vault-secret", () => ({
  VAULT_DECRYPT_USER_MESSAGE:
    "Could not decrypt your API key. Update it in AI Keys.",
  withVaultDecryptedSecret: (...args: unknown[]) => withVaultDecryptedSecretMock(...args),
}));

vi.mock("@/src/shared/observability", () => ({
  logApiCall: (...args: unknown[]) => logApiCallMock(...args),
}));

vi.mock("@/src/lib/ai/ai-sdk-provider", () => ({
  createAiSdkLanguageModel: vi.fn(() => "mock-model"),
}));

vi.mock("@/lib/ai/model-health/resolve-model-candidates", () => ({
  recordModelRuntimeOutcome: vi.fn(async () => undefined),
  loadProviderModelHealth: vi.fn(async () => null),
}));

vi.mock("@/lib/ai/model-health/resolve-byok-task-route", () => ({
  resolveRouteForByokTask: vi.fn(async (route: unknown) => route),
  taskTierFromEnhancePass: vi.fn((pass: string) => (pass === "optimize" ? "flagship" : "cheap")),
}));

import { callEnhanceModel, callEnhanceObjectModel } from "@/src/lib/ai/engine/run-enhance";

const customerRoute = {
  mode: "customer" as const,
  provider: "gemini" as const,
  modelId: "gemini-2.5-flash",
  modelCandidates: ["gemini-2.5-flash"],
  vaultKeyId: "vault-secret-1",
};

describe("BYOK customer route observability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withVaultDecryptedSecretMock.mockImplementation(
      async (_id: string, fn: (key: string) => Promise<unknown>) => {
        const result = await fn("test-api-key");
        return { ok: true as const, result };
      },
    );
  });

  it("logs api_call_logs when generateText fails on customer route", async () => {
    generateTextMock.mockRejectedValue(new Error("API key not valid. Please pass a valid API key."));

    await expect(
      callEnhanceModel(customerRoute, "system", "prompt", "trace-byok-1", "generate", "user-1"),
    ).rejects.toThrow("API key not valid");

    expect(logApiCallMock).toHaveBeenCalledTimes(1);
    expect(logApiCallMock).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: "trace-byok-1",
        aiMode: "customer",
        status: "error",
        errorCode: "provider_error",
        operation: "ai.enhance.generate_text",
      }),
    );
  });

  it("logs api_call_logs when generateObject fails on customer route", async () => {
    generateObjectMock.mockRejectedValue(new Error("API key not valid. Please pass a valid API key."));

    const schema = z.object({ ok: z.boolean() });

    await expect(
      callEnhanceObjectModel(
        customerRoute,
        "system",
        "prompt",
        schema,
        "trace-byok-2",
        "generate",
        "user-1",
      ),
    ).rejects.toThrow("API key not valid");

    expect(logApiCallMock).toHaveBeenCalledTimes(1);
    expect(logApiCallMock).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: "trace-byok-2",
        aiMode: "customer",
        status: "error",
        errorCode: "provider_error",
        operation: "ai.enhance.generate_object",
      }),
    );
  });

  it("does not double-log vault decrypt failures", async () => {
    withVaultDecryptedSecretMock.mockResolvedValue({ ok: false, reason: "VAULT_LOCK" });

    await expect(
      callEnhanceModel(customerRoute, "system", "prompt", "trace-byok-3", "generate", "user-1"),
    ).rejects.toThrow("Could not decrypt your API key");

    expect(logApiCallMock).toHaveBeenCalledTimes(1);
    expect(logApiCallMock).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: "vault_decrypt_failed",
      }),
    );
  });
});
