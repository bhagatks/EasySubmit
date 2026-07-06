import { withVaultDecryptedSecret, VAULT_DECRYPT_USER_MESSAGE } from "@/lib/vault/decrypt-vault-secret";
import { getUserApiKeyCredentials } from "@/lib/vault/user-key-vault";
import { mapEnhanceProviderError } from "@/src/lib/ai/engine/map-enhance-provider-error";
import type { ResolvedAiRoute } from "@/src/lib/ai/engine/router";
import { recordModelRuntimeOutcome } from "@/lib/ai/model-health/resolve-model-candidates";

type CustomerRoute = Extract<ResolvedAiRoute, { mode: "customer" }>;

function isRetryableCustomerError(err: unknown): boolean {
  const mapped = mapEnhanceProviderError(err, { aiMode: "customer" });
  return mapped.code === "provider_error" || mapped.code === "invalid_response";
}

export async function withCustomerModelFallback<T>(input: {
  route: CustomerRoute;
  userId?: string | null;
  execute: (
    modelId: string,
    apiKey: string,
    customEndpointUrl?: string | null,
  ) => Promise<T>;
}): Promise<{ result: T; modelId: string; attemptCount: number }> {
  const candidates = input.route.modelCandidates.length
    ? input.route.modelCandidates
    : [input.route.modelId];

  const customEndpointUrl =
    input.userId != null
      ? (await getUserApiKeyCredentials(input.userId, input.route.provider))?.customEndpointUrl ??
        null
      : null;

  let lastError: unknown = null;

  for (let index = 0; index < candidates.length; index++) {
    const modelId = candidates[index]!;
    try {
      const vaultRun = await withVaultDecryptedSecret(input.route.vaultKeyId, async (apiKey) =>
        input.execute(modelId, apiKey, customEndpointUrl),
      );

      if (!vaultRun.ok) {
        throw new Error(VAULT_DECRYPT_USER_MESSAGE);
      }

      if (input.userId) {
        await recordModelRuntimeOutcome({
          userId: input.userId,
          provider: input.route.provider,
          modelId,
          ok: true,
        });
      }

      return {
        result: vaultRun.result,
        modelId,
        attemptCount: index + 1,
      };
    } catch (err) {
      lastError = err;
      if (input.userId && isRetryableCustomerError(err)) {
        const message = err instanceof Error ? err.message : String(err);
        await recordModelRuntimeOutcome({
          userId: input.userId,
          provider: input.route.provider,
          modelId,
          ok: false,
          errorMessage: message,
        });
      }

      const hasNext = index < candidates.length - 1;
      if (!hasNext || !isRetryableCustomerError(err)) {
        throw err;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Customer model fallback exhausted");
}
