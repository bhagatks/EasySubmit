import type { ProviderModelHealth } from "@/lib/ai/model-health/types";

export function parseProviderModelHealth(raw: unknown): ProviderModelHealth | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.checkedAt !== "string") return null;
  if (!Array.isArray(row.rankedModels)) return null;
  if (typeof row.discoveredCount !== "number") return null;
  if (!row.entries || typeof row.entries !== "object" || Array.isArray(row.entries)) {
    return null;
  }

  return {
    checkedAt: row.checkedAt,
    primaryModelId: typeof row.primaryModelId === "string" ? row.primaryModelId : null,
    rankedModels: row.rankedModels.filter((value): value is string => typeof value === "string"),
    discoveredCount: row.discoveredCount,
    entries: row.entries as ProviderModelHealth["entries"],
  };
}
