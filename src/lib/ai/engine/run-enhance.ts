import type { z } from "zod";
import { withVaultDecryptedSecret } from "@/lib/vault/decrypt-vault-secret";
import { createAiSdkLanguageModel } from "@/src/lib/ai/ai-sdk-provider";
import { buildUsageLogFromGeneration } from "@/src/lib/ai/estimate-usage-cost";
import type { AiPricingMap } from "@/src/lib/services/ai-pricing-map";
import {
  buildCandidateContext,
  mergeEnhancedBodyIntoForm,
  type CandidateContext,
} from "@/src/lib/ai/engine/candidate-context";
import {
  buildEnhanceSystemPrompt,
  buildEnhanceUserPrompt,
} from "@/src/lib/ai/engine/brain";
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
} from "@/src/lib/ai/engine/structured-extract";
import { mapEnhanceProviderError } from "@/src/lib/ai/engine/map-enhance-provider-error";
import {
  executeWithPoolRetry,
  SystemKeyPoolError,
  type PoolCallMeta,
} from "@/src/lib/ai/engine/system-key-pool";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import type { StudioEditorSectionId } from "@/lib/resume/studio-editor-sections";
import type { JobIntelligence } from "@/lib/job-tracker/ats/job-intelligence";
import {
  generateGeminiTextWith503Resilience,
} from "@/src/lib/ai/engine/gemini-resilience";
import { logApiCall, type ApiCallStatus } from "@/src/shared/observability";
import {
  pipelineDebugAdvance,
  pipelineDebugStep,
} from "@/lib/extension/pipeline-debug-hooks";

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
  /** Phase 1 brief — baseline already applied; AI refines only. */
  brief?: import("@/lib/job-tracker/enhance/enhance-brief").ResumeEnhanceBrief;
  /** Temporary QA overlay — live AI pass updates. */
  pipelineDebug?: import("@/lib/extension/pipeline-debug-hooks").PipelineDebugHookContext;
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
  partialEnhance?: boolean;
  partialEnhanceMessage?: string;
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
};

export type RunEnhanceFailure = {
  ok: false;
  error: string;
  code?:
    | "provider_error"
    | "invalid_response"
    | "rate_limited"
    | "insufficient_quota"
    | "capacity_exhausted";
};

export type RunEnhanceResult =
  | ({
      ok: true;
    } & RunEnhanceSuccess)
  | RunEnhanceFailure;

