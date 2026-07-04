import type { PipelineDebugArtifact } from "@/src/shared/extension/pipeline-debug-artifacts";
import type { PipelineDebugStep } from "@/src/shared/extension/pipeline-debug-types";

export type PipelineApiExchange = {
  label: string;
  request: PipelineDebugArtifact | null;
  response: PipelineDebugArtifact | null;
};

export type PipelineStepViewModel = {
  outcomeDetail: string | null;
  outcomeMeta: Array<{ key: string; value: string }>;
  outcomeArtifacts: PipelineDebugArtifact[];
  apiExchanges: PipelineApiExchange[];
  otherArtifacts: PipelineDebugArtifact[];
};

const API_REQUEST_KINDS = new Set(["ai_request", "external_request"]);
const API_RESPONSE_KINDS = new Set(["ai_response", "external_response"]);
const OUTCOME_KINDS = new Set(["output", "data", "input", "flags"]);

function formatMetaValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.length > 6 ? `[${value.length} items]` : value.join(", ");
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function exchangeKey(label: string): string {
  return label.replace(/\s+(request|response)$/i, "").trim().toLowerCase();
}

/** Pair request/response artifacts for side-by-side QA display. */
export function pairPipelineApiArtifacts(
  artifacts: PipelineDebugArtifact[] | undefined,
): PipelineApiExchange[] {
  if (!artifacts?.length) return [];

  const byKey = new Map<string, PipelineApiExchange>();

  for (const artifact of artifacts) {
    if (API_REQUEST_KINDS.has(artifact.kind)) {
      const key = exchangeKey(artifact.label);
      const row = byKey.get(key) ?? { label: key, request: null, response: null };
      row.request = artifact;
      if (!byKey.has(key)) byKey.set(key, row);
    } else if (API_RESPONSE_KINDS.has(artifact.kind)) {
      const key = exchangeKey(artifact.label);
      const row = byKey.get(key) ?? { label: artifact.label.replace(/\s+response$/i, ""), request: null, response: null };
      row.response = artifact;
      byKey.set(key, row);
    }
  }

  return Array.from(byKey.values());
}

export function buildPipelineStepViewModel(step: PipelineDebugStep): PipelineStepViewModel {
  const artifacts = step.artifacts ?? [];
  const apiExchanges = pairPipelineApiArtifacts(artifacts);
  const apiArtifactLabels = new Set(
    apiExchanges.flatMap((row) => [row.request?.label, row.response?.label].filter(Boolean)),
  );

  const outcomeArtifacts = artifacts.filter(
    (artifact) => OUTCOME_KINDS.has(artifact.kind) && !apiArtifactLabels.has(artifact.label),
  );
  const otherArtifacts = artifacts.filter(
    (artifact) =>
      !OUTCOME_KINDS.has(artifact.kind) &&
      !API_REQUEST_KINDS.has(artifact.kind) &&
      !API_RESPONSE_KINDS.has(artifact.kind),
  );

  const outcomeMeta = step.meta
    ? Object.entries(step.meta).map(([key, value]) => ({
        key,
        value: formatMetaValue(value),
      }))
    : [];

  return {
    outcomeDetail: step.detail?.trim() || null,
    outcomeMeta,
    outcomeArtifacts,
    apiExchanges,
    otherArtifacts,
  };
}

export function summarizeApiExchange(exchange: PipelineApiExchange): string | null {
  const req = exchange.request?.payload;
  const res = exchange.response?.payload;
  if (!req && !res) return null;

  const parts: string[] = [];
  if (req && typeof req === "object" && req !== null) {
    const row = req as Record<string, unknown>;
    if (row.modelId) parts.push(String(row.modelId));
    if (row.method && row.url) parts.push(`${row.method} ${row.url}`);
  }
  if (res && typeof res === "object" && res !== null) {
    const row = res as Record<string, unknown>;
    if (row.tokensUsed != null) parts.push(`${row.tokensUsed} tokens`);
    if (row.status != null) parts.push(`HTTP ${row.status}`);
  }
  return parts.length ? parts.join(" · ") : null;
}
