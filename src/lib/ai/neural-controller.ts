/**
 * Neural Controller — single import surface for BYOK handshake, discovery, and refinement.
 * Server actions live under `app/actions/ai/`; core logic under `src/lib/ai/`.
 */
export {
  runEngineDiscovery,
  type RunEngineDiscoveryFailure,
  type RunEngineDiscoveryInput,
  type RunEngineDiscoveryResult,
  type RunEngineDiscoverySuccess,
} from "@/app/actions/ai/discovery-service";

export {
  executeEngineRefinement,
  type ExecuteEngineRefinementInput,
} from "@/app/actions/ai/engine";

export {
  performEngineHandshake,
  type EngineHandshakeFailure,
  type EngineHandshakeInput,
  type EngineHandshakeResult,
  type EngineHandshakeSuccess,
} from "@/src/lib/ai/discovery-service";

export { createAiSdkLanguageModel } from "@/src/lib/ai/ai-sdk-provider";

export { verifyApiKeyWithAiSdk } from "@/src/lib/ai/ai-sdk-handshake";

export type {
  ExecuteEngineRefinementResult,
  ExecuteEngineRefinementSuccess,
} from "@/src/lib/ai/engine-types";

export type { CareerArchitectureContent } from "@/src/lib/ai/engine-refinement";