function recordEnhanceModelCall(input: {
  route: ResolvedAiRoute;
  poolCall?: PoolCallMeta;
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
  const provider =
    input.route.mode === "customer" ? input.route.provider : "gemini";
  const modelId = input.poolCall?.modelId ?? input.route.modelId;
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

const VAULT_DECRYPT_USER_MESSAGE = "Could not decrypt your API key. Update it in AI Keys.";

function isVaultDecryptUserError(err: unknown): boolean {
  return err instanceof Error && err.message === VAULT_DECRYPT_USER_MESSAGE;
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

export async function callEnhanceModel(
  route: ResolvedAiRoute,
  system: string,
  prompt: string,
  traceId: string,
  pass: "generate" | "optimize",
  userId?: string | null,
  preferredSlot?: number,
  temperature: number = RESUME_DRAFT_TEMPERATURE,
): Promise<{
  text: string;
  tokensUsed: number;
  modelId: string;
  estimatedCost: number;
  poolCall?: PoolCallMeta;
}> {
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
    route: sanitizeRouteForLog(route),
    preferredSlot: preferredSlot ?? null,
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
      provider: route.mode === "customer" ? route.provider : "gemini",
      pass,
      preferredSlot: preferredSlot ?? null,
    },
    params: {
      systemPromptChars: system.length,
      userPromptChars: prompt.length,
    },
  });

  if (route.mode === "customer") {
    try {
      const vaultRun = await withVaultDecryptedSecret(route.vaultKeyId, async (apiKey) => {
        return generateGeminiTextWith503Resilience({
          provider: route.provider,
          apiKey,
          primaryModelId: route.modelId,
          system,
          prompt,
          maxOutputTokens: 8192,
          temperature,
        });
      });

      if (!vaultRun.ok) {
        logEnhance("engine", "model.call.error", {
          traceId,
          pass,
          reason: "vault_decrypt_failed",
          durationMs: Date.now() - passStartedAt,
        });
        logEnhanceDiag({
          traceId,
          designStep: "13",
          track: "engine",
          pipelineStep: ENHANCE_PIPELINE.ENGINE_ERROR,
          phase: "fail",
          level: "high",
          event: "engine.vault_decrypt_failed",
          scope: "engine",
          userId,
          errorCode: "vault_decrypt_failed",
          errorMessage: "Could not decrypt BYOK API key",
          flags: {
            routeMode: route.mode,
            provider: route.provider,
            pass,
          },
        });
        recordEnhanceModelCall({
          route,
          traceId,
          userId,
          pass,
          durationMs: Date.now() - passStartedAt,
          status: "error",
          errorCode: "vault_decrypt_failed",
          errorMessage: "Could not decrypt BYOK API key",
          requestPreview,
          responsePreview: "Could not decrypt BYOK API key",
        });
        throw new Error(VAULT_DECRYPT_USER_MESSAGE);
      }

      const customerResult = {
        text: vaultRun.result.text,
        tokensUsed: vaultRun.result.tokensUsed,
        modelId: vaultRun.result.modelId,
        estimatedCost: 0,
      };
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
        usedFallbackModel: vaultRun.result.usedFallbackModel,
        clippedForFallback: vaultRun.result.clippedForFallback,
        retryCount: vaultRun.result.retryCount,
        responsePreview: customerResult.text,
      });
      recordEnhanceModelCall({
        route,
        traceId,
        userId,
        pass,
        durationMs: Date.now() - passStartedAt,
        status: "success",
        tokensUsed: customerResult.tokensUsed,
        estimatedCost: customerResult.estimatedCost,
        requestPreview,
        responsePreview: customerResult.text,
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
          usedFallbackModel: vaultRun.result.usedFallbackModel,
          clippedForFallback: vaultRun.result.clippedForFallback,
          retryCount: vaultRun.result.retryCount,
        },
      });
      return customerResult;
    } catch (err) {
      if (isVaultDecryptUserError(err)) {
        throw err;
      }
      logCustomerModelCallFailure({
        route,
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
      async ({ apiKey }) => {
        return generateGeminiTextWith503Resilience({
          provider: "gemini",
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
        billingMode: poolResult.billingMode,
        modelId: poolResult.result.modelId,
        keySource: poolResult.keySource,
      },
    };

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

export async function callEnhanceObjectModel<T extends z.ZodTypeAny>(
  route: ResolvedAiRoute,
  system: string,
  prompt: string,
  schema: T,
  traceId: string,
  pass: "generate" | "optimize",
  userId?: string | null,
  preferredSlot?: number,
): Promise<{
  object: z.infer<T>;
  tokensUsed: number;
  modelId: string;
  estimatedCost: number;
  poolCall?: PoolCallMeta;
}> {
  const passStartedAt = Date.now();
  const requestPreview = buildModelCallRequestPreview(system, prompt);
  logEnhance("engine", "model.object.start", {
    traceId,
    step: ENHANCE_PIPELINE.PRE_JD_BRAIN,
    pass,
    route: sanitizeRouteForLog(route),
    preferredSlot: preferredSlot ?? null,
    systemPromptChars: system.length,
    userPromptChars: prompt.length,
    requestPreview,
  });

  if (route.mode === "customer") {
    try {
      const vaultRun = await withVaultDecryptedSecret(route.vaultKeyId, async (apiKey) => {
        const model = createAiSdkLanguageModel(route.provider, apiKey, route.modelId);
        return generateStructuredWithFallback({
          model,
          system,
          prompt,
          schema,
          maxOutputTokens: JD_STRUCTURED_MAX_OUTPUT_TOKENS,
        });
      });

      if (!vaultRun.ok) {
        recordEnhanceModelCall({
          route,
          traceId,
          userId,
          pass,
          durationMs: Date.now() - passStartedAt,
          status: "error",
          errorCode: "vault_decrypt_failed",
          errorMessage: "Could not decrypt BYOK API key",
          requestPreview,
          responsePreview: "Could not decrypt BYOK API key",
          operation: "ai.enhance.generate_object",
          feature: "jd_extract",
        });
        throw new Error(VAULT_DECRYPT_USER_MESSAGE);
      }

      const customerResult = {
        object: vaultRun.result.object as z.infer<T>,
        tokensUsed: vaultRun.result.tokensUsed,
        modelId: route.modelId,
        estimatedCost: 0,
        extractMode: vaultRun.result.mode,
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
        route,
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
      });

      return customerResult;
    } catch (err) {
      if (isVaultDecryptUserError(err)) {
        throw err;
      }
      logCustomerModelCallFailure({
        route,
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
      throw err;
    }
  }

  const executionModelId = route.modelId;

  try {
    const poolResult = await executeWithPoolRetry(
      async ({ apiKey }) => {
        const model = createAiSdkLanguageModel("gemini", apiKey, executionModelId);
        return generateStructuredWithFallback({
          model,
          system,
          prompt,
          schema,
          maxOutputTokens: JD_STRUCTURED_MAX_OUTPUT_TOKENS,
        });
      },
      { preferredSlot },
    );

    const systemResult = {
      object: poolResult.result.object as z.infer<T>,
      tokensUsed: poolResult.result.tokensUsed,
      modelId: executionModelId,
      estimatedCost: 0,
      poolCall: {
        slot: poolResult.slot,
        label: poolResult.label,
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

    logEnhance("engine", "model.object.error", {
      traceId,
      pass,
      durationMs: Date.now() - passStartedAt,
      status: status ?? null,
      message,
      errorCode,
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
      operation: "ai.enhance.generate_object",
      feature: "jd_extract",
    });
    throw err;
  }
}

async function runPass(
  route: ResolvedAiRoute,
  ctx: CandidateContext,
  pass: "generate" | "optimize",
  traceId: string,
  userId: string | null | undefined,
  pricingMap?: AiPricingMap | null,
  preferredSlot?: number,
  jobIntelligence?: JobIntelligence,
  enhanceDirective?: import("@/lib/job-tracker/jd/jd-intelligence").ResumeEnhanceDirective,
  brief?: import("@/lib/job-tracker/enhance/enhance-brief").ResumeEnhanceBrief,
): Promise<{
  text: string;
  tokensUsed: number;
  modelId: string;
  estimatedCost: number;
  slot?: number;
}> {
  logEnhance("engine", "pass.start", {
    traceId,
    step:
      pass === "generate"
        ? ENHANCE_PIPELINE.ENGINE_PASS_GENERATE
        : ENHANCE_PIPELINE.ENGINE_PASS_OPTIMIZE,
    pass,
    targetRole: ctx.targetRole,
    yearsExperienceEstimate: ctx.yearsExperienceEstimate,
    senioritySignal: ctx.senioritySignal,
    pageBudget: ctx.pageBudget,
    hasJobDescription: Boolean(ctx.jobDescription),
    jobDescriptionChars: ctx.jobDescription?.length ?? 0,
    rawResumeSnippetChars: ctx.rawResumeSnippet?.length ?? 0,
    preferredSlot: preferredSlot ?? null,
  });

  const system = buildEnhanceSystemPrompt(ctx);
  const prompt = buildEnhanceUserPrompt(
    ctx,
    pass,
    pass === "optimize" ? jobIntelligence : brief?.jd?.jobIntelligence ?? jobIntelligence,
    pass === "optimize" ? enhanceDirective : brief?.jd?.directive ?? enhanceDirective,
    brief,
  );
  const result = await callEnhanceModel(
    route,
    system,
    prompt,
    traceId,
    pass,
    userId,
    preferredSlot,
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
    twoPass: Boolean(input.jobDescription?.trim()),
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
      twoPass: Boolean(input.jobDescription?.trim()),
    },
    params: { targetRole: originalTarget },
  });

  const ctx = buildCandidateContext({
    form: input.form,
    targetRole: input.targetRole,
    jobDescription: input.jobDescription,
    rawResumeText: input.rawResumeText,
  });

  let totalTokens = 0;
  let totalCost = 0;
  let lastModelId = input.route.modelId;
  let apiCallCount = 0;
  let partialEnhance = false;
  let partialEnhanceMessage: string | undefined;
  const debug = input.pipelineDebug ?? null;

  try {
    pipelineDebugStep(debug, "ai_pass1", {
      status: "active",
      detail: "Calling generateText pass 1",
      meta: {
        routeMode: input.route.mode,
        modelId: input.route.modelId,
        provider: input.route.mode === "customer" ? input.route.provider : "system",
      },
    });

    const pass1 = await runPass(
      input.route,
      ctx,
      "generate",
      traceId,
      input.userId,
      pricingMap,
      undefined,
      input.jobIntelligence,
      input.enhanceDirective,
      input.brief,
    );
    totalTokens += pass1.tokensUsed;
    totalCost += pass1.estimatedCost;
    lastModelId = pass1.modelId;
    apiCallCount += 1;

    const pass1Body = parseEnhancedResumeBody(pass1.text);
    if (!pass1Body) {
      logEnhance("engine", "run.parse_failed", {
        traceId,
        step: ENHANCE_PIPELINE.ENGINE_MERGE,
        pass: "generate",
        responsePreviewChars: Math.min(pass1.text.length, 500),
      });
      logEnhanceDiag({
        traceId,
        designStep: "13",
        track: "engine",
        pipelineStep: ENHANCE_PIPELINE.ENGINE_MERGE,
        phase: "fail",
        level: "high",
        event: "engine.parse_failed",
        scope: "engine",
        userId: input.userId,
        errorCode: "invalid_response",
        flags: { pass: "generate" },
        params: { responsePreviewChars: Math.min(pass1.text.length, 500) },
      });
      return {
        ok: false,
        error: "AI returned an invalid resume format. Try again.",
        code: "invalid_response",
      };
    }

    logEnhance("engine", "run.parse_ok", {
      traceId,
      step: ENHANCE_PIPELINE.ENGINE_MERGE,
      pass: "generate",
    });

    let finalBody = normalizeEnhancedBody(pass1Body, input.form, traceId, input.userId ?? "unknown");

    if (ctx.jobDescription) {
      const optimizeCtx: CandidateContext = {
        ...ctx,
        resumeBody: finalBody,
      };

      pipelineDebugAdvance(debug, "ai_pass2", "ai_pass1", {
        detail: "Pass 1 OK — starting pass 2 optimize",
        meta: { modelId: pass1.modelId, tokensUsed: pass1.tokensUsed },
      });

      try {
        const pass2 = await runPass(
          input.route,
          optimizeCtx,
          "optimize",
          traceId,
          input.userId,
          pricingMap,
          pass1.slot,
          input.jobIntelligence,
          input.enhanceDirective,
          input.brief,
        );
        totalTokens += pass2.tokensUsed;
        totalCost += pass2.estimatedCost;
        lastModelId = pass2.modelId;
        apiCallCount += 1;

        const pass2Body = parseEnhancedResumeBody(pass2.text);
        if (pass2Body) {
          finalBody = normalizeEnhancedBody(pass2Body, input.form, traceId, input.userId ?? "unknown");
          logEnhance("engine", "run.parse_ok", {
            traceId,
            step: ENHANCE_PIPELINE.ENGINE_MERGE,
            pass: "optimize",
          });
        } else {
          partialEnhance = true;
          partialEnhanceMessage =
            "Job-specific optimization returned an invalid format. Your base enhancement was saved.";
          logEnhance("engine", "run.parse_failed", {
            traceId,
            step: ENHANCE_PIPELINE.ENGINE_MERGE,
            pass: "optimize",
            note: "keeping_pass1_body",
            responsePreviewChars: Math.min(pass2.text.length, 500),
          });
        }
      } catch (pass2Err) {
        partialEnhance = true;
        partialEnhanceMessage =
          "Job-specific optimization failed after retries. Your base enhancement was saved.";
        logEnhance("engine", "run.pass2_failed", {
          traceId,
          step: ENHANCE_PIPELINE.ENGINE_MERGE,
          note: "keeping_pass1_body",
          message:
            pass2Err instanceof Error ? pass2Err.message : String(pass2Err),
        });
      }
    }

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
      partialEnhance,
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
      flags: { partialEnhance },
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
      ...(partialEnhance
        ? { partialEnhance: true, partialEnhanceMessage }
        : {}),
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
