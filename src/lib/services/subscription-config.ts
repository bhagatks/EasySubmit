export const SUBSCRIPTION_CONFIG_KEY = "subscriptions";

export const SUBSCRIPTION_PLAN_IDS = ["free", "weekly", "monthly", "yearly"] as const;
export type SubscriptionPlanId = (typeof SUBSCRIPTION_PLAN_IDS)[number];

export const SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due", "canceled"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** Returns true when the user has an active paid subscription. */
export function isSubscribed(plan: string, status: string | null): boolean {
  return (
    plan !== "free" &&
    (status === "active" || status === "trialing")
  );
}

export type SubscriptionPlanConfig = {
  price: number;
  dailyEnhancements: number;
  stripePriceId: string;
};

export type PaidPlanId = "weekly" | "monthly" | "yearly";

export type SubscriptionConfig = {
  /** When false, paid plan CTAs are hidden and checkout is blocked. */
  enabled: boolean;
  currency: string;
  plans: Record<PaidPlanId, SubscriptionPlanConfig>;
};

export const SUBSCRIPTION_CONFIG_DEFAULTS: SubscriptionConfig = {
  enabled: false,
  currency: "usd",
  plans: {
    weekly: {
      price: 2.99,
      dailyEnhancements: 25,
      stripePriceId: "",
    },
    monthly: {
      price: 7.99,
      dailyEnhancements: 25,
      stripePriceId: "",
    },
    yearly: {
      price: 59.99,
      dailyEnhancements: 25,
      stripePriceId: "",
    },
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePositiveFloat(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return value;
}

function parsePositiveInt(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.round(value);
}

function parsePlan(
  value: unknown,
  fallback: SubscriptionPlanConfig,
): SubscriptionPlanConfig {
  if (!isRecord(value)) return fallback;
  return {
    price: parsePositiveFloat(value.price, fallback.price),
    dailyEnhancements: parsePositiveInt(value.dailyEnhancements, fallback.dailyEnhancements),
    stripePriceId: typeof value.stripePriceId === "string" ? value.stripePriceId : fallback.stripePriceId,
  };
}

export function parseSubscriptionConfig(value: unknown): SubscriptionConfig {
  if (!isRecord(value)) return SUBSCRIPTION_CONFIG_DEFAULTS;

  const plansRaw = isRecord(value.plans) ? value.plans : {};
  const d = SUBSCRIPTION_CONFIG_DEFAULTS;

  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : d.enabled,
    currency: typeof value.currency === "string" && value.currency.trim()
      ? value.currency.trim()
      : d.currency,
    plans: {
      weekly: parsePlan(plansRaw.weekly, d.plans.weekly),
      monthly: parsePlan(plansRaw.monthly, d.plans.monthly),
      yearly: parsePlan(plansRaw.yearly, d.plans.yearly),
    },
  };
}
