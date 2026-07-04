// Public API for the JD Brain pipeline.
// analyzeJobDescription — async, runs AI enrichment if no cache hit.
// analyzeJobDescriptionSync — sync, deterministic floor only, never blocks on AI.
// Both guarantee a complete JDAnalysisResult — never throw, never return null.

import { createHash } from "crypto";
import { cleanJobDescription } from "@/lib/job-tracker/jd/jd-cleaner";
import { segmentJobDescription } from "@/lib/job-tracker/jd/jd-segmenter";
import { extractJDIntelligenceSync } from "@/lib/job-tracker/jd/jd-extractor";
import type {
  JDIntelligence,
  JDSegments,
  JSONLDJobFields,
} from "@/lib/job-tracker/jd/jd-intelligence";
import type { ResolvedAiRoute } from "@/src/lib/ai/engine/router";
import { makeEmptyIntelligence } from "@/lib/job-tracker/jd/jd-intelligence";
import { logEnhance } from "@/src/lib/ai/engine/enhance-logger";
import { ENHANCE_PIPELINE } from "@/src/lib/ai/engine/enhance-pipeline";
import type { JdExtractionOptions } from "@/lib/job-tracker/jd/jd-ai-extractor";
import { runInflightJdExtract } from "@/lib/job-tracker/jd/jd-extract-inflight";
import { resolveJdExtractFeature } from "@/lib/features/resolve-jd-extract";
import {
  pipelineDebugAdvance,
  pipelineDebugStep,
} from "@/lib/extension/pipeline-debug-hooks";

export type JDAnalysisInput = {
  rawDescription: string;
  targetRole: string;
  jsonLdFields?: JSONLDJobFields;
  cachedIntelligence?: JDIntelligence | null;
  cachedHash?: string | null;
  useAi?: boolean;
  /** Shared enhance route — BYOK when vault key exists, else system pool. */
  aiRoute?: ResolvedAiRoute | null;
  /** Quota + model options for AI JD extraction. */
  jdExtraction?: JdExtractionOptions;
  traceId?: string;
  userId?: string | null;
  jobEntryId?: string;
};

export type JDAnalysisResult = {
  segments: JDSegments;
  intelligence: JDIntelligence;
  cacheHit: boolean;
  descriptionHash: string;
  /** True when an AI `generateObject` JD extract call ran (not cache / deterministic-only). */
  aiCallMade: boolean;
  /** True when JD AI extract was attempted (route present, not cache hit). */
  aiAttempted: boolean;
  /** Pipeline debug detail when AI JD extract was skipped (not cache hit). */
  aiSkipDetail?: string | null;
};

export function hashJobDescription(description: string): string {
  return createHash("sha1")
    .update(description.trim().toLowerCase())
    .digest("hex")
    .slice(0, 16);
}

function buildSegmentsForEmpty(): JDSegments {
  return {
    requirements: "",
    responsibilities: "",
    preferred: "",
    context: "",
    source: "full-text",
    wordCount: { requirements: 0, responsibilities: 0, preferred: 0 },
  };
}

export function analyzeJobDescriptionSync(
  rawDescription: string,
  targetRole: string,
  jsonLdFields?: JSONLDJobFields,
): JDAnalysisResult {
  try {
    const descriptionHash = hashJobDescription(rawDescription);

    if (!rawDescription.trim()) {
      return {
        segments: buildSegmentsForEmpty(),
        intelligence: makeEmptyIntelligence(),
        cacheHit: false,
        descriptionHash,
        aiCallMade: false,
        aiAttempted: false,
      };
    }

    const { cleaned } = cleanJobDescription(rawDescription);
    const segments = segmentJobDescription(cleaned, jsonLdFields);
    const intelligence = extractJDIntelligenceSync(segments, targetRole);

    return { segments, intelligence, cacheHit: false, descriptionHash, aiCallMade: false, aiAttempted: false };
  } catch {
      return {
        segments: buildSegmentsForEmpty(),
        intelligence: makeEmptyIntelligence(),
        cacheHit: false,
        descriptionHash: hashJobDescription(rawDescription),
        aiCallMade: false,
        aiAttempted: false,
      };
  }
}

function finishPreJdBrainStep(
  pipelineDebug: JdExtractionOptions["pipelineDebug"],
  detail: string,
  meta?: Record<string, unknown>,
): void {
  if (!pipelineDebug) return;
  pipelineDebugStep(pipelineDebug, "pre_jd_brain", {
    status: "done",
    detail,
    meta,
  });
}

function skipAiJdExtractStep(
  pipelineDebug: JdExtractionOptions["pipelineDebug"],
  detail: string,
  setDetail?: (detail: string) => void,
): void {
  setDetail?.(detail);
  if (!pipelineDebug) return;
  pipelineDebugStep(pipelineDebug, "ai_jd_extract", {
    status: "skipped",
    detail,
  });
}

