import type { z } from "zod";
import { withVaultDecryptedSecret, VAULT_DECRYPT_USER_MESSAGE } from "@/lib/vault/decrypt-vault-secret";
import { createAiSdkLanguageModel } from "@/src/lib/ai/ai-sdk-provider";
import { withCustomerModelFallback } from "@/lib/ai/model-health/with-customer-model-fallback";
import {
  resolveRouteForByokTask,
  taskTierFromEnhancePass,
} from "@/lib/ai/model-health/resolve-byok-task-route";
import type { ByokTaskTier } from "@/lib/ai/model-health/types";
import { buildUsageLogFromGeneration } from "@/src/lib/ai/estimate-usage-cost";
import type { AiPricingMap } from "@/src/lib/services/ai-pricing-map";
import {
  buildCandidateContext,
  mergeEnhancedBodyIntoForm,
  type CandidateContext,
} from "@/src/lib/ai/engine/candidate-context";
import {
  buildEnhanceSystemPrompt,
  buildEnhanceSystemPromptV2,
  buildEnhanceUserPrompt,
  buildEnhanceUserPromptV2,
} from "@/src/lib/ai/engine/brain";
import { isResumeRulesV2Enabled } from "@/lib/resume/v2/runtime";
import { buildAtsOptimizationSpecFromBrief } from "@/lib/job-tracker/ats/build-ats-optimization-spec";
import type { AtsOptimizationSpec } from "@/lib/job-tracker/ats/build-ats-optimization-spec";
import {
  diffChangedSections,
  normalizeEnhancedBody,
  parseEnhancedResumeBody,
} from "@/src/lib/ai/engine/post-process";
import type { ResolvedAiRoute } from "@/src/lib/ai/engine/router";
import { ENHANCE_PIPELINE } from "@/src/lib/ai/engine/enhance-pipeline";
import {
  buildModelCallRequestPreview,
  logEnhance,
  RESUME_JOURNEY,
  sanitizeRouteForLog,
  summarizeFormDelta,
  truncateForJourneyLog,
} from "@/src/lib/ai/engine/enhance-logger";
import { logEnhanceDiag } from "@/src/lib/ai/engine/enhance-diagnostics";
import {
  generateStructuredWithFallback,
  JD_STRUCTURED_MAX_OUTPUT_TOKENS,
  parseJsonObjectFromModelText,
} from "@/src/lib/ai/engine/structured-extract";
import { callOpenRouterFreeStructured, callOpenRouterFreeText } from "@/src/lib/ai/engine/openrouter-free-adapter";
import { mapEnhanceProviderError } from "@/src/lib/ai/engine/map-enhance-provider-error";
import { JD_EXTRACTION_TIMEOUT_MS } from "@/lib/job-tracker/jd/resolve-jd-extraction-model";
import {
  executeWithPoolRetry,
  SystemKeyPoolError,
  type PoolCallMeta,
} from "@/src/lib/ai/engine/system-key-pool";
import { runAiCallLoop } from "@/lib/ai/call-kernel/run-ai-call-loop";
import type { AiCallTarget, AiCallLedgerEntry } from "@/lib/ai/call-kernel/types";
import { OPENROUTER_FREE_SLOT } from "@/src/lib/ai/engine/pool-constants";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import type { StudioEditorSectionId } from "@/lib/resume/studio-editor-sections";
import type { JobIntelligence } from "@/lib/job-tracker/ats/job-intelligence";
import {
  generateGeminiTextWith503Resilience,
} from "@/src/lib/ai/engine/gemini-resilience";
import { logApiCall, type ApiCallStatus } from "@/src/shared/observability";
import {
  aiRequestArtifact,
  aiResponseArtifact,
} from "@/lib/extension/pipeline-debug-sanitize";
import { pipelineDebugStep, type PipelineDebugHookContext } from "@/lib/extension/pipeline-debug-hooks";

export type RunEnhanceInput = {
  form: HubRefineryForm;
  targetRole: string;
  jobDescription?: string;
  rawResumeText?: string | null;
  route: ResolvedAiRoute;
  traceId?: string;
  userId?: string | null;
  /** Pre-computed ATS intelligence — used for tactical prompts and fallback. */
  jobIntelligence?: JobIntelligence;
  /** Pre-computed JD directive — structured instructions replacing raw intelligence block when present. */
  enhanceDirective?: import("@/lib/job-tracker/jd/jd-intelligence").ResumeEnhanceDirective;
  /** Phase 1 brief — drives ATS Optimization Spec. */
  brief?: import("@/lib/job-tracker/enhance/enhance-brief").ResumeEnhanceBrief;
  /** Job company for role-only optimization when JD is short. */
  companyName?: string | null;
  /** Whether JD meets minimum length for full keyword spec. */
  hasFullJd?: boolean;
  /** Temporary QA overlay — live AI pass updates. */
  pipelineDebug?: import("@/lib/extension/pipeline-debug-hooks").PipelineDebugHookContext;
  /** When true, use RULES v2 prompts (JSON output). */
  rulesV2Enabled?: boolean;
  /** Pre-resolved system route for BYOK → system escalation in the call kernel. */
  systemFallbackRoute?: ResolvedAiRoute | null;
};

export type RunEnhanceSuccess = {
  form: HubRefineryForm;
  changedSections: StudioEditorSectionId[];
  targetRole: string;
  tokensUsed: number;
  modelId: string;
  estimatedCost: number;
  apiCallCount: number;
  matchScore?: number;
  /** Legacy — baseline-first pipeline no longer uses engine fallback. */
  fallbackUsed?: boolean;
  fallbackSummary?: string;
  fallbackChanges?: {
    skillsAdded: string[];
    bulletsRewritten: number;
    structuralIssuesFound: number;
  };
  /** True when user has AI disabled in settings. */
  aiDisabled?: boolean;
  aiCallLedger?: AiCallLedgerEntry[];
};

