// Layer 3B — AI-powered JD extraction via shared enhance AI route (BYOK or system pool).
// Never throws: on any error returns { ok: false }.

import type { JDIntelligence, JDImpactDimension, JDSegments } from "@/lib/job-tracker/jd/jd-intelligence";
import { jdAiExtractSchema, type JdAiExtractPayload } from "@/lib/job-tracker/jd/jd-ai-extract-schema";
import { truncateSegmentsForExtraction } from "@/lib/job-tracker/jd/jd-prompt-segments";
import { canonicalizeMasterSkills } from "@/lib/job-tracker/jd/skill-canonicalize";
import type { AiProvider } from "@/src/lib/config/app.config";
import type { ResolvedAiRoute } from "@/src/lib/ai/engine/router";
import { callEnhanceObjectModel } from "@/src/lib/ai/engine/run-enhance";
import { logEnhance } from "@/src/lib/ai/engine/enhance-logger";
import { ENHANCE_PIPELINE } from "@/src/lib/ai/engine/enhance-pipeline";
import { checkAiQuota, shouldTrackQuota, type UserQuotaRow } from "@/src/lib/ai/engine/quota";
import type { AiEngineConfig } from "@/src/lib/services/ai-engine-config";
import { JD_EXTRACTION_SYSTEM_MODEL_DEFAULT } from "@/src/lib/services/ai-engine-config";

/** @deprecated Use `resolveJdExtractionSystemModel(aiEngine)` — kept for imports/tests. */
export const JD_EXTRACTION_SYSTEM_MODEL = JD_EXTRACTION_SYSTEM_MODEL_DEFAULT;

export type JdExtractionQuotaContext = {
  quotaRow: UserQuotaRow;
  aiEngine: AiEngineConfig;
};

export type JdExtractionOptions = {
  quotaContext?: JdExtractionQuotaContext;
  /** System-pool model override; defaults to `aiEngine.system.jdExtractionModelId`. */
  systemJdModelId?: string;
};

const VALID_IMPACT_DIMS = new Set<JDImpactDimension>([
  "reliability",
  "scale",
  "speed",
  "cost",
  "revenue",
  "quality",
  "security",
  "team",
  "delivery",
]);

export type JDAiExtractResult =
  | { ok: true; intelligence: Partial<JDIntelligence> }
  | { ok: false; reason: "unavailable" | "parse_error" | "quota" };

export function buildJDExtractionPrompt(
  segments: JDSegments,
  targetRole: string,
): string {
  const truncated = truncateSegmentsForExtraction(segments);

  const parts = [
    `Target role: ${targetRole}`,
    "",
    "REQUIREMENTS:",
    '"""',
    truncated.requirements || "(not found)",
    '"""',
    "",
    "RESPONSIBILITIES:",
    '"""',
    truncated.responsibilities || "(not found)",
    '"""',
  ];

  if (truncated.preferred) {
    parts.push("", "PREFERRED:", '"""', truncated.preferred, '"""');
  }

  if (truncated.context) {
    parts.push("", "CONTEXT:", '"""', truncated.context, '"""');
  }

  parts.push(
    "",
    "Rules:",
    "- mustHaveSkills: specific tools, languages, platforms explicitly REQUIRED — use exact JD wording",
    "- emphasisAreas: broader domains or architectural patterns ONLY — NOT specific tools (e.g. Distributed Systems, not Python or Kafka)",
    "- summaryTheme: one sentence — what the resume summary MUST lead with for this role",
    "- targetVerbs: up to 8 past-tense action verbs from responsibilities",
    "- impactDimensions: subset of reliability, scale, speed, cost, revenue, quality, security, team, delivery",
    "- velocitySignal: fast=startup/rapid-shipping, moderate=balanced, structured=enterprise/process-heavy",
    "- ownershipLevel: high=autonomous/own-your-area, medium=collaborative, low=support/execution",
    "- deprioritize: skills or experiences NOT relevant to this role (suppress in resume)",
    "- Never invent facts. If unknown, use empty string, null, or [].",
  );

  return parts.join("\n");
}

function payloadToPartialIntelligence(payload: JdAiExtractPayload): Partial<JDIntelligence> {
  return {
    mustHaveSkills: payload.mustHaveSkills,
    preferredSkills: payload.preferredSkills,
    mustHaveYearsExp: payload.mustHaveYearsExp,
    mustHaveDegree: payload.mustHaveDegree ?? null,
    mustHaveCerts: payload.mustHaveCerts,
    summaryTheme: payload.summaryTheme,
    targetVerbs: payload.targetVerbs,
    deliverables: payload.deliverables,
    impactDimensions: payload.impactDimensions,
    emphasisAreas: payload.emphasisAreas,
    deprioritize: payload.deprioritize,
    velocitySignal: payload.velocitySignal,
    ownershipLevel: payload.ownershipLevel,
    industryDomain: payload.industryDomain,
    preferredDomain: payload.preferredDomain,
  };
}

