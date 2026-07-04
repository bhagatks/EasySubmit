import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import type { AiRouteResolution } from "@/src/lib/ai/engine/router";
import type { StudioEditorSectionId } from "@/lib/resume/studio-editor-sections";
import {
  pipelineStepHint,
  type EnhancePipelineStep,
} from "@/src/lib/ai/engine/enhance-pipeline";
import { DEFAULT_ENHANCE_WITH_AI_TIMEOUT_MS } from "@/src/lib/services/enhance-with-ai-config";
import { isEnhanceJourneyDebugEnabled } from "@/src/shared/analytics/config";
import { captureDevJourneyStep } from "@/src/shared/analytics/server-dev-capture";

export const ENHANCE_AI_LOG_PREFIX = "[EnhanceAI]";

/** Max chars for request/response previews in journey + ApiCall logs. */
export const JOURNEY_LOG_PREVIEW_CHARS = 400;

/** High-level resume journey phases — search logs with `journey:` field. */
export const RESUME_JOURNEY = {
  CAPTURE: "capture",
  ANALYZE: "analyze",
  BASELINE: "baseline",
  AI_UPGRADE: "ai_upgrade",
  PERSIST: "persist",
  APPLY_READY: "apply_ready",
} as const;

export type ResumeJourneyPhase = (typeof RESUME_JOURNEY)[keyof typeof RESUME_JOURNEY];

/** Whether an AI model call ran and how it ended for this journey step. */
export type JourneyAiCallStatus = "success" | "failure" | "skipped" | "blocked" | "none";

export type EnhanceLogScope = "client" | "server" | "engine" | "pipeline" | "export";

export type EnhanceLogPayload = Record<string, unknown> & {
  traceId?: string;
  step?: EnhancePipelineStep | string;
};

/** Short id to correlate browser console + server terminal logs. */
export function createEnhanceTraceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().slice(0, 8);
  }
  return `t${Date.now().toString(36)}`;
}

export function truncateForJourneyLog(
  value: string | null | undefined,
  max = JOURNEY_LOG_PREVIEW_CHARS,
): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

export function buildModelCallRequestPreview(system: string, prompt: string): string {
  return truncateForJourneyLog(
    `[system ${system.length} chars] ${system.slice(0, 120)} … [user ${prompt.length} chars] ${prompt}`,
    JOURNEY_LOG_PREVIEW_CHARS * 2,
  )!;
}

export function resolveJourneyAiCallStatus(input: {
  aiUsed: boolean;
  aiSucceeded?: boolean;
  blocked?: boolean;
}): JourneyAiCallStatus {
  if (!input.aiUsed) {
    return input.blocked ? "blocked" : "skipped";
  }
  if (input.aiSucceeded === true) return "success";
  if (input.aiSucceeded === false) return "failure";
  return "none";
}

export function logEnhance(
  scope: EnhanceLogScope,
  event: string,
  payload: EnhanceLogPayload = {},
): void {
  if (!isEnhanceJourneyDebugEnabled()) return;

  const step = payload.step;
  const hint = pipelineStepHint(typeof step === "string" ? step : undefined);

  console.log(ENHANCE_AI_LOG_PREFIX, {
    ts: new Date().toISOString(),
    scope,
    event,
    ...(hint ? { hint } : {}),
    ...payload,
  });
}

/** Dev PostHog journey step (server) + optional console when enhance debug is on. */
export function logJourneyStep(
  scope: EnhanceLogScope,
  event: string,
  input: EnhanceLogPayload & {
    journey: ResumeJourneyPhase | string;
    aiUsed: boolean;
    aiCallStatus: JourneyAiCallStatus;
    userId?: string | null;
    surface?: string | null;
    engineMode?: "ai" | "deterministic" | null;
    errorCode?: string | null;
    status?: "success" | "error";
    requestPreview?: string | null;
    responsePreview?: string | null;
    apiCallCount?: number | null;
    tokensUsed?: number | null;
  },
): void {
  const { requestPreview, responsePreview, userId, surface, engineMode, errorCode, status, apiCallCount, tokensUsed, journey, aiUsed, aiCallStatus, traceId, step, ...rest } = input;

  if (typeof window === "undefined") {
    captureDevJourneyStep({
      userId,
      traceId: typeof traceId === "string" ? traceId : null,
      journey,
      pipelineStep: typeof step === "string" ? step : null,
      surface,
      aiUsed,
      aiCallStatus,
      engineMode,
      errorCode,
      status,
      requestPreviewChars: requestPreview?.length ?? null,
      responsePreviewChars: responsePreview?.length ?? null,
      apiCallCount,
      tokensUsed,
    });
  }

  if (!isEnhanceJourneyDebugEnabled()) return;

  logEnhance(scope, event, {
    ...rest,
    traceId,
    step,
    journey,
    aiUsed,
    aiCallStatus,
    requestPreview: truncateForJourneyLog(requestPreview),
    responsePreview: truncateForJourneyLog(responsePreview),
  });
}

/** Where to look after a client timeout — server logs never appear in the browser. */
export function buildEnhanceTimeoutDiagnosis(traceId: string, timeoutMs: number) {
  return {
    traceId,
    timeoutMs,
    serverLogsLocation: "terminal running npm run dev (not browser console)",
    serverSearch: `[EnhanceAI] traceId:"${traceId}" scope:server OR scope:engine`,
    ifNoServerLogs:
      "No server lines with this traceId → action never reached the server (network, auth, or Next.js error)",
    ifServerStopsBeforeStep14:
      "Stuck before 14_server_engine → auth, quota, or route resolution",
    ifServerStopsAtStep21or22:
      "Stuck at 21/22 → Gemini/BYOK call still running — increase app_config.enhanceWithAi.enhanceWithAiTimeoutMs",
  };
}

