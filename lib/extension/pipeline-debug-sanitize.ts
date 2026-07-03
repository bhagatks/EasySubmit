import type { PipelineDebugArtifact } from "@/src/shared/extension/pipeline-debug-artifacts";
import type { ExternalApiDebugExchange } from "@/lib/extension/external-api-debug";

const BLOCKED_KEY =
  /^(email|phone|firstName|lastName|name|rawResume|resumeRaw|jobDescription|coverLetter|authorization|apiKey|token|password|secret)$/i;

const MAX_STRING = 1200;
const MAX_PREVIEW = 600;
const MAX_ARRAY = 30;
const MAX_DEPTH = 6;

function truncate(value: string, max = MAX_STRING): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

export function sanitizePipelineDebugValue(
  value: unknown,
  depth = 0,
): unknown {
  if (value == null) return value;
  if (depth > MAX_DEPTH) return "[truncated]";
  if (typeof value === "string") return truncate(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY)
      .map((item) => sanitizePipelineDebugValue(item, depth + 1));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (BLOCKED_KEY.test(key)) continue;
      out[key] = sanitizePipelineDebugValue(nested, depth + 1);
    }
    return out;
  }
  return undefined;
}

export function sanitizePipelineDebugArtifacts(
  artifacts: PipelineDebugArtifact[] | undefined,
): PipelineDebugArtifact[] | undefined {
  if (!artifacts?.length) return undefined;
  return artifacts.map((artifact) => ({
    ...artifact,
    payload: sanitizePipelineDebugValue(artifact.payload),
  }));
}

export function previewText(value: string, max = MAX_PREVIEW): string {
  return truncate(value, max);
}

export function dataArtifact(
  label: string,
  payload: unknown,
  kind: PipelineDebugArtifact["kind"] = "data",
): PipelineDebugArtifact {
  return { kind, label, payload: sanitizePipelineDebugValue(payload) ?? null };
}

export function flagsArtifact(
  label: string,
  payload: Record<string, unknown>,
): PipelineDebugArtifact {
  return dataArtifact(label, payload, "flags");
}

export function aiRequestArtifact(
  label: string,
  input: { system?: string; user?: string; modelId?: string; pass?: string },
): PipelineDebugArtifact {
  return {
    kind: "ai_request",
    label,
    payload: sanitizePipelineDebugValue({
      pass: input.pass ?? null,
      modelId: input.modelId ?? null,
      systemChars: input.system?.length ?? 0,
      systemPreview: input.system ? previewText(input.system) : null,
      userChars: input.user?.length ?? 0,
      userPreview: input.user ? previewText(input.user, MAX_STRING) : null,
    }),
  };
}

export function aiResponseArtifact(
  label: string,
  input: { text: string; modelId?: string; tokensUsed?: number },
): PipelineDebugArtifact {
  return {
    kind: "ai_response",
    label,
    payload: sanitizePipelineDebugValue({
      modelId: input.modelId ?? null,
      tokensUsed: input.tokensUsed ?? null,
      responseChars: input.text.length,
      responsePreview: previewText(input.text, MAX_STRING),
    }),
  };
}

export function externalRequestArtifact(
  label: string,
  input: { method: string; url: string; headers?: Record<string, string> },
): PipelineDebugArtifact {
  const requestHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(input.headers ?? {})) {
    requestHeaders[key] = /authorization|api[-_]?key|token|secret/i.test(key)
      ? "[redacted]"
      : value;
  }
  return {
    kind: "external_request",
    label,
    payload: {
      method: input.method,
      url: truncate(input.url),
      requestHeaders: Object.keys(requestHeaders).length ? requestHeaders : undefined,
    },
  };
}

export function externalResponseArtifact(
  label: string,
  input: {
    status: number | null;
    ok: boolean;
    body?: unknown;
    error?: string;
  },
): PipelineDebugArtifact {
  return {
    kind: "external_response",
    label,
    payload: sanitizePipelineDebugValue({
      status: input.status,
      ok: input.ok,
      error: input.error ?? null,
      bodyPreview:
        input.body !== undefined ? sanitizePipelineDebugValue(input.body) : null,
    }),
  };
}

export function externalApiArtifactsFromExchanges(
  exchanges: Array<{
    label: string;
    request: ExternalApiDebugExchange["request"];
    response: ExternalApiDebugExchange["response"];
  }>,
): PipelineDebugArtifact[] {
  const artifacts: PipelineDebugArtifact[] = [];
  for (const exchange of exchanges) {
    artifacts.push(
      externalRequestArtifact(`${exchange.label} request`, exchange.request),
      externalResponseArtifact(`${exchange.label} response`, exchange.response),
    );
  }
  return artifacts;
}
