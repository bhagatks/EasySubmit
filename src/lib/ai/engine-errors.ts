/**
 * Structured engine errors for Ignition Gate terminal output (JetBrains Mono).
 */

export const ENGINE_ERRORS = {
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_PROVIDER: "INVALID_PROVIDER",
  MISSING_KEY: "MISSING_KEY",
  INVALID_KEY: "INVALID_KEY",
  INSUFFICIENT_QUOTA: "INSUFFICIENT_QUOTA",
  FORBIDDEN: "FORBIDDEN",
  RATE_LIMITED: "RATE_LIMITED",
  NO_CAREER_MODELS: "NO_CAREER_MODELS",
  NETWORK_ERROR: "NETWORK_ERROR",
  PROVIDER_ERROR: "PROVIDER_ERROR",
  VAULT_NOT_CONFIGURED: "VAULT_NOT_CONFIGURED",
} as const;

export type EngineErrorCode = (typeof ENGINE_ERRORS)[keyof typeof ENGINE_ERRORS];

export type EngineTerminalError = {
  code: EngineErrorCode;
  prefix: "[ERR]";
  message: string;
  /** Pre-formatted monospaced terminal line for Ignition Gate UI. */
  terminalLine: string;
};

const ERROR_MESSAGES: Record<EngineErrorCode, string> = {
  UNAUTHORIZED: "Session expired — sign in again to continue.",
  INVALID_PROVIDER: "Unsupported provider. Use OpenAI or Anthropic.",
  MISSING_KEY: "API key is required before engine handshake.",
  INVALID_KEY: "Provider rejected this API key (401).",
  INSUFFICIENT_QUOTA: "Key is valid but quota is exhausted — add billing or a new key.",
  FORBIDDEN: "Key lacks permission to list models (403).",
  RATE_LIMITED: "Provider rate limit hit — retry in a moment.",
  NO_CAREER_MODELS:
    "Key is valid but no career-grade models are accessible (gpt-4o / claude-3-5-sonnet tier).",
  NETWORK_ERROR: "Could not reach the provider — check network and retry.",
  PROVIDER_ERROR: "Provider returned an unexpected error during handshake.",
  VAULT_NOT_CONFIGURED:
    "Supabase Vault is not installed — run `npx prisma migrate deploy` against this database.",
};

export function formatEngineTerminalError(
  code: EngineErrorCode,
  detail?: string | null,
): EngineTerminalError {
  const message = detail?.trim() || ERROR_MESSAGES[code];
  const terminalLine = `[ERR]  ${code.padEnd(20)} |  ${message}`;

  return {
    code,
    prefix: "[ERR]",
    message,
    terminalLine,
  };
}

export function isEngineErrorCode(value: string): value is EngineErrorCode {
  return Object.values(ENGINE_ERRORS).includes(value as EngineErrorCode);
}

/** Map loose provider / HTTP codes into ENGINE_ERRORS. */
export function mapProviderFailureToEngineError(
  code: string | undefined,
  message?: string,
): EngineTerminalError {
  switch (code) {
    case "invalid_key":
    case "unauthorized":
      return formatEngineTerminalError(ENGINE_ERRORS.INVALID_KEY, message);
    case "forbidden":
      return formatEngineTerminalError(ENGINE_ERRORS.FORBIDDEN, message);
    case "rate_limited":
      return formatEngineTerminalError(ENGINE_ERRORS.RATE_LIMITED, message);
    case "insufficient_quota":
      return formatEngineTerminalError(ENGINE_ERRORS.INSUFFICIENT_QUOTA, message);
    case "network_error":
      return formatEngineTerminalError(ENGINE_ERRORS.NETWORK_ERROR, message);
    case "no_career_models":
      return formatEngineTerminalError(ENGINE_ERRORS.NO_CAREER_MODELS, message);
    case "missing_key":
      return formatEngineTerminalError(ENGINE_ERRORS.MISSING_KEY, message);
    case "invalid_provider":
      return formatEngineTerminalError(ENGINE_ERRORS.INVALID_PROVIDER, message);
    default:
      return formatEngineTerminalError(ENGINE_ERRORS.PROVIDER_ERROR, message);
  }
}