export async function analyzeJobDescription(
  input: JDAnalysisInput,
): Promise<JDAnalysisResult> {
  const pipelineDebug = input.jdExtraction?.pipelineDebug ?? null;

  try {
    const {
      rawDescription,
      targetRole,
      jsonLdFields,
      cachedIntelligence,
      cachedHash,
      useAi = true,
    } = input;

    const descriptionHash = hashJobDescription(rawDescription);
    let aiSkipDetail: string | null = null;
    const recordSkip = (detail: string) => {
      aiSkipDetail = detail;
    };

    if (cachedHash === descriptionHash && cachedIntelligence) {
      const { cleaned } = cleanJobDescription(rawDescription);
      const segments = segmentJobDescription(cleaned, jsonLdFields);
      finishPreJdBrainStep(pipelineDebug, "Cache hit", {
        cacheHit: true,
        domain: cachedIntelligence.domain,
      });
      skipAiJdExtractStep(pipelineDebug, "JD intelligence cached", recordSkip);
      return {
        segments,
        intelligence: cachedIntelligence,
        cacheHit: true,
        descriptionHash,
        aiCallMade: false,
        aiAttempted: false,
        aiSkipDetail,
      };
    }

    if (!rawDescription.trim()) {
      finishPreJdBrainStep(pipelineDebug, "Empty JD");
      skipAiJdExtractStep(pipelineDebug, "No job description", recordSkip);
      return {
        segments: buildSegmentsForEmpty(),
        intelligence: makeEmptyIntelligence(),
        cacheHit: false,
        descriptionHash,
        aiCallMade: false,
        aiAttempted: false,
        aiSkipDetail,
      };
    }

    const { cleaned } = cleanJobDescription(rawDescription);
    const segments = segmentJobDescription(cleaned, jsonLdFields);
    let intelligence = extractJDIntelligenceSync(segments, targetRole);
    let aiCallMade = false;
    let aiAttempted = false;

    finishPreJdBrainStep(pipelineDebug, "Deterministic extract complete", {
      cacheHit: false,
      domain: intelligence.domain,
      tier1Count: intelligence.tier1Keywords.length,
    });

    if (useAi && input.aiRoute) {
      const { getFeatureFlags } = await import("@/src/lib/services/feature-flags-service");
      const flags = await getFeatureFlags();
      const { shouldRunAiExtract } = resolveJdExtractFeature(flags);

      if (!shouldRunAiExtract) {
        skipAiJdExtractStep(
          pipelineDebug,
          "AI JD extract disabled (ai_jd_extract_enabled)",
          recordSkip,
        );
        logEnhance("server", "jd.brain.skip_ai", {
          traceId: input.traceId ?? "no-trace",
          userId: input.userId,
          step: ENHANCE_PIPELINE.PRE_JD_BRAIN,
          descriptionHash,
          reason: "feature_disabled",
        });
      } else {
        aiAttempted = true;
        pipelineDebugAdvance(pipelineDebug, "ai_jd_extract", "pre_jd_brain");

        const inflightKey = `${input.userId ?? "anon"}:${input.jobEntryId ?? "no-entry"}:${descriptionHash}`;
        const outcome = await runInflightJdExtract(inflightKey, async () => {
          const { extractJDIntelligenceWithAI, mergeAIIntoIntelligence } = await import(
            "@/lib/job-tracker/jd/jd-ai-extractor"
          );
          const aiResult = await extractJDIntelligenceWithAI(
            segments,
            targetRole,
            input.aiRoute!,
            input.traceId ?? "no-trace",
            input.userId,
            input.jdExtraction ?? {},
          );
          if (aiResult.ok) {
            const merged = mergeAIIntoIntelligence(intelligence, aiResult.intelligence);
            logEnhance("server", "jd.brain.merge", {
              traceId: input.traceId ?? "no-trace",
              userId: input.userId,
              step: ENHANCE_PIPELINE.PRE_JD_BRAIN,
              descriptionHash,
              source: merged.source,
              confidence: merged.confidence,
              velocitySignal: merged.velocitySignal,
              ownershipLevel: merged.ownershipLevel,
              industryDomain: merged.industryDomain.slice(0, 3),
              mustHaveSkills: merged.mustHaveSkills.slice(0, 12),
              summaryTheme: merged.summaryTheme || null,
            });
            return { intelligence: merged, aiCallMade: true };
          }
          if (aiResult.reason === "quota") {
            skipAiJdExtractStep(pipelineDebug, "Quota blocked", recordSkip);
          }
          return { intelligence, aiCallMade: false };
        });
        intelligence = outcome.intelligence;
        aiCallMade = outcome.aiCallMade;
      }
    } else {
      skipAiJdExtractStep(
        pipelineDebug,
        useAi ? "No AI route" : "AI disabled for this run",
        recordSkip,
      );
    }

    return {
      segments,
      intelligence,
      cacheHit: false,
      descriptionHash,
      aiCallMade,
      aiAttempted,
      aiSkipDetail,
    };
  } catch {
    finishPreJdBrainStep(pipelineDebug, "Deterministic extract failed");
    skipAiJdExtractStep(pipelineDebug, "JD brain error", () => undefined);
    return {
      segments: buildSegmentsForEmpty(),
      intelligence: makeEmptyIntelligence(),
      cacheHit: false,
      descriptionHash: hashJobDescription(input.rawDescription),
      aiCallMade: false,
      aiAttempted: false,
      aiSkipDetail: "JD brain error",
    };
  }
}
