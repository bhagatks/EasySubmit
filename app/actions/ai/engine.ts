"use server";

import { generateText } from "ai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withVaultDecryptedSecret } from "@/lib/vault/decrypt-vault-secret";
import { createAiSdkLanguageModel } from "@/src/lib/ai/ai-sdk-provider";
import {
  buildEngineRefinementPrompt,
  parseRefinedArchitectureJson,
  type CareerArchitectureContent,
} from "@/src/lib/ai/engine-refinement";
import {
  ENGINE_ERRORS,
  formatEngineTerminalError,
} from "@/src/lib/ai/engine-errors";
import { buildUsageLogFromGeneration } from "@/src/lib/ai/estimate-usage-cost";
import { getAppConfig } from "@/src/lib/services/config-service";
import {
  isHandshakeProvider,
  type HandshakeProvider,
} from "@/src/lib/config/career-grade-models";
import { getTargetAiModel, type AiProvider } from "@/src/lib/config/app.config";
import { recordUsageLogForUser } from "@/app/actions/ai/usage-log";
import type {
  ExecuteEngineRefinementInput,
  ExecuteEngineRefinementResult,
} from "@/src/lib/ai/engine-types";

export type {
  ExecuteEngineRefinementInput,
  ExecuteEngineRefinementResult,
  ExecuteEngineRefinementSuccess,
  ExecuteEngineRefinementVaultLock,
  ExecuteEngineRefinementFailure,
} from "@/src/lib/ai/engine-types";

function resolveModelId(
  provider: AiProvider,
  modelId?: string | null,
): string {
  const trimmed = modelId?.trim();
  if (trimmed) return trimmed;
  return getTargetAiModel(provider);
}

/**
 * Headless engine refinement — decrypt vaulted BYOK, refine Career Architecture
 * JSON via Vercel AI SDK, return transformed JSONB only (no secrets).
 */
export async function executeEngineRefinement(
  input: ExecuteEngineRefinementInput = {},
): Promise<ExecuteEngineRefinementResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    const err = formatEngineTerminalError(ENGINE_ERRORS.UNAUTHORIZED);
    return {
      success: false,
      status: "ERROR",
      error: err.message,
      code: err.code,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      vaultKeyId: true,
      activeProvider: true,
      profiles: {
        where: { isDefault: true },
        take: 1,
        select: {
          architecture: {
            select: {
              targetRole: true,
              calibrationScore: true,
              content: true,
            },
          },
        },
      },
    },
  });

  if (!user?.vaultKeyId) {
    return {
      success: false,
      status: "VAULT_LOCK",
      error:
        "Vaulted API key not found. Re-authenticate through the Ignition Gate.",
    };
  }

  if (!user.activeProvider || !isHandshakeProvider(user.activeProvider)) {
    return {
      success: false,
      status: "VAULT_LOCK",
      error:
        "Active provider is missing or invalid. Re-run Ignition Gate setup.",
    };
  }

  const provider = user.activeProvider as HandshakeProvider;
  const architecture = user.profiles[0]?.architecture;
  const targetRole = architecture?.targetRole ?? "";
  const calibrationScore = architecture?.calibrationScore ?? 0;
  const sourceContent =
    architecture?.content &&
    typeof architecture.content === "object" &&
    !Array.isArray(architecture.content)
      ? (architecture.content as CareerArchitectureContent)
      : {};

  const modelId = resolveModelId(provider, input.modelId);
  const prompt = buildEngineRefinementPrompt(targetRole, sourceContent);

  const vaultRun = await withVaultDecryptedSecret(user.vaultKeyId, async (apiKey) => {
    const model = createAiSdkLanguageModel(provider, apiKey, modelId);

    return generateText({
      model,
      prompt,
      maxOutputTokens: 4096,
    });
  });

  if (!vaultRun.ok) {
    return {
      success: false,
      status: "VAULT_LOCK",
      error:
        "Could not decrypt vaulted API key. Your key may have expired — re-enter it in the Ignition Gate.",
    };
  }

  const generation = vaultRun.result;
  const refined = parseRefinedArchitectureJson(generation.text);

  if (!refined) {
    const err = formatEngineTerminalError(
      ENGINE_ERRORS.PROVIDER_ERROR,
      "Engine returned invalid architecture JSON.",
    );
    return {
      success: false,
      status: "ERROR",
      error: err.message,
      code: err.code,
    };
  }

  const usagePayload = buildUsageLogFromGeneration(
    modelId,
    generation.usage,
    await getAppConfig("ai_pricing_map"),
  );
  await recordUsageLogForUser(userId, usagePayload);

  return {
    success: true,
    content: refined,
    targetRole,
    calibrationScore,
  };
}
