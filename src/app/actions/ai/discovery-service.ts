/**
 * Canonical export path for the engine discovery server action.
 * Implementation lives in `app/actions/ai/discovery-service.ts` (Next.js server boundary).
 */
export {
  discoverAiModelsViaService,
  runEngineDiscovery,
  type RunEngineDiscoveryFailure,
  type RunEngineDiscoveryInput,
  type RunEngineDiscoveryResult,
  type RunEngineDiscoverySuccess,
} from "@/app/actions/ai/discovery-service";
