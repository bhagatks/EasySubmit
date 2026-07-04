import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { PipelineDebugProgress } from "@/src/shared/extension/pipeline-debug-types";
import {
  buildPipelineRunView,
  type PipelineApiLogRow,
  type PipelineRunContext,
  type PipelineRunView,
} from "@/src/shared/extension/pipeline-run-view";

type BuildPipelineRunInsightInput = {
  userId: string;
  jobId: string;
  progress: PipelineDebugProgress;
  entry: {
    title: string;
    company: string | null;
    platform: string | null;
    status: JobTrackerStatus;
    savedAt: Date;
    jdIntelligence: unknown;
    jdSkillsVocabulary: unknown;
    resumeTailor: {
      enhanceTraceId: string | null;
      enhanceMeta: unknown;
    } | null;
  };
};

function readJdIntel(jd: unknown): {
  source: string | null;
  confidence: number | null;
  mustHaveSkills: number;
} {
  if (!jd || typeof jd !== "object") {
    return { source: null, confidence: null, mustHaveSkills: 0 };
  }
  const row = jd as Record<string, unknown>;
  return {
    source: typeof row.source === "string" ? row.source : null,
    confidence: typeof row.confidence === "number" ? row.confidence : null,
    mustHaveSkills: Array.isArray(row.mustHaveSkills) ? row.mustHaveSkills.length : 0,
  };
}

function readVocab(vocab: unknown): { skills: number; source: string | null } {
  if (!vocab || typeof vocab !== "object") return { skills: 0, source: null };
  const row = vocab as { skills?: unknown[]; source?: string };
  return {
    skills: Array.isArray(row.skills) ? row.skills.length : 0,
    source: typeof row.source === "string" ? row.source : null,
  };
}

function mapApiLog(row: {
  id: string;
  traceId: string | null;
  createdAt: Date;
  operation: string;
  status: string;
  provider: string | null;
  modelId: string | null;
  durationMs: number;
  tokensUsed: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  aiMode: string | null;
  metadata: unknown;
}): PipelineApiLogRow {
  return {
    id: row.id,
    traceId: row.traceId,
    createdAt: row.createdAt.toISOString(),
    operation: row.operation,
    status: row.status,
    provider: row.provider,
    modelId: row.modelId,
    durationMs: row.durationMs,
    tokensUsed: row.tokensUsed,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    aiMode: row.aiMode,
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : null,
  };
}

export async function buildPipelineRunInsight(
  input: BuildPipelineRunInsightInput,
): Promise<PipelineRunView> {
  const traceId =
    input.progress.traceId ?? input.entry.resumeTailor?.enhanceTraceId ?? null;
  const windowStart = new Date(input.entry.savedAt.getTime() - 2 * 60 * 1000);
  const windowEnd = new Date(input.entry.savedAt.getTime() + 25 * 60 * 1000);

  const apiRows = await prisma.apiCallLog.findMany({
    where: {
      userId: input.userId,
      OR: [
        ...(traceId ? [{ traceId }] : []),
        {
          createdAt: { gte: windowStart, lte: windowEnd },
          operation: { startsWith: "ai.enhance" },
        },
      ],
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      traceId: true,
      createdAt: true,
      operation: true,
      status: true,
      provider: true,
      modelId: true,
      durationMs: true,
      tokensUsed: true,
      errorCode: true,
      errorMessage: true,
      aiMode: true,
      metadata: true,
    },
  });

  const seen = new Set<string>();
  const apiLogs = apiRows
    .filter((row) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    })
    .map(mapApiLog);

  const jd = readJdIntel(input.entry.jdIntelligence);
  const vocab = readVocab(input.entry.jdSkillsVocabulary);
  const enhanceMeta =
    input.entry.resumeTailor?.enhanceMeta &&
    typeof input.entry.resumeTailor.enhanceMeta === "object" &&
    !Array.isArray(input.entry.resumeTailor.enhanceMeta)
      ? (input.entry.resumeTailor.enhanceMeta as Record<string, unknown>)
      : null;

  const context: PipelineRunContext = {
    jobId: input.jobId,
    title: input.entry.title,
    company: input.entry.company,
    platform: input.entry.platform,
    status: input.entry.status,
    savedAt: input.entry.savedAt.toISOString(),
    traceId,
    enhanceMeta,
    jdSource: jd.source,
    jdConfidence: jd.confidence,
    jdMustHaveSkills: jd.mustHaveSkills,
    vocabSkills: vocab.skills,
    vocabSource: vocab.source,
  };

  return buildPipelineRunView({ progress: input.progress, context, apiLogs });
}