export type RunEnhanceFailure = {
  ok: false;
  error: string;
  code?:
    | "provider_error"
    | "invalid_response"
    | "parse_failed"
    | "rate_limited"
    | "insufficient_quota"
    | "capacity_exhausted";
  aiCallLedger?: AiCallLedgerEntry[];
};

export type RunEnhanceResult =
  | ({
      ok: true;
    } & RunEnhanceSuccess)
  | RunEnhanceFailure;

function recordEnhanceModelCall(input: {
  route: ResolvedAiRoute;
  poolCall?: PoolCallMeta;
  executionModelId?: string;
  traceId: string;
  userId?: string | null;
  pass: "generate" | "optimize";
  durationMs: number;
  status: ApiCallStatus;
  tokensUsed?: number;
  estimatedCost?: number;
  httpStatus?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  requestPreview?: string | null;
  responsePreview?: string | null;
  operation?: "ai.enhance.generate_text" | "ai.enhance.generate_object";
  feature?: "enhance" | "jd_extract";
}): void {
  const aiMode = input.route.mode;
  const provider = input.route.provider;
  const modelId = input.executionModelId ?? input.poolCall?.modelId ?? input.route.modelId;
  const operation = input.operation ?? "ai.enhance.generate_text";
  const feature = input.feature ?? "enhance";

  logApiCall({
    traceId: input.traceId,
    userId: input.userId,
    domain: "ai",
    operation,
    provider,
    modelId,
    status: input.status,
    httpStatus: input.httpStatus,
    durationMs: input.durationMs,
    tokensUsed: input.tokensUsed,
    estimatedCost: input.estimatedCost,
    aiMode,
    keySlot: input.poolCall?.slot ?? null,
    keyLabel: input.poolCall?.label ?? null,
    keySource: input.poolCall?.keySource ?? (aiMode === "customer" ? "vault" : null),
    billingMode: input.poolCall?.billingMode ?? null,
    errorCode: input.errorCode,
    errorMessage: input.errorMessage,
    metadata: {
      pass: input.pass,
      feature,
      aiUsed: true,
      aiCallStatus: input.status === "success" ? "success" : "failure",
      requestPreview: truncateForJourneyLog(input.requestPreview),
      responsePreview: truncateForJourneyLog(input.responsePreview ?? input.errorMessage),
    },
  });
}

function isVaultDecryptUserError(err: unknown): boolean {
  return err instanceof Error && err.message === VAULT_DECRYPT_USER_MESSAGE;
}

function logVaultDecryptFailure(input: {
  route: ResolvedAiRoute & { mode: "customer" };
  traceId: string;
  userId?: string | null;
  pass: "generate" | "optimize";
  passStartedAt: number;
  requestPreview: string;
  operation?: "ai.enhance.generate_text" | "ai.enhance.generate_object";
  feature?: "enhance" | "jd_extract";
  logEvent: "model.call.error" | "model.object.error";
}): void {
  logEnhance("engine", input.logEvent, {
    traceId: input.traceId,
    pass: input.pass,
    journey: input.feature === "jd_extract" ? undefined : RESUME_JOURNEY.AI_UPGRADE,
    aiUsed: true,
    aiCallStatus: "failure",
    durationMs: Date.now() - input.passStartedAt,
    status: null,
    message: VAULT_DECRYPT_USER_MESSAGE,
    errorCode: "vault_decrypt_failed",
    responsePreview: VAULT_DECRYPT_USER_MESSAGE,
  });
  recordEnhanceModelCall({
    route: input.route,
    traceId: input.traceId,
    userId: input.userId,
    pass: input.pass,
    durationMs: Date.now() - input.passStartedAt,
    status: "error",
    errorCode: "vault_decrypt_failed",
    errorMessage: VAULT_DECRYPT_USER_MESSAGE,
    requestPreview: input.requestPreview,
    responsePreview: VAULT_DECRYPT_USER_MESSAGE,
    operation: input.operation,
    feature: input.feature,
  });
}

function logCustomerModelCallFailure(input: {
  route: ResolvedAiRoute & { mode: "customer" };
  traceId: string;
  userId?: string | null;
  pass: "generate" | "optimize";
  passStartedAt: number;
  requestPreview: string;
  err: unknown;
  operation?: "ai.enhance.generate_text" | "ai.enhance.generate_object";
  feature?: "enhance" | "jd_extract";
  logEvent: "model.call.error" | "model.object.error";
}): string {
  const status = (input.err as { status?: number })?.status;
  const message = input.err instanceof Error ? input.err.message : String(input.err);
  const mapped = mapEnhanceProviderError(input.err, { aiMode: "customer" });
  const errorCode = mapped.code;

  logEnhance("engine", input.logEvent, {
    traceId: input.traceId,
    pass: input.pass,
    journey: input.feature === "jd_extract" ? undefined : RESUME_JOURNEY.AI_UPGRADE,
    aiUsed: true,
    aiCallStatus: "failure",
    durationMs: Date.now() - input.passStartedAt,
    status: status ?? null,
    message,
    errorCode,
    responsePreview: message,
  });
  recordEnhanceModelCall({
    route: input.route,
    traceId: input.traceId,
    userId: input.userId,
    pass: input.pass,
    durationMs: Date.now() - input.passStartedAt,
    status: /timeout/i.test(message) ? "timeout" : "error",
    httpStatus: status ?? null,
    errorCode,
    errorMessage: message,
    requestPreview: input.requestPreview,
    responsePreview: message,
    operation: input.operation,
    feature: input.feature,
  });
  logEnhanceDiag({
    traceId: input.traceId,
    designStep: "13",
    track: "engine",
    pipelineStep: ENHANCE_PIPELINE.ENGINE_ERROR,
    phase: "fail",
    level: "high",
    event: "engine.model.call.error",
    scope: "engine",
    userId: input.userId,
    errorCode,
    errorMessage: message,
    flags: {
      routeMode: "customer",
      provider: input.route.provider,
      pass: input.pass,
      httpStatus: status ?? null,
    },
  });

  return errorCode;
}

