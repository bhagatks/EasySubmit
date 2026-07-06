import type { ModelHealthEntry, ModelTier } from "@/lib/ai/model-health/types";
import { isCooldownActive } from "@/lib/ai/model-health/model-candidate-ranking";

export function scoreModelEntry(entry: ModelHealthEntry, taskTier: ModelTier): number {
  let score = 0;

  if (entry.probes.structured) score += 100;
  if (entry.probes.text) score += 10;

  if (entry.tier === taskTier) {
    score += 50;
  } else {
    score -= 20;
  }

  const cost = entry.inputCostPer1M ?? 999;
  score += Math.max(0, 30 - Math.min(30, cost));

  if (entry.lastLatencyMs != null && entry.lastLatencyMs > 0) {
    score -= Math.floor(entry.lastLatencyMs / 100);
  }

  if (entry.sunsetHint) score -= 500;
  if (entry.status === "failed") score -= 200;
  if (isCooldownActive(entry.cooldownUntil)) score -= 300;

  return score;
}

export function rankModelIdsForTask(
  modelIds: string[],
  entries: Record<string, ModelHealthEntry>,
  taskTier: ModelTier,
): string[] {
  return [...modelIds].sort((leftId, rightId) => {
    const left = entries[leftId];
    const right = entries[rightId];
    const leftScore = left ? scoreModelEntry(left, taskTier) : -1000;
    const rightScore = right ? scoreModelEntry(right, taskTier) : -1000;
    return rightScore - leftScore;
  });
}

export function selectModelsToProbe(
  modelIds: string[],
  classify: (modelId: string) => ModelTier,
  inputCost: (modelId: string) => number,
  maxCount = 6,
  priorityIds: string[] = [],
): string[] {
  const known = new Set(modelIds);
  const classified = modelIds.map((id) => ({
    id,
    tier: classify(id),
    cost: inputCost(id),
  }));

  const cheap = classified
    .filter((row) => row.tier === "cheap")
    .sort((a, b) => a.cost - b.cost);
  const flagship = classified
    .filter((row) => row.tier === "flagship")
    .sort((a, b) => b.cost - a.cost);

  const selected: string[] = [];
  for (const id of priorityIds) {
    if (known.has(id) && !selected.includes(id)) selected.push(id);
  }
  for (const row of cheap) {
    if (selected.length >= maxCount) break;
    if (!selected.includes(row.id)) selected.push(row.id);
  }
  for (const row of flagship) {
    if (selected.length >= maxCount) break;
    if (!selected.includes(row.id)) selected.push(row.id);
  }

  return selected.slice(0, maxCount);
}
