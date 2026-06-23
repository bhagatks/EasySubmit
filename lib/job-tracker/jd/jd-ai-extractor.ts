// Layer 3B — AI-powered JD extraction using Gemini Flash via system key pool.
// Uses system key only (never user quota). Cached per job — one call per unique JD.
// Never throws: on any error returns { ok: false }.

import { generateText } from "ai";
import { createAiSdkLanguageModel } from "@/src/lib/ai/ai-sdk-provider";
import { acquireSystemGeminiKey } from "@/src/lib/ai/engine/system-key-pool";
import { getAppConfig } from "@/src/lib/services/config-service";
import { isSystemAiEnabled } from "@/src/lib/services/ai-engine-config";
import type { JDSegments, JDIntelligence, JDImpactDimension } from "@/lib/job-tracker/jd/jd-intelligence";

const VALID_IMPACT_DIMS = new Set<JDImpactDimension>([
  "reliability","scale","speed","cost","revenue","quality","security","team","delivery",
]);

export type JDAiExtractResult =
  | { ok: true; intelligence: Partial<JDIntelligence> }
  | { ok: false; reason: "unavailable" | "parse_error" | "quota" };

export function buildJDExtractionPrompt(
  segments: JDSegments,
  targetRole: string,
): string {
  const reqBlock = segments.requirements.slice(0, 3000).trim();
  const respBlock = segments.responsibilities.slice(0, 2000).trim();
  const prefBlock = segments.preferred.slice(0, 1000).trim();

  const parts = [
    `Target role: ${targetRole}`,
    "",
    "REQUIREMENTS:",
    '"""',
    reqBlock || "(not found)",
    '"""',
    "",
    "RESPONSIBILITIES:",
    '"""',
    respBlock || "(not found)",
    '"""',
  ];

  if (prefBlock) {
    parts.push("", "PREFERRED:", '"""', prefBlock, '"""');
  }

  parts.push(
    "",
    "Extract job intelligence. Return ONLY valid JSON matching exactly this schema:",
    JSON.stringify({
      mustHaveSkills: [],
      preferredSkills: [],
      mustHaveYearsExp: null,
      mustHaveDegree: null,
      mustHaveCerts: [],
      summaryTheme: "",
      targetVerbs: [],
      deliverables: [],
      impactDimensions: [],
      emphasisAreas: [],
      deprioritize: [],
      velocitySignal: null,
      ownershipLevel: null,
      industryDomain: [],
      preferredDomain: [],
    }),
    "",
    "Rules:",
    "- mustHaveSkills: technical skills explicitly required (taxonomy terms only)",
    "- summaryTheme: one sentence — what the resume summary MUST lead with for this role",
    "- targetVerbs: top 8 strong action verbs extracted from responsibilities section",
    "- impactDimensions: subset of [reliability,scale,speed,cost,revenue,quality,security,team,delivery]",
    "- velocitySignal: fast=startup/rapid-shipping, moderate=balanced, structured=enterprise/process-heavy",
    "- ownershipLevel: high=autonomous/own-your-area, medium=collaborative, low=support/execution",
    "- deprioritize: skills or experiences NOT relevant to this role (suppress in resume)",
    "- Never invent facts. If unknown, use empty string or null.",
  );

  return parts.join("\n");
}

export function mergeAIIntoIntelligence(
  base: JDIntelligence,
  ai: Partial<JDIntelligence>,
): JDIntelligence {
  const merged: JDIntelligence = { ...base };

  if (ai.mustHaveSkills?.length) {
    merged.mustHaveSkills = [...new Set([...base.mustHaveSkills, ...ai.mustHaveSkills])];
  }
  if (ai.preferredSkills?.length) {
    merged.preferredSkills = [...new Set([...base.preferredSkills, ...ai.preferredSkills])];
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
  if (ai.emphasisAreas?.length) merged.emphasisAreas = ai.emphasisAreas.slice(0, 4);
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

export async function extractJDIntelligenceWithAI(
  segments: JDSegments,
  targetRole: string,
  base: JDIntelligence,
): Promise<JDAiExtractResult> {
  try {
    const aiEngine = await getAppConfig("aiEngine");
    if (!isSystemAiEnabled(aiEngine)) {
      return { ok: false, reason: "unavailable" };
    }

    const keyResult = await acquireSystemGeminiKey(aiEngine);
    if (!keyResult) {
      return { ok: false, reason: "quota" };
    }

    const model = createAiSdkLanguageModel(
      "gemini",
      keyResult.apiKey,
      "gemini-1.5-flash",
    );

    const prompt = buildJDExtractionPrompt(segments, targetRole);

    const { text } = await generateText({
      model,
      system:
        "You are an expert technical recruiter and resume strategist. " +
        "Extract structured job intelligence from the provided sections. " +
        "Return ONLY valid JSON — no markdown fences, no commentary. " +
        "Never invent facts not present in the text.",
      prompt,
      temperature: 0,
      maxOutputTokens: 1000,
    });

    // Strip markdown fences if model adds them
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    const parsed = JSON.parse(cleaned) as Partial<JDIntelligence>;

    return { ok: true, intelligence: parsed };
  } catch (err) {
    const isParseErr =
      err instanceof SyntaxError ||
      (err instanceof Error && err.message.toLowerCase().includes("json"));
    return { ok: false, reason: isParseErr ? "parse_error" : "unavailable" };
  }
}