const RESUME_DRAFT_TEMPERATURE = 0.1;

export type EnhanceCallOptions = {
  preferredSlot?: number;
  temperature?: number;
  byokTaskTier?: ByokTaskTier;
  /** When true, defer model.call.success + api_call_logs until parse validation. */
  deferSuccessLog?: boolean;
};

export async function callEnhanceModel(
  route: ResolvedAiRoute,
  system: string,
  prompt: string,
  traceId: string,
  pass: "generate" | "optimize",
  userId?: string | null,
  callOptions?: EnhanceCallOptions,
): Promise<{
  text: string;
  tokensUsed: number;
  modelId: string;
  estimatedCost: number;
  poolCall?: PoolCallMeta;
}> {
  const preferredSlot = callOptions?.preferredSlot;
  const temperature = callOptions?.temperature ?? RESUME_DRAFT_TEMPERATURE;
  const taskTier = taskTierFromEnhancePass(pass, callOptions?.byokTaskTier);
  const executionRoute = await resolveRouteForByokTask(route, taskTier, { userId });
  const passStartedAt = Date.now();
  const requestPreview = buildModelCallRequestPreview(system, prompt);
  logEnhance("engine", "model.call.start", {
    traceId,
    step:
      pass === "generate"
        ? ENHANCE_PIPELINE.ENGINE_PASS_GENERATE
        : ENHANCE_PIPELINE.ENGINE_PASS_OPTIMIZE,
    pass,
    journey: RESUME_JOURNEY.AI_UPGRADE,
    aiUsed: true,
    aiCallStatus: "none",
    route: sanitizeRouteForLog(executionRoute),
    preferredSlot: preferredSlot ?? null,
    byokTaskTier: executionRoute.mode === "customer" ? taskTier : null,
    systemPromptChars: system.length,
    userPromptChars: prompt.length,
    requestPreview,
  });
  logEnhanceDiag({
    traceId,
    designStep: "13",
    track: "engine",
    pipelineStep:
      pass === "generate"
        ? ENHANCE_PIPELINE.ENGINE_PASS_GENERATE
        : ENHANCE_PIPELINE.ENGINE_PASS_OPTIMIZE,
    phase: "start",
    level: "low",
    event: "engine.model.call.start",
    scope: "engine",
    userId,
    flags: {
      routeMode: route.mode,
      provider: route.mode === "customer" ? route.provider : route.provider,
      pass,
      preferredSlot: preferredSlot ?? null,
    },
    params: {
      systemPromptChars: system.length,
      userPromptChars: prompt.length,
    },
  });

  if (executionRoute.mode === "customer") {
    try {
      const fallbackRun = await withCustomerModelFallback({
        route: executionRoute,
        userId,
        execute: async (modelId, apiKey, _customEndpointUrl) =>
          generateGeminiTextWith503Resilience({
            provider: executionRoute.provider,
            apiKey,
            primaryModelId: modelId,
            system,
            prompt,
            maxOutputTokens: 8192,
            temperature,
          }),
      });

      const customerResult = {
        text: fallbackRun.result.text,
        tokensUsed: fallbackRun.result.tokensUsed,
        modelId: fallbackRun.modelId,
        estimatedCost: 0,
      };
      if (!callOptions?.deferSuccessLog) {
        logEnhance("engine", "model.call.success", {
          traceId,
          pass,
          journey: RESUME_JOURNEY.AI_UPGRADE,
          aiUsed: true,
          aiCallStatus: "success",
          durationMs: Date.now() - passStartedAt,
          tokensUsed: customerResult.tokensUsed,
          responseChars: customerResult.text.length,
          modelId: customerResult.modelId,
          usedFallbackModel: fallbackRun.attemptCount > 1 || fallbackRun.result.usedFallbackModel,
          clippedForFallback: fallbackRun.result.clippedForFallback,
          retryCount: fallbackRun.result.retryCount,
          responsePreview: customerResult.text,
        });
        recordEnhanceModelCall({
          route: executionRoute,
          traceId,
          userId,
          pass,
          durationMs: Date.now() - passStartedAt,
          status: "success",
          tokensUsed: customerResult.tokensUsed,
          estimatedCost: customerResult.estimatedCost,
          requestPreview,
          responsePreview: customerResult.text,
          executionModelId: customerResult.modelId,
        });
        logEnhanceDiag({
          traceId,
          designStep: "13",
          track: "engine",
          pipelineStep:
            pass === "generate"
              ? ENHANCE_PIPELINE.ENGINE_PASS_GENERATE
              : ENHANCE_PIPELINE.ENGINE_PASS_OPTIMIZE,
          phase: "done",
          level: "low",
          event: "engine.model.call.success",
          scope: "engine",
          userId,
          flags: { routeMode: "customer", provider: route.provider, pass },
          params: {
            tokensUsed: customerResult.tokensUsed,
            responseChars: customerResult.text.length,
            durationMs: Date.now() - passStartedAt,
            usedFallbackModel: fallbackRun.attemptCount > 1 || fallbackRun.result.usedFallbackModel,
            clippedForFallback: fallbackRun.result.clippedForFallback,
            retryCount: fallbackRun.result.retryCount,
            modelAttemptCount: fallbackRun.attemptCount,
          },
        });
      }
      return customerResult;
    } catch (err) {
      if (isVaultDecryptUserError(err)) {
        logVaultDecryptFailure({
          route: executionRoute,
          traceId,
          userId,
          pass,
          passStartedAt,
          requestPreview,
          logEvent: "model.call.error",
        });
        throw err;
      }
      logCustomerModelCallFailure({
        route: executionRoute,
        traceId,
        userId,
        pass,
        passStartedAt,
        requestPreview,
        err,
        logEvent: "model.call.error",
      });
      throw err;
    }
  }

  try {
    const executionModelId = route.modelId;
    const poolResult = await executeWithPoolRetry(
      async ({ apiKey, provider, billingMode }) => {
        if (provider === "openrouter" && billingMode === "free") {
          const free = await callOpenRouterFreeText({
            apiKey,
            system,
            prompt,
            maxOutputTokens: 8192,
            temperature,
            traceId,
          });
          return {
            text: free.text,
            tokensUsed: free.tokensUsed,
            modelId: free.modelId,
            usedFallbackModel: false,
            clippedForFallback: false,
            retryCount: 0,
          };
        }
        return generateGeminiTextWith503Resilience({
          provider,
          apiKey,
          primaryModelId: executionModelId,
          system,
          prompt,
          maxOutputTokens: 8192,
          temperature,
        });
      },
      { preferredSlot },
    );

    const systemResult = {
      text: poolResult.result.text,
      tokensUsed: poolResult.result.tokensUsed,
      modelId: poolResult.result.modelId,
      estimatedCost: 0,
      poolCall: {
        slot: poolResult.slot,
        label: poolResult.label,
        provider: poolResult.provider,
        billingMode: poolResult.billingMode,
        modelId: poolResult.result.modelId,
        keySource: poolResult.keySource,
      },
    };

    if (!callOptions?.deferSuccessLog) {
      logEnhance("engine", "model.call.success", {
        traceId,
        pass,
        journey: RESUME_JOURNEY.AI_UPGRADE,
        aiUsed: true,
        aiCallStatus: "success",
        durationMs: Date.now() - passStartedAt,
        tokensUsed: systemResult.tokensUsed,
        responseChars: systemResult.text.length,
        modelId: systemResult.modelId,
        usedFallbackModel: poolResult.result.usedFallbackModel,
        clippedForFallback: poolResult.result.clippedForFallback,
        retryCount: poolResult.result.retryCount,
        keySlot: poolResult.slot,
        keyLabel: poolResult.label,
        billingMode: poolResult.billingMode,
        responsePreview: systemResult.text,
      });
      recordEnhanceModelCall({
        route,
        poolCall: systemResult.poolCall,
        traceId,
        userId,
        pass,
        durationMs: Date.now() - passStartedAt,
        status: "success",
        tokensUsed: systemResult.tokensUsed,
        estimatedCost: systemResult.estimatedCost,
        requestPreview,
        responsePreview: systemResult.text,
      });
      logEnhanceDiag({
        traceId,
        designStep: "13",
        track: "engine",
        pipelineStep:
          pass === "generate"
            ? ENHANCE_PIPELINE.ENGINE_PASS_GENERATE
            : ENHANCE_PIPELINE.ENGINE_PASS_OPTIMIZE,
        phase: "done",
        level: "low",
        event: "engine.model.call.success",
        scope: "engine",
        userId,
        flags: {
          routeMode: "system",
          pass,
          keySlot: poolResult.slot,
          keyLabel: poolResult.label,
        },
        params: {
          tokensUsed: systemResult.tokensUsed,
          responseChars: systemResult.text.length,
          durationMs: Date.now() - passStartedAt,
          usedFallbackModel: poolResult.result.usedFallbackModel,
          clippedForFallback: poolResult.result.clippedForFallback,
          retryCount: poolResult.result.retryCount,
        },
      });
    }
    return systemResult;
  } catch (err) {
    const status = (err as { status?: number })?.status;
    const message = err instanceof Error ? err.message : String(err);
    let errorCode: string | null = "provider_error";

    if (err instanceof SystemKeyPoolError) {
      errorCode = err.code;
    } else {
      const mapped = mapEnhanceProviderError(err, { aiMode: "system" });
      errorCode = mapped.code;
    }

    logEnhance("engine", "model.call.error", {
      traceId,
      pass,
      journey: RESUME_JOURNEY.AI_UPGRADE,
      aiUsed: true,
      aiCallStatus: "failure",
      durationMs: Date.now() - passStartedAt,
      status: status ?? null,
      message,
      errorCode,
      responsePreview: message,
    });
    recordEnhanceModelCall({
      route,
      traceId,
      userId,
      pass,
      durationMs: Date.now() - passStartedAt,
      status: /timeout/i.test(message) ? "timeout" : "error",
      httpStatus: status ?? null,
      errorCode,
      errorMessage: message,
      requestPreview,
      responsePreview: message,
    });
    logEnhanceDiag({
      traceId,
      designStep: "13",
      track: "engine",
      pipelineStep: ENHANCE_PIPELINE.ENGINE_ERROR,
      phase: "fail",
      level: "high",
      event: "engine.model.call.error",
      scope: "engine",
      userId,
      errorCode,
      errorMessage: message,
      flags: {
        routeMode: route.mode,
        provider: "system",
        pass,
        httpStatus: status ?? null,
      },
    });
    throw err;
  }
}

