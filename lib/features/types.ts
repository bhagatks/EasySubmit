export type FeatureSurface = "onboarding" | "job_apply" | "resume" | "extension";

export type FeatureName = "enhance" | "subscription";

// ─── Enhance ─────────────────────────────────────────────────────────────────

export type EnhanceOffReason =
  | "globally_disabled"
  | "feature_disabled"
  | "user_disabled"
  | "no_key"
  | "pool_down"
  | "quota_exceeded";

export type EnhanceFeatureResolution = {
  /** Baseline enhance always available when auth passes. */
  baselineAvailable: true;
  /** Whether Phase 3 AI may run. */
  aiAvailable: boolean;
  /** @deprecated Use aiAvailable — kept for backward compat. */
  available: boolean;
  reason?: EnhanceOffReason;
  /** Which AI key path runs. Null when available is false. */
  mode: "customer" | "system" | null;
  /** Populated only when mode === "customer". */
  vaultKeyId: string | null;
  provider: string | null;
  modelId: string | null;
  quota: {
    used: number;
    limit: number;
    unlimited: boolean;
  };
  /** Deterministic engine can always run as a substitute. */
  fallbackAvailable: true;
};

// ─── Subscription ─────────────────────────────────────────────────────────────

export type SubscriptionFeatureResolution = {
  plan: string;
  status: string | null;
  isSubscribed: boolean;
  /** Whether to surface an upgrade nudge on this surface. */
  showUpgradeNudge: boolean;
  limits: {
    dailyEnhancements: number;
    unlimited: boolean;
  };
  canUpgrade: boolean;
};

// ─── Registry return types ────────────────────────────────────────────────────

export type FeatureResolutionMap = {
  enhance: EnhanceFeatureResolution;
  subscription: SubscriptionFeatureResolution;
};
