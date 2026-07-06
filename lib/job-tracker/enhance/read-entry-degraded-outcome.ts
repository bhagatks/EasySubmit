import type { AiEnhanceOutcome, AiEnhanceOutcomeAction } from "@/lib/ai/call-kernel/types";
import { resolveEnhanceOutcome } from "@/lib/ai/enhance-failure-messages";
import type { EnhanceSessionMeta } from "@/lib/job-tracker/enhance/enhance-brief";
import { prisma } from "@/lib/prisma";
import { logEnhance } from "@/src/lib/ai/engine/enhance-logger";

export type EntryDegradedEnhanceOutcome = Pick<
  AiEnhanceOutcome,
  "aiAttempted" | "aiSucceeded" | "warning" | "action" | "actionHref" | "aiBlockCode"
>;

function readEnhanceMeta(raw: unknown): EnhanceSessionMeta | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as EnhanceSessionMeta;
}

function readMetadataWarning(metadata: Record<string, unknown> | null): string | null {
  const warning = metadata?.pipelineAiWarning;
  return typeof warning === "string" && warning.trim() ? warning.trim() : null;
}

/** Load persisted degraded AI outcome for a job entry — null when AI succeeded or never attempted with allowAi. */
export async function readEntryDegradedEnhanceOutcome(
  userId: string,
  entryId: string,
): Promise<EntryDegradedEnhanceOutcome | null> {
  logEnhance("server", "degraded_outcome.read.start", { userId, entryId });

  const row = await prisma.jobTrackerEntry.findFirst({
    where: { id: entryId, userId },
    select: {
      metadata: true,
      resumeTailor: { select: { enhanceMeta: true } },
    },
  });

  if (!row) {
    logEnhance("server", "degraded_outcome.read.fail", {
      userId,
      entryId,
      reason: "not_found",
    });
    return null;
  }

  const metadata =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : null;
  const enhanceMeta = readEnhanceMeta(row.resumeTailor?.enhanceMeta ?? null);
  const metadataWarning = readMetadataWarning(metadata);

  if (enhanceMeta?.aiSucceeded === true) {
    logEnhance("server", "degraded_outcome.read.done", {
      userId,
      entryId,
      degraded: false,
      reason: "ai_succeeded",
    });
    return null;
  }

  const aiAttempted = enhanceMeta?.aiAttempted === true;
  const warning = metadataWarning ?? enhanceMeta?.warning?.trim() ?? null;

  if (!warning && !aiAttempted) {
    logEnhance("server", "degraded_outcome.read.done", {
      userId,
      entryId,
      degraded: false,
      reason: "no_degraded_signal",
    });
    return null;
  }

  const lastClassification =
    enhanceMeta?.aiCallLedger?.[enhanceMeta.aiCallLedger.length - 1]?.classification;

  const resolved = resolveEnhanceOutcome({
    allowAi: true,
    aiAttempted,
    aiSucceeded: false,
    engineMode: enhanceMeta?.engineMode ?? "deterministic",
    aiBlockCode: enhanceMeta?.aiBlockCode ?? null,
    lastClassification,
  });

  const outcome: EntryDegradedEnhanceOutcome = {
    aiAttempted,
    aiSucceeded: false,
    warning: warning ?? resolved.warning ?? null,
    action: resolved.action ?? null,
    actionHref: resolved.actionHref ?? null,
    aiBlockCode: enhanceMeta?.aiBlockCode ?? resolved.aiBlockCode ?? null,
  };

  logEnhance("server", "degraded_outcome.read.done", {
    userId,
    entryId,
    degraded: true,
    aiAttempted: outcome.aiAttempted,
    aiBlockCode: outcome.aiBlockCode ?? null,
  });

  return outcome;
}

export function degradedOutcomeFromEnhanceResult(input: {
  aiAttempted?: boolean;
  aiSucceeded?: boolean;
  warning?: string | null;
  action?: AiEnhanceOutcomeAction;
  actionHref?: string | null;
  aiBlockCode?: string | null;
}): EntryDegradedEnhanceOutcome | null {
  if (input.aiSucceeded === true) return null;
  if (!input.warning?.trim() && !(input.aiAttempted && input.aiSucceeded === false)) {
    return null;
  }

  return {
    aiAttempted: input.aiAttempted === true,
    aiSucceeded: false,
    warning: input.warning?.trim() ?? null,
    action: input.action ?? null,
    actionHref: input.actionHref ?? null,
    aiBlockCode: input.aiBlockCode ?? null,
  };
}
