import { generateText } from "ai";
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
import {
  logEnhance,
  sanitizeRouteForLog,
  summarizeFormDelta,
} from "@/src/lib/ai/engine/enhance-logger";
import { ENHANCE_PIPELINE } from "@/src/lib/ai/engine/enhance-pipeline";
import { mapEnhanceProviderError } from "@/src/lib/ai/engine/map-enhance-provider-error";
import {
  executeWithPoolRetry,
  SystemKeyPoolError,
  type PoolCallMeta,
} from "@/src/lib/ai/engine/system-key-pool";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import type { StudioEditorSectionId } from "@/lib/resume/studio-editor-sections";
import type { JobIntelligence } from "@/lib/job-tracker/ats/job-intelligence";
import { logApiCall } from "@/src/shared/observability";
import type { ApiCallStatus } from "@/src/shared/observability";

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
}): void {
  const aiMode = input.route.mode;
  const provider =
    input.route.mode === "customer" ? input.route.provider : "gemini";
  const modelId = input.poolCall?.modelId ?? input.route.modelId;

  logApiCall({
    traceId: input.traceId,
    userId: input.userId,
    domain: "ai",
    operation: "ai.enhance.generate_text",
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
    metadata: { pass: input.pass, feature: "enhance" },
  });
}

export async function callEnhanceModel(
  route: ResolvedAiRoute,
  system: string,
  prompt: string,
  traceId: string,
  pass: "generate" | "optimize",
  userId?: string | null,
  preferredSlot?: number,
): Promise<{
  text: string;
  tokensUsed: number;
  modelId: string;
  estimatedCost: number;
  poolCall?: PoolCallMeta;
}> {
  const passStartedAt = Date.now();
  logEnhance("engine", "model.call.start", {
    traceId,
    step:
      pass === "generate"
        ? ENHANCE_PIPELINE.ENGINE_PASS_GENERATE
        : ENHANCE_PIPELINE.ENGINE_PASS_OPTIMIZE,
    pass,
    route: sanitizeRouteForLog(route),
    preferredSlot: preferredSlot ?? null,
    systemPromptChars: system.length,
    userPromptChars: prompt.length,
  });

  if (route.mode === "customer") {
    const vaultRun = await withVaultDecryptedSecret(route.vaultKeyId, async (apiKey) => {
      const model = createAiSdkLanguageModel(route.provider, apiKey, route.modelId);
      return generateText({ model, system, prompt, maxOutputTokens: 8192 });
    });

    if (!vaultRun.ok) {
      logEnhance("engine", "model.call.error", {
        traceId,
        pass,
        reason: "vault_decrypt_failed",
        durationMs: Date.now() - passStartedAt,
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
      });
      throw new Error("Could not decrypt your API key. Update it in AI Keys.");
    }

    const customerResult = {
      text: vaultRun.result.text,
      tokensUsed: vaultRun.result.usage?.totalTokens ?? 0,
      modelId: route.modelId,
      estimatedCost: 0,
    };
    logEnhance("engine", "model.call.success", {
      traceId,
      pass,
      durationMs: Date.now() - passStartedAt,
      tokensUsed: customerResult.tokensUsed,
      responseChars: customerResult.text.length,
      modelId: customerResult.modelId,
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
    });
    return customerResult;
  }

  try {
    const poolResult = await executeWithPoolRetry(
      async ({ apiKey, modelId, slot }) => {
        const model = createAiSdkLanguageModel("gemini", apiKey, modelId);
        return generateText({ model, system, prompt, maxOutputTokens: 8192 });
      },
      { preferredSlot },
    );

    const systemResult = {
      text: poolResult.result.text,
      tokensUsed: poolResult.result.usage?.totalTokens ?? 0,
      modelId: poolResult.modelId,
      estimatedCost: 0,
      poolCall: {
        slot: poolResult.slot,
        label: poolResult.label,
        billingMode: poolResult.billingMode,
        modelId: poolResult.modelId,
        keySource: poolResult.keySource,
      },
    };

    logEnhance("engine", "model.call.success", {
      traceId,
      pass,
      durationMs: Date.now() - passStartedAt,
      tokensUsed: systemResult.tokensUsed,
      responseChars: systemResult.text.length,
      modelId: systemResult.modelId,
      keySlot: poolResult.slot,
      keyLabel: poolResult.label,
      billingMode: poolResult.billingMode,
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

  try {
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

    return {
      ok: false,
      error: errorMessage,
      code: errorCode as RunEnhanceFailure["code"],
    };
  }
}
