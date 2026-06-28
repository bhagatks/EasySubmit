export type {
  ApiCallAiMode,
  ApiCallDomain,
  ApiCallKeySource,
  ApiCallLogContext,
  ApiCallLogInput,
  ApiCallStatus,
} from "@/src/shared/observability/types";

export {
  API_CALL_LOG_PREFIX,
  createApiTraceId,
  formatApiCallConsolePayload,
  logApiCall,
  persistApiCallLog,
  withApiCallLog,
} from "@/src/shared/observability/api-call-log";

export { routeContextForApiLog, type RouteLogContext } from "@/src/shared/observability/route-context";

export {
  SCREEN_CATALOG,
  type ScreenAuthZone,
  type ScreenId,
} from "@/src/shared/observability/screen-diagnostics-catalog";

export {
  resolveScreenIdFromPath,
  sanitizeQueryKeys,
} from "@/src/shared/observability/resolve-screen-from-path";

export {
  SCREEN_DIAG_LOG_PREFIX,
  logScreenDiag,
  logScreenOverlay,
  logScreenView,
  type ScreenDiagInput,
  type ScreenDiagPhase,
  type ScreenViewInput,
} from "@/src/shared/observability/screen-diagnostics";