function jdExtractPipelineArtifacts(input: {
  system: string;
  prompt: string;
  modelId: string;
  responseText: string;
  tokensUsed?: number;
}) {
  return [
    aiRequestArtifact("JD extract request", {
      pass: "generate",
      modelId: input.modelId,
      system: input.system,
      user: input.prompt,
    }),
    aiResponseArtifact("JD extract response", {
      text: input.responseText,
      modelId: input.modelId,
      tokensUsed: input.tokensUsed,
    }),
  ];
}

export async function callEnhanceObjectModel<T extends z.ZodTypeAny>(
  route: ResolvedAiRoute,
  system: string,
  prompt: string,
  schema: T,
  traceId: string,
  pass: "generate" | "optimize",
  userId?: string | null,
  preferredSlot?: number,
  pipelineDebug?: PipelineDebugHookContext | null,
): Promise<{
  object: z.infer<T>;
  tokensUsed: number;
  modelId: string;
  estimatedCost: number;
  poolCall?: PoolCallMeta;
}> {
  const executionRoute = await resolveRouteForByokTask(route, "cheap", { userId });
  const passStartedAt = Date.now();
  const requestPreview = buildModelCallRequestPreview(system, prompt);
  logEnhance("engine", "model.object.start", {
    traceId,
    step: ENHANCE_PIPELINE.PRE_JD_BRAIN,
    pass,
    route: sanitizeRouteForLog(executionRoute),
    preferredSlot: preferredSlot ?? null,
    systemPromptChars: system.length,
    userPromptChars: prompt.length,
    requestPreview,
  });

  pipelineDebugStep(pipelineDebug, "ai_jd_extract", {
    status: "active",
    detail: "generateObject JD enrichment",
    meta: {
      routeMode: executionRoute.mode,
      modelId: executionRoute.modelId,
      provider: executionRoute.mode === "customer" ? executionRoute.provider : executionRoute.provider,
      candidateCount:
        executionRoute.mode === "customer" ? executionRoute.modelCandidates.length || 1 : 1,
    },
  });

  if (executionRoute.mode === "customer") {
    try {
      const fallbackRun = await withCustomerModelFallback({
        route: executionRoute,
        userId,
        execute: async (modelId, apiKey, customEndpointUrl) => {
          const model = createAiSdkLanguageModel(
            executionRoute.provider,
            apiKey,
            modelId,
            { customEndpointUrl },
          );
          return generateStructuredWithFallback({
            model,
            provider: executionRoute.provider,
            system,
            prompt,
            schema,
            maxOutputTokens: JD_STRUCTURED_MAX_OUTPUT_TOKENS,
            timeoutMs: JD_EXTRACTION_TIMEOUT_MS,
          });
        },
      });

      const customerResult = {
        object: fallbackRun.result.object as z.infer<T>,
        tokensUsed: fallbackRun.result.tokensUsed,
        modelId: fallbackRun.modelId,
        estimatedCost: 0,
        extractMode: fallbackRun.result.mode,
      };
      const responsePreview = truncateForJourneyLog(JSON.stringify(customerResult.object));

      logEnhance("engine", "model.object.success", {
        traceId,
        pass,
        durationMs: Date.now() - passStartedAt,
        tokensUsed: customerResult.tokensUsed,
        modelId: customerResult.modelId,
        extractMode: customerResult.extractMode,
      });
      if (customerResult.extractMode === "text_fallback") {
        logEnhanceDiag({
          traceId,
          designStep: "8",
          track: "jd",
          pipelineStep: ENHANCE_PIPELINE.PRE_JD_BRAIN,
          phase: "done",
          level: "low",
          event: "engine.jd_extract.text_fallback",
          scope: "engine",
          userId,
          flags: { routeMode: "customer", provider: route.provider },
        });
      }
      recordEnhanceModelCall({
        route: executionRoute,
        traceId,
        userId,
        pass,
        durationMs: Date.now() - passStartedAt,
        status: "success",
        tokensUsed: customerResult.tokensUsed,
        estimatedCost: customerResult.estimatedCost,
        requestPreview,
        responsePreview,
        operation: "ai.enhance.generate_object",
        feature: "jd_extract",
        executionModelId: customerResult.modelId,
      });

      pipelineDebugStep(pipelineDebug, "ai_jd_extract", {
        status: "done",
        detail: `JD extract complete — ${customerResult.modelId}`,
        meta: {
          tokensUsed: customerResult.tokensUsed,
          extractMode: customerResult.extractMode,
          attemptCount: fallbackRun.attemptCount,
        },
        artifacts: jdExtractPipelineArtifacts({
          system,
          prompt,
          modelId: customerResult.modelId,
          responseText: responsePreview ?? "",
          tokensUsed: customerResult.tokensUsed,
        }),
      });

      return customerResult;
    } catch (err) {
      if (isVaultDecryptUserError(err)) {
        logVaultDecryptFailure({
          route: executionRoute,
          traceId,
          userId,
          pass,
          passStartedAt,
          requestPreview,
          operation: "ai.enhance.generate_object",
          feature: "jd_extract",
          logEvent: "model.object.error",
        });
        throw err;
      }
      const failureMessage = logCustomerModelCallFailure({
        route: executionRoute,
        traceId,
        userId,
        pass,
        passStartedAt,
        requestPreview,
        err,
        operation: "ai.enhance.generate_object",
        feature: "jd_extract",
        logEvent: "model.object.error",
      });
      // warning, not error — JD extract failure is non-fatal (deterministic JD fallback)
      pipelineDebugStep(pipelineDebug, "ai_jd_extract", {
        status: "warning",
        detail: `JD AI failed — deterministic fallback. ${failureMessage.slice(0, 200)}`,
        meta: {
          modelId: executionRoute.modelId,
          provider: executionRoute.mode === "customer" ? executionRoute.provider : "system",
        },
        artifacts: jdExtractPipelineArtifacts({
          system,
          prompt,
          modelId: executionRoute.modelId,
          responseText: failureMessage,
        }),
      });
      throw err;
    }
  }

  const executionModelId = route.modelId;

  try {
    const poolResult = await executeWithPoolRetry(
      async ({ apiKey, provider, billingMode, modelId }) => {
        if (provider === "openrouter" && billingMode === "free") {
          const free = await callOpenRouterFreeStructured({
            apiKey,
            system,
            prompt,
            maxOutputTokens: JD_STRUCTURED_MAX_OUTPUT_TOKENS,
            timeoutMs: JD_EXTRACTION_TIMEOUT_MS,
            traceId,
            parse: (text) => schema.parse(parseJsonObjectFromModelText(text)),
          });
          return {
            object: free.object as z.infer<T>,
            tokensUsed: free.tokensUsed,
            modelId: free.modelId,
            mode: "object" as const,
          };
        }
        const model = createAiSdkLanguageModel(provider, apiKey, modelId);
        return generateStructuredWithFallback({
          model,
          provider,
          system,
          prompt,
          schema,
          maxOutputTokens: JD_STRUCTURED_MAX_OUTPUT_TOKENS,
          timeoutMs: JD_EXTRACTION_TIMEOUT_MS,
        });
      },
      { preferredSlot },
    );

    const systemResult = {
      object: poolResult.result.object as z.infer<T>,
      tokensUsed: poolResult.result.tokensUsed,
      modelId: poolResult.modelId,
      estimatedCost: 0,
      poolCall: {
        slot: poolResult.slot,
        label: poolResult.label,
        provider: poolResult.provider,
        billingMode: poolResult.billingMode,
        modelId: executionModelId,
        keySource: poolResult.keySource,
      },
    };
    const responsePreview = truncateForJourneyLog(JSON.stringify(systemResult.object));

    logEnhance("engine", "model.object.success", {
      traceId,
      pass,
      durationMs: Date.now() - passStartedAt,
      tokensUsed: systemResult.tokensUsed,
      modelId: systemResult.modelId,
      keySlot: poolResult.slot,
      extractMode: poolResult.result.mode,
    });
    if (poolResult.result.mode === "text_fallback") {
      logEnhanceDiag({
        traceId,
        designStep: "8",
        track: "jd",
        pipelineStep: ENHANCE_PIPELINE.PRE_JD_BRAIN,
        phase: "done",
        level: "low",
        event: "engine.jd_extract.text_fallback",
        scope: "engine",
        userId,
        flags: { routeMode: "system", keySlot: poolResult.slot },
      });
    }
    recordEnhanceModelCall({
      route,
      poolCall: systemResult.poolCall,
      traceId,
      userId,
      pass,
      durationMs: Date.now() - passStartedAt,
      status: "success",
      tokensUsed: systemResult.tokensUsed,
      estimatedCost: systemResult.estimatedCost,
      requestPreview,
      responsePreview,
      operation: "ai.enhance.generate_object",
      feature: "jd_extract",
    });

    pipelineDebugStep(pipelineDebug, "ai_jd_extract", {
      status: "done",
      detail: `JD extract complete — ${systemResult.modelId}`,
      meta: {
        tokensUsed: systemResult.tokensUsed,
        keySlot: poolResult.slot,
        extractMode: poolResult.result.mode,
      },
      artifacts: jdExtractPipelineArtifacts({
        system,
        prompt,
        modelId: systemResult.modelId,
        responseText: responsePreview ?? "",
        tokensUsed: systemResult.tokensUsed,
      }),
    });

    return systemResult;
  } catch (err) {
    const status = (err as { status?: number })?.status;
    const message = err instanceof Error ? err.message : String(err);
    let errorCode: string | null = "provider_error";

    if (err instanceof SystemKeyPoolError) {
      errorCode = err.code;
    } else {
      const mapped = mapEnhanceProviderError(err, { aiMode: "system" });
      errorCode = mapped.code;
    }

    const poolError = err instanceof SystemKeyPoolError ? err : null;
    const lastAttempt = poolError?.slotAttempts[poolError.slotAttempts.length - 1];
    const failurePoolCall = lastAttempt
      ? {
          slot: lastAttempt.slot,
          label: lastAttempt.label,
          provider: lastAttempt.provider,
          billingMode: lastAttempt.provider === "openrouter" ? "free" : "paid",
          modelId: executionModelId,
          keySource: "vault" as const,
        }
      : undefined;

    logEnhance("engine", "model.object.error", {
      traceId,
      pass,
      durationMs: Date.now() - passStartedAt,
      status: status ?? null,
      message,
      errorCode,
      slotAttempts: poolError?.slotAttempts.length ?? 0,
    });
    recordEnhanceModelCall({
      route,
      poolCall: failurePoolCall,
      traceId,
      userId,
      pass,
      durationMs: Date.now() - passStartedAt,
      status: /timeout/i.test(message) ? "timeout" : "error",
      httpStatus: status ?? null,
      errorCode,
      errorMessage: message,
      requestPreview,
      responsePreview: message,
      operation: "ai.enhance.generate_object",
      feature: "jd_extract",
    });
    // warning, not error — JD extract failure is non-fatal (deterministic JD fallback)
    pipelineDebugStep(pipelineDebug, "ai_jd_extract", {
      status: "warning",
      detail: `JD AI failed — deterministic fallback. ${message.slice(0, 200)}`,
      meta: { modelId: executionModelId, errorCode },
      artifacts: jdExtractPipelineArtifacts({
        system,
        prompt,
        modelId: executionModelId,
        responseText: message,
      }),
    });
    throw err;
  }
}

