export type AnalyticsEnvironment = "dev" | "prod";

export type AnalyticsConfig = {
  enabled: boolean;
  key: string;
  host: string;
  environment: AnalyticsEnvironment;
  internalUserIds: Set<string>;
  autocapture: boolean;
};

function readEnv(key: string): string | undefined {
  if (typeof process !== "undefined" && process.env?.[key]) {
    return process.env[key];
  }
  return undefined;
}

function parseInternalUserIds(raw: string | undefined): Set<string> {
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

export function getAnalyticsConfig(): AnalyticsConfig {
  const enabled = readEnv("NEXT_PUBLIC_ANALYTICS_ENABLED") === "true";
  const key = readEnv("NEXT_PUBLIC_POSTHOG_KEY") ?? "";
  const host = readEnv("NEXT_PUBLIC_POSTHOG_HOST") ?? "https://us.i.posthog.com";
  const envRaw = readEnv("NEXT_PUBLIC_ANALYTICS_ENV");
  const environment: AnalyticsEnvironment = envRaw === "prod" ? "prod" : "dev";

  return {
    enabled,
    key,
    host,
    environment,
    internalUserIds: parseInternalUserIds(readEnv("NEXT_PUBLIC_ANALYTICS_INTERNAL_USER_IDS")),
    autocapture: readEnv("NEXT_PUBLIC_POSTHOG_AUTOCAPTURE") === "true",
  };
}

export function isLocalhostHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/** True when analytics env is dev (PostHog project 488025) — never send journey debug to prod. */
export function isDevAnalyticsEnvironment(): boolean {
  return getAnalyticsConfig().environment !== "prod";
}

/** Verbose `[EnhanceAI]` console + journey debug — local/dev only, not production deploys. */
export function isEnhanceJourneyDebugEnabled(): boolean {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
    return false;
  }
  return isDevAnalyticsEnvironment();
}
