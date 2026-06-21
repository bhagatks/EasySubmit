export type ApiCallDomain = "ai" | "vault" | "auth" | "external";

export type ApiCallStatus = "success" | "error" | "timeout";

export type ApiCallAiMode = "customer" | "system";

export type ApiCallKeySource = "vault" | "env";

export type ApiCallLogInput = {
  traceId?: string | null;
  userId?: string | null;
  domain: ApiCallDomain;
  operation: string;
  provider?: string | null;
  modelId?: string | null;
  status: ApiCallStatus;
  httpStatus?: number | null;
  durationMs: number;
  tokensUsed?: number | null;
  estimatedCost?: number | null;
  aiMode?: ApiCallAiMode | null;
  keySlot?: number | null;
  keyLabel?: string | null;
  keySource?: ApiCallKeySource | null;
  billingMode?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type ApiCallLogContext = {
  traceId?: string | null;
  userId?: string | null;
};