async function runPass(
  route: ResolvedAiRoute,
  ctx: CandidateContext,
  spec: AtsOptimizationSpec,
  traceId: string,
  userId: string | null | undefined,
  pricingMap?: AiPricingMap | null,
  preferredSlot?: number,
  rulesV2Enabled = false,
  deferSuccessLog = false,
): Promise<{
  text: string;
  tokensUsed: number;
  modelId: string;
  estimatedCost: number;
  slot?: number;
  promptSystem: string;
  promptUser: string;
}> {
  logEnhance("engine", "pass.start", {
    traceId,
    step: ENHANCE_PIPELINE.ENGINE_PASS_GENERATE,
    pass: "max_ats",
    targetRole: ctx.targetRole,
    yearsExperienceEstimate: ctx.yearsExperienceEstimate,
    senioritySignal: ctx.senioritySignal,
    pageBudget: ctx.pageBudget,
    hasJobDescription: Boolean(ctx.jobDescription),
    jobDescriptionChars: ctx.jobDescription?.length ?? 0,
    rawResumeSnippetChars: ctx.rawResumeSource?.length ?? 0,
    preferredSlot: preferredSlot ?? null,
    optimizationMode: spec.mode,
    readinessScore: spec.readiness.total,
  });

  const useRulesV2 =
    rulesV2Enabled ||
    isResumeRulesV2Enabled(ctx.resumeBody.pageLengthPreference, { featureEnabled: false });
  const system = useRulesV2 ? buildEnhanceSystemPromptV2(ctx) : buildEnhanceSystemPrompt(ctx);
  const prompt = useRulesV2 ? buildEnhanceUserPromptV2(ctx, spec) : buildEnhanceUserPrompt(ctx, spec);
  const result = await callEnhanceModel(
    route,
    system,
    prompt,
    traceId,
    "generate",
    userId,
    { preferredSlot, deferSuccessLog },
  );
  const usagePayload = buildUsageLogFromGeneration(
    result.modelId,
    { totalTokens: result.tokensUsed },
    pricingMap ?? undefined,
  );
  return {
    text: result.text,
    tokensUsed: usagePayload.tokensUsed,
    modelId: result.modelId,
    estimatedCost: usagePayload.estimatedCost,
    slot: result.poolCall?.slot,
    promptSystem: system,
    promptUser: prompt,
  };
}

