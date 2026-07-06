import type { HandshakeProvider } from "@/src/lib/config/career-grade-models";

export type ModelTier = "cheap" | "flagship";

export type ByokTaskTier = ModelTier;

export type ModelProbeResult = {
  text: boolean;
  structured: boolean;
  error?: string | null;
};

export type ModelHealthEntry = {
  modelId: string;
  status: "healthy" | "failed";
  lastCheckedAt: string;
  lastError?: string | null;
  cooldownUntil?: string | null;
  probes: ModelProbeResult;
  tier?: ModelTier;
  inputCostPer1M?: number;
  lastLatencyMs?: number;
  sunsetHint?: boolean;
};

export type ProviderModelHealth = {
  checkedAt: string;
  primaryModelId: string | null;
  rankedModels: string[];
  discoveredCount: number;
  entries: Record<string, ModelHealthEntry>;
};

export type RefreshProviderModelHealthInput = {
  userId: string;
  provider: HandshakeProvider;
  apiKey: string;
  customEndpointUrl?: string | null;
  traceId?: string;
};

export type ResolveModelCandidatesInput = {
  userId: string;
  provider: HandshakeProvider;
  preferredModelId?: string | null;
};

export type ResolvedModelCandidates = {
  primaryModelId: string;
  rankedModels: string[];
  source: "health" | "defaults";
  healthCheckedAt: string | null;
};
