"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  performEngineHandshake,
  type EngineHandshakeResult,
} from "@/src/lib/ai/discovery-service";
import type { EngineTerminalError } from "@/src/lib/ai/engine-errors";
import type { HandshakeProvider } from "@/src/lib/config/career-grade-models";
import { createApiTraceId } from "@/src/shared/observability";

export type RunEngineDiscoveryInput = {
  provider: HandshakeProvider;
  apiKey: string;
};

export type RunEngineDiscoverySuccess = Extract<EngineHandshakeResult, { success: true }>;

export type RunEngineDiscoveryFailure = {
  success: false;
  error: EngineTerminalError;
  /** @deprecated Use error.message — kept for legacy callers */
  code?: string;
};

export type RunEngineDiscoveryResult = RunEngineDiscoverySuccess | RunEngineDiscoveryFailure;

/**
 * Server action — BYOK handshake with career-grade model validation.
 * Returns structured ENGINE_ERRORS terminal lines for Ignition Gate UI.
 */
export async function runEngineDiscovery(
  input: RunEngineDiscoveryInput,
): Promise<RunEngineDiscoveryResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    const { formatEngineTerminalError, ENGINE_ERRORS } = await import("@/src/lib/ai/engine-errors");
    return {
      success: false,
      error: formatEngineTerminalError(ENGINE_ERRORS.UNAUTHORIZED),
      code: "unauthorized",
    };
  }

  const result = await performEngineHandshake(input, {
    traceId: createApiTraceId(),
    userId: session.user.id,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      code: result.error.code,
    };
  }

  return result;
}
