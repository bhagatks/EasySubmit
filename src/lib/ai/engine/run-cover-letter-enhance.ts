import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { buildDeterministicCoverLetterMarkdown } from "@/lib/job-tracker/build-deterministic-cover-letter";
import {
  buildCoverLetterSystemPrompt,
  buildCoverLetterUserPrompt,
  normalizeCoverLetterBody,
} from "@/src/lib/ai/engine/cover-letter-brain";
import {
  logEnhance,
  sanitizeRouteForLog,
} from "@/src/lib/ai/engine/enhance-logger";
import { ENHANCE_PIPELINE } from "@/src/lib/ai/engine/enhance-pipeline";
import { mapEnhanceProviderError } from "@/src/lib/ai/engine/map-enhance-provider-error";
import { callEnhanceModel, type RunEnhanceFailure } from "@/src/lib/ai/engine/run-enhance";
import type { ResolvedAiRoute } from "@/src/lib/ai/engine/router";
import { SystemKeyPoolError } from "@/src/lib/ai/engine/system-key-pool";

export type RunCoverLetterEnhanceInput = {
  form: HubRefineryForm;
  targetTitle: string;
  company: string | null;
  jobTitle: string;
  jobDescription?: string | null;
  existing?: string | null;
  route: ResolvedAiRoute;
  traceId?: string;
  userId?: string | null;
};

export type RunCoverLetterEnhanceSuccess = {
  ok: true;
  body: string;
  tokensUsed: number;
  modelId: string;
  apiCallCount: number;
  fallbackUsed?: boolean;
  fallbackSummary?: string;
};

export type RunCoverLetterEnhanceResult = RunCoverLetterEnhanceSuccess | RunEnhanceFailure;

export async function runCoverLetterEnhance(
  input: RunCoverLetterEnhanceInput,
): Promise<RunCoverLetterEnhanceResult> {
  const traceId = input.traceId ?? "no-trace";
  const startedAt = Date.now();

  logEnhance("engine", "cover.run.start", {
    traceId,
    step: ENHANCE_PIPELINE.ENGINE_RUN_START,
    route: sanitizeRouteForLog(input.route),
    jobTitle: input.jobTitle,
  });

  const system = buildCoverLetterSystemPrompt();
  const prompt = buildCoverLetterUserPrompt(input);

  try {
    const result = await callEnhanceModel(
      input.route,
      system,
      prompt,
      traceId,
      "generate",
      input.userId,
    );

    const body = normalizeCoverLetterBody(result.text);
    if (body.length < 80) {
      const fallback = buildDeterministicCoverLetterMarkdown({
        form: input.form,
        targetTitle: input.targetTitle,
        company: input.company,
        jobTitle: input.jobTitle,
        jobDescription: input.jobDescription,
      });
      if (fallback.ok && fallback.markdown.trim().length >= 80) {
        return {
          ok: true,
          body: fallback.markdown.trim(),
          tokensUsed: result.tokensUsed,
          modelId: result.modelId,
          apiCallCount: 1,
          fallbackUsed: true,
          fallbackSummary:
            "AI returned an unusable draft. We saved a template-based letter you can edit.",
        };
      }
      return {
        ok: false,
        error: "AI returned an invalid cover letter. Try again.",
        code: "invalid_response",
      };
    }

    logEnhance("engine", "cover.run.success", {
      traceId,
      step: ENHANCE_PIPELINE.ENGINE_MERGE,
      durationMs: Date.now() - startedAt,
      responseChars: body.length,
      tokensUsed: result.tokensUsed,
      modelId: result.modelId,
    });

    return {
      ok: true,
      body,
      tokensUsed: result.tokensUsed,
      modelId: result.modelId,
      apiCallCount: 1,
    };
  } catch (err) {
    if (err instanceof SystemKeyPoolError && err.code === "capacity_exhausted") {
      return {
        ok: false,
        error: err.message,
        code: "capacity_exhausted",
      };
    }

    const mapped = mapEnhanceProviderError(err, { aiMode: input.route.mode });
    logEnhance("engine", "cover.run.error", {
      traceId,
      step: ENHANCE_PIPELINE.ENGINE_ERROR,
      durationMs: Date.now() - startedAt,
      code: mapped.code,
      userMessage: mapped.userMessage,
      rawMessage: mapped.rawMessage,
    });

    const fallback = buildDeterministicCoverLetterMarkdown({
      form: input.form,
      targetTitle: input.targetTitle,
      company: input.company,
      jobTitle: input.jobTitle,
      jobDescription: input.jobDescription,
    });

    if (fallback.ok && fallback.markdown.trim().length >= 80) {
      logEnhance("engine", "cover.run.fallback.success", {
        traceId,
        step: ENHANCE_PIPELINE.ENGINE_ERROR,
        bodyChars: fallback.markdown.length,
      });
      return {
        ok: true,
        body: fallback.markdown.trim(),
        tokensUsed: 0,
        modelId: "deterministic",
        apiCallCount: 0,
        fallbackUsed: true,
        fallbackSummary:
          "AI was unavailable. We saved a template-based draft — review and edit before applying.",
      };
    }

    return {
      ok: false,
      error: mapped.userMessage,
      code: mapped.code,
    };
  }
}