export function logEnhanceErrorAlert(input: {
  traceId?: string;
  code: string;
  message: string;
  timeoutMs?: number;
}) {
  logEnhance("client", "error.alert", {
    traceId: input.traceId,
    step: "04_client_error_alert",
    code: input.code,
    message: input.message,
    ...(input.traceId && input.code === "timeout"
      ? {
          diagnosis: buildEnhanceTimeoutDiagnosis(
            input.traceId,
            input.timeoutMs ?? DEFAULT_ENHANCE_WITH_AI_TIMEOUT_MS,
          ),
        }
      : {}),
    ...(input.traceId
      ? {
          serverTerminalHint: `Search terminal for traceId "${input.traceId}" (scope server or engine)`,
        }
      : {}),
  });
}

export function summarizeFormForLog(form: HubRefineryForm) {
  const visibleExperience = (form.experience ?? []).filter((entry) => !entry.hidden);
  return {
    professionalSummaryChars: form.professionalSummary?.length ?? 0,
    skillsTextChars: form.skillsText?.length ?? 0,
    skillCount: countSkillsInText(form.skillsText ?? ""),
    experienceVisible: visibleExperience.length,
    experienceHidden: (form.experience ?? []).length - visibleExperience.length,
    educationEntries: form.education?.length ?? 0,
    certificationEntries: form.certifications?.length ?? 0,
    projectEntries: form.projects?.length ?? 0,
    languageEntries: form.languages?.length ?? 0,
    hasContactFields: Boolean(
      form.firstName ||
        form.lastName ||
        form.email ||
        form.phone ||
        form.linkedIn ||
        form.cityState,
    ),
  };
}

export function summarizeEnhanceRequest(input: {
  profileId?: string;
  targetRole: string;
  jobDescription?: string;
  rawResumeText?: string | null;
  forceSystem?: boolean;
  form: HubRefineryForm;
  traceId?: string;
  variant?: string;
}) {
  return {
    traceId: input.traceId,
    profileId: input.profileId ?? undefined,
    variant: input.variant ?? undefined,
    targetRole: input.targetRole,
    forceSystem: Boolean(input.forceSystem),
    jobDescriptionChars: input.jobDescription?.trim().length ?? 0,
    hasJobDescription: Boolean(input.jobDescription?.trim()),
    rawResumeTextChars: input.rawResumeText?.trim().length ?? 0,
    form: summarizeFormForLog(input.form),
  };
}

export function sanitizeRouteForLog(route: AiRouteResolution) {
  if ("error" in route) {
    return "byokAvailable" in route
      ? { error: route.error, byokAvailable: route.byokAvailable }
      : { error: route.error };
  }

  if (route.mode === "system") {
    return {
      mode: route.mode,
      provider: route.provider,
      modelId: route.modelId,
    };
  }

  return {
    mode: route.mode,
    provider: route.provider,
    modelId: route.modelId,
    vaultKeyId: route.vaultKeyId,
  };
}

export function summarizeQuotaForLog(row: {
  aiEnhancementsToday: number;
  aiCallsToday: number;
  aiQuotaResetAt: Date | null;
}) {
  return {
    enhancementsToday: row.aiEnhancementsToday,
    callsToday: row.aiCallsToday,
    quotaResetAt: row.aiQuotaResetAt?.toISOString() ?? null,
  };
}

export function countSkillsInText(skillsText: string): number {
  return skillsText
    .split(/[,;\n|•·\/]+/)
    .map((s) => s.trim())
    .filter(Boolean).length;
}

export function summarizeExperienceBullets(form: HubRefineryForm) {
  return (form.experience ?? [])
    .filter((entry) => !entry.hidden)
    .map((entry) => ({
      id: entry.id,
      company: entry.company,
      title: entry.title,
      bulletCount: (entry.bullets ?? "")
        .split("\n")
        .map((b) => b.trim())
        .filter(Boolean).length,
    }));
}

export function summarizeFormDelta(before: HubRefineryForm, after: HubRefineryForm) {
  return {
    summaryChanged:
      before.professionalSummary.trim() !== after.professionalSummary.trim(),
    summaryPreviewBefore: before.professionalSummary.trim().slice(0, 80),
    summaryPreviewAfter: after.professionalSummary.trim().slice(0, 80),
    skillsChanged: before.skillsText.trim() !== after.skillsText.trim(),
    skillsCountBefore: countSkillsInText(before.skillsText ?? ""),
    skillsCountAfter: countSkillsInText(after.skillsText ?? ""),
    experienceBulletsBefore: summarizeExperienceBullets(before),
    experienceBulletsAfter: summarizeExperienceBullets(after),
  };
}

export function summarizeEnhanceResult(input: {
  changedSections: StudioEditorSectionId[];
  aiMode: "customer" | "system";
  quota?: {
    enhancementsUsed: number;
    enhancementsLimit: number;
    callsUsed: number;
    callsLimit: number;
  };
  tokensUsed?: number;
  modelId?: string;
  apiCallCount?: number;
  estimatedCost?: number;
  durationMs?: number;
}) {
  return {
    aiMode: input.aiMode,
    changedSections: input.changedSections,
    changedSectionCount: input.changedSections.length,
    quota: input.quota ?? null,
    tokensUsed: input.tokensUsed ?? null,
    modelId: input.modelId ?? null,
    apiCallCount: input.apiCallCount ?? null,
    estimatedCost: input.estimatedCost ?? null,
    durationMs: input.durationMs ?? null,
  };
}