export async function runResumeEnhance(
  input: RunEnhanceInput,
  pricingMap?: AiPricingMap | null,
): Promise<RunEnhanceResult> {
  const traceId = input.traceId ?? "no-trace";
  const startedAt = Date.now();
  const originalTarget = input.targetRole.trim();

  logEnhance("engine", "run.start", {
    traceId,
    step: ENHANCE_PIPELINE.ENGINE_RUN_START,
    targetRole: originalTarget,
    route: sanitizeRouteForLog(input.route),
    twoPass: false,
  });
  logEnhanceDiag({
    traceId,
    designStep: "13",
    track: "engine",
    pipelineStep: ENHANCE_PIPELINE.ENGINE_RUN_START,
    phase: "start",
    level: "high",
    event: "engine.run.start",
    scope: "engine",
    userId: input.userId,
    flags: {
      routeMode: input.route.mode,
      provider: input.route.mode === "customer" ? input.route.provider : "system",
      twoPass: false,
    },
    params: { targetRole: originalTarget },
  });

  if (!input.brief) {
    return {
      ok: false,
      error: "Enhance brief required for max-ATS optimization.",
      code: "provider_error",
    };
  }

  const hasFullJd = input.hasFullJd ?? (input.jobDescription?.trim().length ?? 0) >= 120;
  const spec = buildAtsOptimizationSpecFromBrief(input.brief, {
    hasFullJd,
    companyName: input.companyName,
    jobDescription: input.jobDescription,
  });

  const promptForm =
    input.brief.lightPath && input.brief.promptExperience
      ? {
          ...input.form,
          experience: input.brief.promptExperience,
          // Old summary is not needed — AI writes a new one from years + identity + JD.
          professionalSummary: "",
        }
      : input.form;

  const ctx = buildCandidateContext({
    form: promptForm,
    targetRole: input.targetRole,
    jobDescription: input.jobDescription,
    rawResumeText: input.rawResumeText,
  });

  let totalTokens = 0;
  let totalCost = 0;
  let lastModelId = input.route.modelId;
    let apiCallCount = 0;
    const debug = input.pipelineDebug ?? null;

    const systemRoute =
      input.systemFallbackRoute ??
      (input.route.mode === "system" ? input.route : null);

    const initialTarget: AiCallTarget =
      input.route.mode === "customer"
        ? { executor: "customer", routeMode: "customer", attemptOnTarget: 1 }
        : {
            executor: "system_pool",
            routeMode: "system",
            slot: OPENROUTER_FREE_SLOT,
            attemptOnTarget: 1,
          };

    let lastPass: Awaited<ReturnType<typeof runPass>> | null = null;

    try {
      pipelineDebugStep(debug, "ai_pass1", {
        status: "active",
        detail: "Calling max-ATS resume generation",
        meta: {
          routeMode: input.route.mode,
          modelId: input.route.modelId,
          provider: input.route.mode === "customer" ? input.route.provider : "system",
          optimizationMode: spec.mode,
        },
      });

      const loopResult = await runAiCallLoop({
        traceId,
        userId: input.userId,
        initialTarget,
        systemAvailable: Boolean(systemRoute),
        execute: async (target) => {
          const route =
            target.routeMode === "customer" ? input.route : systemRoute ?? input.route;
          const pass = await runPass(
            route,
            ctx,
            spec,
            traceId,
            input.userId,
            pricingMap,
            target.slot,
            input.rulesV2Enabled ?? false,
            true,
          );
          lastPass = pass;
          apiCallCount += 1;
          return {
            text: pass.text,
            tokensUsed: pass.tokensUsed,
            modelId: pass.modelId,
            estimatedCost: pass.estimatedCost,
            slot: pass.slot,
            durationMs: 0,
          };
        },
        onValidatedSuccess: ({ target, result, entry }) => {
          if (!lastPass) return;
          const route =
            target.routeMode === "customer" ? input.route : systemRoute ?? input.route;
          const requestPreview = buildModelCallRequestPreview(
            lastPass.promptSystem,
            lastPass.promptUser,
          );
          logEnhance("engine", "model.call.success", {
            traceId,
            pass: "generate",
            journey: RESUME_JOURNEY.AI_UPGRADE,
            aiUsed: true,
            aiCallStatus: "success",
            durationMs: entry.durationMs,
            tokensUsed: result.tokensUsed,
            responseChars: result.text.length,
            modelId: result.modelId,
            responsePreview: result.text,
          });
          recordEnhanceModelCall({
            route,
            traceId,
            userId: input.userId,
            pass: "generate",
            durationMs: entry.durationMs,
            status: "success",
            tokensUsed: result.tokensUsed,
            estimatedCost: result.estimatedCost,
            requestPreview,
            responsePreview: result.text,
            executionModelId: result.modelId,
          });
        },
      });

      totalTokens = loopResult.tokensUsed;
      totalCost = loopResult.estimatedCost;
      lastModelId = loopResult.modelId;
      apiCallCount = loopResult.ledger.length;

      if (loopResult.missionFailed) {
        const failureCode = (loopResult.failureCode ?? "provider_error") as RunEnhanceFailure["code"];
        logEnhance("engine", "run.parse_failed", {
          traceId,
          step: ENHANCE_PIPELINE.ENGINE_MERGE,
          pass: "max_ats",
          failureCode,
          ledgerEntries: loopResult.ledger.length,
        });
        logEnhanceDiag({
          traceId,
          designStep: "13",
          track: "engine",
          pipelineStep: ENHANCE_PIPELINE.ENGINE_MERGE,
          phase: "fail",
          level: "high",
          event: "engine.kernel.mission_failed",
          scope: "engine",
          userId: input.userId,
          errorCode: failureCode,
          flags: { pass: "max_ats" },
          params: { ledgerEntries: loopResult.ledger.length },
        });
        return {
          ok: false,
          error: loopResult.failureMessage ?? "AI enhancement failed.",
          code: failureCode,
          aiCallLedger: loopResult.ledger,
        };
      }

      const passBody = parseEnhancedResumeBody(loopResult.text);
      if (!passBody) {
        return {
          ok: false,
          error: "AI returned an invalid resume format. Try again.",
          code: "invalid_response",
          aiCallLedger: loopResult.ledger,
        };
      }

      const pass = lastPass!;
      logEnhance("engine", "run.parse_ok", {
        traceId,
        step: ENHANCE_PIPELINE.ENGINE_MERGE,
        pass: "max_ats",
        ledgerEntries: loopResult.ledger.length,
      });

      const finalBody = normalizeEnhancedBody(passBody, input.form, traceId, input.userId ?? "unknown");

      pipelineDebugStep(debug, "ai_pass1", {
        status: "done",
        detail: `Max-ATS pass complete — ${pass.modelId}`,
        meta: { tokensUsed: pass.tokensUsed, apiCallCount },
        artifacts: [
          aiRequestArtifact("Max-ATS request", {
            pass: "max_ats",
            modelId: pass.modelId,
            system: pass.promptSystem,
            user: pass.promptUser,
          }),
          aiResponseArtifact("Max-ATS response", {
            text: loopResult.text,
            modelId: pass.modelId,
            tokensUsed: pass.tokensUsed,
          }),
        ],
      });
      pipelineDebugStep(debug, "ai_pass2", {
        status: "skipped",
        detail: "Single-pass max-ATS mode",
      });

      const merged = mergeEnhancedBodyIntoForm(input.form, finalBody);
      const changedSections = diffChangedSections(input.form, merged, false);

      logEnhance("engine", "run.success", {
        traceId,
        step: ENHANCE_PIPELINE.ENGINE_MERGE,
        durationMs: Date.now() - startedAt,
        changedSections,
        changedSectionCount: changedSections.length,
        totalTokens,
        totalCost,
        apiCallCount,
        modelId: lastModelId,
        delta: summarizeFormDelta(input.form, merged),
      });
      logEnhanceDiag({
        traceId,
        designStep: "13",
        track: "engine",
        pipelineStep: ENHANCE_PIPELINE.ENGINE_MERGE,
        phase: "done",
        level: "high",
        event: "engine.run.success",
        scope: "engine",
        userId: input.userId,
        flags: {},
        params: {
          changedSectionCount: changedSections.length,
          totalTokens,
          apiCallCount,
          durationMs: Date.now() - startedAt,
          modelId: lastModelId,
        },
      });

      return {
        ok: true,
        form: merged,
        changedSections,
        targetRole: originalTarget || input.targetRole,
        tokensUsed: totalTokens,
        modelId: lastModelId,
        estimatedCost: totalCost,
        apiCallCount,
        aiCallLedger: loopResult.ledger,
      };
  } catch (err) {
    const aiMode = input.route.mode;
    let errorCode: string = "provider_error";
    let errorMessage = "AI enhancement failed.";

    if (err instanceof SystemKeyPoolError && err.code === "capacity_exhausted") {
      errorCode = err.code;
      errorMessage = err.message;
    } else {
      const mapped = mapEnhanceProviderError(err, { aiMode });
      errorCode = mapped.code;
      errorMessage = mapped.userMessage;
    }

    logEnhance("engine", "run.error", {
      traceId,
      step: ENHANCE_PIPELINE.ENGINE_ERROR,
      durationMs: Date.now() - startedAt,
      code: errorCode,
      aiMode,
      rawMessage: err instanceof Error ? err.message : String(err),
    });

    logEnhanceDiag({
      traceId,
      designStep: "13",
      track: "engine",
      pipelineStep: ENHANCE_PIPELINE.ENGINE_ERROR,
      phase: "fail",
      level: "high",
      event: "engine.run.error",
      scope: "engine",
      userId: input.userId,
      errorCode,
      errorMessage: err instanceof Error ? err.message : String(err),
      flags: {
        routeMode: input.route.mode,
        provider: input.route.mode === "customer" ? input.route.provider : "system",
        aiMode,
      },
    });

    return {
      ok: false,
      error: errorMessage,
      code: errorCode as RunEnhanceFailure["code"],
    };
  }
}
