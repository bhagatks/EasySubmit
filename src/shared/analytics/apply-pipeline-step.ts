import {
  PIPELINE_DEBUG_STEP_DEFS,
  type PipelineDebugStepStatus,
} from "@/src/shared/extension/pipeline-debug-types";
import { sanitizeProperties } from "@/src/shared/analytics/sanitize";

export type ApplyPipelineStepAnalyticsInput = {
  userId?: string | null;
  entryId?: string | null;
  traceId?: string | null;
  applySessionId?: string | null;
  stepId: string;
  status: PipelineDebugStepStatus;
  detail?: string | null;
  meta?: Record<string, unknown> | null;
};

function lookupStepDef(stepId: string) {
  return PIPELINE_DEBUG_STEP_DEFS.find((def) => def.id === stepId);
}

/** Shared PostHog payload for extension Apply pipeline steps (overlay + analytics). */
export function buildApplyPipelineStepProperties(
  input: ApplyPipelineStepAnalyticsInput,
): Record<string, unknown> {
  const def = lookupStepDef(input.stepId);
  const sanitizedMeta = sanitizeProperties(input.meta ?? undefined);

  return {
    surface: "extension",
    entry_id: input.entryId ?? undefined,
    trace_id: input.traceId ?? undefined,
    apply_session_id: input.applySessionId ?? undefined,
    step_id: input.stepId,
    step_group: def?.group ?? undefined,
    step_label: def?.label ?? input.stepId,
    step_description: def?.description ?? undefined,
    step_status: input.status,
    detail: input.detail?.trim() ? input.detail.trim().slice(0, 200) : undefined,
    step_meta: Object.keys(sanitizedMeta).length > 0 ? sanitizedMeta : undefined,
  };
}
