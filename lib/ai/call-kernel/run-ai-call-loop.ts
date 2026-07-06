import { classifyAiError, classificationToBlockCode } from "@/lib/ai/call-kernel/classify-ai-error";
import { classifyAiOutput, outputClassificationToAiCall } from "@/lib/ai/call-kernel/classify-ai-output";
import {
  applyAiCallDecision,
  decideAiNextStep,
  decisionActionLabel,
  type AiCallDecision,
} from "@/lib/ai/call-kernel/decide-ai-next-step";
import type {
  AiCallClassification,
  AiCallExecuteResult,
  AiCallLedgerEntry,
  AiCallTarget,
} from "@/lib/ai/call-kernel/types";
import { logEnhance } from "@/src/lib/ai/engine/enhance-logger";

const MAX_LOOP_ITERATIONS = 8;
const RATE_LIMIT_RETRY_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type RunAiCallLoopInput = {
  traceId: string;
  userId?: string | null;
  initialTarget: AiCallTarget;
  systemAvailable: boolean;
  execute: (target: AiCallTarget) => Promise<AiCallExecuteResult>;
  /** Called after HTTP success and parse validation — use for deferred API logs. */
  onValidatedSuccess?: (input: {
    target: AiCallTarget;
    result: AiCallExecuteResult;
    entry: AiCallLedgerEntry;
  }) => void;
};

export type RunAiCallLoopResult = {
  text: string;
  tokensUsed: number;
  modelId: string;
  estimatedCost: number;
  slot?: number;
  ledger: AiCallLedgerEntry[];
  missionFailed: boolean;
  failureCode?: string;
  failureMessage?: string;
};

function ledgerEntry(input: {
  attempt: number;
  target: AiCallTarget;
  classification: AiCallClassification;
  decision: AiCallDecision;
  durationMs: number;
  result?: AiCallExecuteResult;
  errorCode?: string;
  errorMessage?: string;
}): AiCallLedgerEntry {
  return {
    attempt: input.attempt,
    executor: input.target.executor,
    routeMode: input.target.routeMode,
    slot: input.target.slot,
    provider: input.result?.provider,
    modelId: input.result?.modelId,
    classification: input.classification,
    decision: decisionActionLabel(input.decision),
    durationMs: input.durationMs,
    tokensUsed: input.result?.tokensUsed,
    errorCode: input.errorCode,
    errorMessage: input.errorMessage,
  };
}

export async function runAiCallLoop(input: RunAiCallLoopInput): Promise<RunAiCallLoopResult> {
  const ledger: AiCallLedgerEntry[] = [];
  let target = input.initialTarget;
  let attempt = 0;
  let lastResult: AiCallExecuteResult | undefined;
  let totalTokens = 0;
  let totalCost = 0;

  logEnhance("engine", "ai.call.loop.start", {
    traceId: input.traceId,
    userId: input.userId ?? null,
    executor: target.executor,
    routeMode: target.routeMode,
    slot: target.slot ?? null,
    systemAvailable: input.systemAvailable,
  });

  while (attempt < MAX_LOOP_ITERATIONS) {
    attempt += 1;
    const startedAt = Date.now();

    logEnhance("engine", "ai.call.start", {
      traceId: input.traceId,
      userId: input.userId ?? null,
      attempt,
      executor: target.executor,
      routeMode: target.routeMode,
      slot: target.slot ?? null,
      attemptOnTarget: target.attemptOnTarget,
    });

    let result: AiCallExecuteResult;
    let classification: AiCallClassification;
    let errorCode: string | undefined;
    let errorMessage: string | undefined;

    try {
      result = await input.execute(target);
      lastResult = result;
      totalTokens += result.tokensUsed;
      totalCost += result.estimatedCost;

      const output = classifyAiOutput(result.text);
      classification = outputClassificationToAiCall(output);
    } catch (err) {
      const classified = classifyAiError(err, target.routeMode);
      classification = classified.classification;
      errorCode = classified.code;
      errorMessage = classified.message;
      result = {
        text: "",
        tokensUsed: 0,
        modelId: target.routeMode === "system" ? "system" : "customer",
        estimatedCost: 0,
        slot: target.slot,
        durationMs: Date.now() - startedAt,
      };
    }

    const decision = decideAiNextStep({
      target,
      classification,
      systemAvailable: input.systemAvailable,
    });

    const entry = ledgerEntry({
      attempt,
      target,
      classification,
      decision,
      durationMs: Date.now() - startedAt,
      result: classification === "success" ? result : lastResult,
      errorCode,
      errorMessage,
    });
    ledger.push(entry);

    logEnhance("engine", "ai.call.classified", {
      traceId: input.traceId,
      attempt,
      classification,
      executor: target.executor,
      slot: target.slot ?? null,
      errorCode: errorCode ?? null,
    });

    logEnhance("engine", "ai.call.decision", {
      traceId: input.traceId,
      attempt,
      decision: decision.action,
      nextSlot: "slot" in decision ? decision.slot : null,
    });

    if (decision.action === "mission_success") {
      input.onValidatedSuccess?.({ target, result, entry });
      logEnhance("engine", "ai.call.done", {
        traceId: input.traceId,
        attempt,
        outcome: "mission_success",
        modelId: result.modelId,
        tokensUsed: totalTokens,
        ledgerEntries: ledger.length,
      });
      return {
        text: result.text,
        tokensUsed: totalTokens,
        modelId: result.modelId,
        estimatedCost: totalCost,
        slot: result.slot,
        ledger,
        missionFailed: false,
      };
    }

    if (decision.action === "mission_failed") {
      logEnhance("engine", "ai.call.done", {
        traceId: input.traceId,
        attempt,
        outcome: "mission_failed",
        failureCode: decision.code,
        ledgerEntries: ledger.length,
      });
      return {
        text: "",
        tokensUsed: totalTokens,
        modelId: lastResult?.modelId ?? "",
        estimatedCost: totalCost,
        slot: lastResult?.slot,
        ledger,
        missionFailed: true,
        failureCode: decision.code,
        failureMessage: decision.message,
      };
    }

    if (
      decision.action === "retry_same" &&
      (classification === "rate_limited" || classification === "transient") &&
      process.env.VITEST !== "true"
    ) {
      await sleep(RATE_LIMIT_RETRY_DELAY_MS);
    }

    target = applyAiCallDecision(target, decision);
  }

  const fallbackCode = classificationToBlockCode(
    ledger[ledger.length - 1]?.classification ?? "provider_error",
  );

  logEnhance("engine", "ai.call.done", {
    traceId: input.traceId,
    attempt,
    outcome: "mission_failed",
    failureCode: fallbackCode,
    reason: "max_iterations",
    ledgerEntries: ledger.length,
  });

  return {
    text: "",
    tokensUsed: totalTokens,
    modelId: lastResult?.modelId ?? "",
    estimatedCost: totalCost,
    slot: lastResult?.slot,
    ledger,
    missionFailed: true,
    failureCode: fallbackCode,
    failureMessage: "AI call exceeded maximum retry attempts.",
  };
}
