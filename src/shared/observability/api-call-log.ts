import type { ApiCallLogInput } from "@/src/shared/observability/types";
import type { Prisma } from "@/lib/generated/prisma/client";

export const API_CALL_LOG_PREFIX = "[ApiCall]";

const MAX_ERROR_MESSAGE_CHARS = 500;

function truncate(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > MAX_ERROR_MESSAGE_CHARS
    ? `${trimmed.slice(0, MAX_ERROR_MESSAGE_CHARS)}…`
    : trimmed;
}

function sanitizeMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (/api[_-]?key|secret|token|password|authorization/i.test(key)) continue;
    out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function createApiTraceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().slice(0, 8);
  }
  return `a${Date.now().toString(36)}`;
}

export function formatApiCallConsolePayload(input: ApiCallLogInput) {
  return {
    ts: new Date().toISOString(),
    traceId: input.traceId ?? null,
    userId: input.userId ?? null,
    domain: input.domain,
    operation: input.operation,
    provider: input.provider ?? null,
    modelId: input.modelId ?? null,
    status: input.status,
    httpStatus: input.httpStatus ?? null,
    durationMs: input.durationMs,
    tokensUsed: input.tokensUsed ?? null,
    estimatedCost: input.estimatedCost ?? null,
    aiMode: input.aiMode ?? null,
    keySlot: input.keySlot ?? null,
    keyLabel: input.keyLabel ?? null,
    keySource: input.keySource ?? null,
    billingMode: input.billingMode ?? null,
    errorCode: input.errorCode ?? null,
    ...(input.metadata ? { metadata: sanitizeMetadata(input.metadata) } : {}),
  };
}

/** Console + async Postgres persist. Server-only persistence (no-op on client). */
export function logApiCall(input: ApiCallLogInput): void {
  console.log(API_CALL_LOG_PREFIX, formatApiCallConsolePayload(input));

  if (typeof window !== "undefined") return;

  void persistApiCallLog(input).catch((err) => {
    console.error(API_CALL_LOG_PREFIX, {
      event: "persist.failed",
      operation: input.operation,
      message: err instanceof Error ? err.message : String(err),
    });
  });
}

/** Awaitable persist — use when the caller needs confirmation (e.g. batch jobs). */
export async function persistApiCallLog(input: ApiCallLogInput): Promise<string> {
  const { prisma } = await import("@/lib/prisma");

  const row = await prisma.apiCallLog.create({
    data: {
      traceId: input.traceId?.trim() || null,
      userId: input.userId?.trim() || null,
      domain: input.domain,
      operation: input.operation,
      provider: input.provider?.trim() || null,
      modelId: input.modelId?.trim() || null,
      status: input.status,
      httpStatus:
        typeof input.httpStatus === "number" && Number.isFinite(input.httpStatus)
          ? Math.round(input.httpStatus)
          : null,
      durationMs: Math.max(0, Math.round(input.durationMs)),
      tokensUsed:
        typeof input.tokensUsed === "number" && Number.isFinite(input.tokensUsed)
          ? Math.max(0, Math.round(input.tokensUsed))
          : null,
      estimatedCost:
        typeof input.estimatedCost === "number" && Number.isFinite(input.estimatedCost)
          ? Math.max(0, input.estimatedCost)
          : null,
      aiMode: input.aiMode ?? null,
      keySlot:
        typeof input.keySlot === "number" && Number.isFinite(input.keySlot)
          ? Math.round(input.keySlot)
          : null,
      keyLabel: input.keyLabel?.trim() || null,
      keySource: input.keySource ?? null,
      billingMode: input.billingMode?.trim() || null,
      errorCode: input.errorCode?.trim() || null,
      errorMessage: truncate(input.errorMessage),
      metadata: (sanitizeMetadata(input.metadata) ?? undefined) as
        | Prisma.InputJsonValue
        | undefined,
    },
    select: { id: true },
  });

  return row.id;
}

type TimedApiCallInput = Omit<ApiCallLogInput, "durationMs" | "status"> & {
  durationMs?: number;
  status?: ApiCallLogInput["status"];
};

/**
 * Wrap an async API call — logs success/error with elapsed time.
 * Does not throw; rethrows after logging on failure.
 */
export async function withApiCallLog<T>(
  base: TimedApiCallInput,
  fn: () => Promise<T>,
  mapSuccess?: (result: T) => Partial<ApiCallLogInput>,
  mapError?: (error: unknown) => Partial<ApiCallLogInput>,
): Promise<T> {
  const startedAt = Date.now();
  try {
    const result = await fn();
    logApiCall({
      ...base,
      status: "success",
      durationMs: Date.now() - startedAt,
      ...(mapSuccess?.(result) ?? {}),
    });
    return result;
  } catch (error) {
    const mapped = mapError?.(error) ?? {};
    const message = error instanceof Error ? error.message : String(error);
    const status =
      mapped.status ??
      (/timeout/i.test(message) ? "timeout" : "error");
    logApiCall({
      ...base,
      status,
      durationMs: Date.now() - startedAt,
      errorMessage: mapped.errorMessage ?? message,
      errorCode: mapped.errorCode ?? null,
      httpStatus:
        mapped.httpStatus ??
        (typeof (error as { status?: number }).status === "number"
          ? (error as { status: number }).status
          : null),
      ...mapped,
    });
    throw error;
  }
}
