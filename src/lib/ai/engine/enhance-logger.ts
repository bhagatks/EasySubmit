import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import type { ResolvedAiRoute } from "@/src/lib/ai/engine/router";
import type { StudioEditorSectionId } from "@/lib/resume/studio-editor-sections";
import {
  pipelineStepHint,
  type EnhancePipelineStep,
} from "@/src/lib/ai/engine/enhance-pipeline";
import { DEFAULT_ENHANCE_WITH_AI_TIMEOUT_MS } from "@/src/lib/services/enhance-with-ai-config";

export const ENHANCE_AI_LOG_PREFIX = "[EnhanceAI]";

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

export function logEnhance(
  scope: EnhanceLogScope,
  event: string,
  payload: EnhanceLogPayload = {},
): void {
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

export function sanitizeRouteForLog(
  route: ResolvedAiRoute | { error: "no_customer_key" | "no_system_key" },
) {
  if ("error" in route) {
    return { error: route.error };
  }

  if (route.mode === "system") {
    return {
      mode: route.mode,
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