export function mergeAIIntoIntelligence(
  base: JDIntelligence,
  ai: Partial<JDIntelligence>,
): JDIntelligence {
  const merged: JDIntelligence = { ...base };

  if (ai.mustHaveSkills?.length) {
    const canonical = canonicalizeMasterSkills(ai.mustHaveSkills);
    const seen = new Set<string>();
    merged.mustHaveSkills = [...base.mustHaveSkills, ...canonical].filter((s) => {
      const key = s.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  if (ai.preferredSkills?.length) {
    const canonical = canonicalizeMasterSkills(ai.preferredSkills);
    merged.preferredSkills = [...new Set([...base.preferredSkills, ...canonical])];
  }
  if (ai.mustHaveYearsExp != null && base.mustHaveYearsExp == null) {
    merged.mustHaveYearsExp = ai.mustHaveYearsExp;
  }
  if (ai.mustHaveDegree && !base.mustHaveDegree) {
    merged.mustHaveDegree = ai.mustHaveDegree;
  }
  if (ai.mustHaveCerts?.length) {
    merged.mustHaveCerts = [...new Set([...base.mustHaveCerts, ...(ai.mustHaveCerts ?? [])])];
  }
  if (ai.summaryTheme) merged.summaryTheme = ai.summaryTheme;
  if (ai.targetVerbs?.length) merged.targetVerbs = ai.targetVerbs.slice(0, 10);
  if (ai.deliverables?.length) merged.deliverables = ai.deliverables;
  if (ai.impactDimensions?.length) {
    merged.impactDimensions = (ai.impactDimensions as string[])
      .filter((d): d is JDImpactDimension => VALID_IMPACT_DIMS.has(d as JDImpactDimension))
      .slice(0, 5);
  }
  if (ai.emphasisAreas?.length) {
    merged.emphasisAreas = ai.emphasisAreas
      .filter((area) => !ai.mustHaveSkills?.some((s) => s.toLowerCase() === area.toLowerCase()))
      .slice(0, 4);
  }
  if (ai.deprioritize?.length) merged.deprioritize = ai.deprioritize;
  if (ai.velocitySignal) merged.velocitySignal = ai.velocitySignal;
  if (ai.ownershipLevel) merged.ownershipLevel = ai.ownershipLevel;
  if (ai.industryDomain?.length) merged.industryDomain = ai.industryDomain;
  if (ai.preferredDomain?.length) merged.preferredDomain = ai.preferredDomain;

  merged.source = "hybrid";
  merged.confidence = Math.min(base.confidence + 0.35, 1.0);
  merged.extractedAt = new Date().toISOString();

  return merged;
}

/** Gemini BYOK enhance models (e.g. 2.5-flash) are unreliable for `generateObject`; use JD utility model. */
export function resolveJdExtractionCustomerModel(
  provider: AiProvider,
  customerEnhanceModelId: string,
  systemJdModelId: string,
): string {
  if (provider === "gemini") {
    return systemJdModelId;
  }
  return customerEnhanceModelId;
}

export function jdExtractionRoute(
  route: ResolvedAiRoute,
  systemJdModelId: string = JD_EXTRACTION_SYSTEM_MODEL_DEFAULT,
): ResolvedAiRoute {
  if (route.mode === "system") {
    return { mode: "system", modelId: systemJdModelId };
  }
  return {
    ...route,
    modelId: resolveJdExtractionCustomerModel(
      route.provider,
      route.modelId,
      systemJdModelId,
    ),
  };
}

const JD_EXTRACTION_SYSTEM =
  "You are an expert technical recruiter and resume strategist. " +
  "Extract structured job intelligence from the provided sections. " +
  "Never invent facts not present in the text.";

export async function extractJDIntelligenceWithAI(
  segments: JDSegments,
  targetRole: string,
  route: ResolvedAiRoute,
  traceId = "no-trace",
  userId?: string | null,
  options: JdExtractionOptions = {},
): Promise<JDAiExtractResult> {
  try {
    const systemJdModelId =
      options.systemJdModelId ??
      options.quotaContext?.aiEngine.system.jdExtractionModelId ??
      JD_EXTRACTION_SYSTEM_MODEL_DEFAULT;
    const executionRoute = jdExtractionRoute(route, systemJdModelId);

    if (options.quotaContext && shouldTrackQuota(options.quotaContext.aiEngine, executionRoute.mode)) {
      const quotaCheck = checkAiQuota(
        options.quotaContext.quotaRow,
        options.quotaContext.aiEngine,
        executionRoute.mode,
        { estimatedCalls: 1 },
      );
      if (!quotaCheck.ok) {
        logEnhance("server", "jd.extract.quota_blocked", {
          traceId,
          userId,
          step: ENHANCE_PIPELINE.PRE_JD_BRAIN,
          routeMode: executionRoute.mode,
          reason: quotaCheck.reason,
        });
        return { ok: false, reason: "quota" };
      }
    }

    const prompt = buildJDExtractionPrompt(segments, targetRole);

    const result = await callEnhanceObjectModel(
      executionRoute,
      JD_EXTRACTION_SYSTEM,
      prompt,
      jdAiExtractSchema,
      traceId,
      "generate",
      userId,
    );

    const intelligence = payloadToPartialIntelligence(result.object);

    logEnhance("server", "jd.extract.done", {
      traceId,
      userId,
      step: ENHANCE_PIPELINE.PRE_JD_BRAIN,
      modelId: result.modelId,
      routeMode: executionRoute.mode,
      mustHaveSkillsCount: intelligence.mustHaveSkills?.length ?? 0,
      mustHaveSkills: intelligence.mustHaveSkills?.slice(0, 12) ?? [],
      emphasisAreas: intelligence.emphasisAreas ?? [],
      velocitySignal: intelligence.velocitySignal ?? null,
      ownershipLevel: intelligence.ownershipLevel ?? null,
      industryDomain: intelligence.industryDomain ?? [],
      summaryTheme: intelligence.summaryTheme ?? null,
    });

    return { ok: true, intelligence };
  } catch (err) {
    const isParseErr =
      err instanceof SyntaxError ||
      (err instanceof Error &&
        (err.message.toLowerCase().includes("json") ||
          err.message.toLowerCase().includes("schema") ||
          err.message.toLowerCase().includes("parse")));
    return { ok: false, reason: isParseErr ? "parse_error" : "unavailable" };
  }
}
