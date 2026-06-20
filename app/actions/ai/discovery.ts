"use server";

import {
  runEngineDiscovery,
  type RunEngineDiscoveryInput,
  type RunEngineDiscoveryResult,
} from "@/app/actions/ai/discovery-service";

export type DiscoverAiModelsInput = RunEngineDiscoveryInput;

export type DiscoverAiModelsSuccess = Extract<RunEngineDiscoveryResult, { success: true }>;

export type DiscoverAiModelsFailure = {
  success: false;
  error: string;
  code?: string;
  terminalLine?: string;
};

export type DiscoverAiModelsResult =
  | DiscoverAiModelsSuccess
  | DiscoverAiModelsFailure;

/**
 * Ignition Gate discovery — delegates to discovery-service handshake.
 * @deprecated Prefer `runEngineDiscovery` from `@/app/actions/ai/discovery-service`.
 */
export async function discoverAiModels(
  input: DiscoverAiModelsInput,
): Promise<DiscoverAiModelsResult> {
  const result = await runEngineDiscovery(input);

  if (!result.success) {
    return {
      success: false,
      error: result.error.message,
      code: result.error.code,
      terminalLine: result.error.terminalLine,
    };
  }

  return result;
}
