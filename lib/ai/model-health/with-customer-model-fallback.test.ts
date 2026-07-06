import { describe, expect, it, vi } from "vitest";
import { withCustomerModelFallback } from "@/lib/ai/model-health/with-customer-model-fallback";

vi.mock("@/lib/vault/decrypt-vault-secret", () => ({
  withVaultDecryptedSecret: vi.fn(async (_vaultKeyId: string, fn: (key: string) => Promise<unknown>) => ({
    ok: true,
    result: await fn("test-key"),
  })),
}));

vi.mock("@/lib/vault/user-key-vault", () => ({
  getUserApiKeyCredentials: vi.fn(async () => ({
    apiKey: "test-key",
    customEndpointUrl: null,
  })),
}));

vi.mock("@/lib/ai/model-health/resolve-model-candidates", () => ({
  recordModelRuntimeOutcome: vi.fn(async () => undefined),
}));

describe("withCustomerModelFallback", () => {
  it("tries the next ranked model after a retryable provider error", async () => {
    const route = {
      mode: "customer" as const,
      provider: "anthropic" as const,
      vaultKeyId: "vault-1",
      modelId: "bad-model",
      modelCandidates: ["bad-model", "good-model"],
    };

    const execute = vi
      .fn()
      .mockRejectedValueOnce(new Error("model: bad-model"))
      .mockResolvedValueOnce({ text: "OK" });

    const result = await withCustomerModelFallback({
      route,
      userId: "user-1",
      execute,
    });

    expect(result.modelId).toBe("good-model");
    expect(result.attemptCount).toBe(2);
    expect(execute).toHaveBeenCalledTimes(2);
  });
});
