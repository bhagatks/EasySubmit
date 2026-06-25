export type EnhanceProviderErrorCode =
  | "provider_error"
  | "rate_limited"
  | "insufficient_quota"
  | "invalid_response";

export type MapEnhanceProviderErrorInput = {
  aiMode?: "customer" | "system";
};

export type MappedEnhanceProviderError = {
  code: EnhanceProviderErrorCode;
  userMessage: string;
  retryAfterSec?: number;
  modelId?: string;
  /** Full provider message for operator logs only. */
  rawMessage: string;
};

function extractRawMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/** Pull nested "Last error:" text from AI SDK retry wrapper messages. */
function unwrapRetryMessage(message: string): string {
  const lastErrorIdx = message.lastIndexOf("Last error:");
  if (lastErrorIdx === -1) return message;
  return message.slice(lastErrorIdx + "Last error:".length).trim();
}

export function parseRetryAfterSeconds(message: string): number | undefined {
  const match = message.match(/retry in (\d+(?:\.\d+)?)\s*s/i);
  if (!match?.[1]) return undefined;
  const seconds = Number.parseFloat(match[1]);
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
  return Math.ceil(seconds);
}

export function parseModelFromProviderMessage(message: string): string | undefined {
  const match = message.match(/model:\s*([^\n,]+)/i);
  return match?.[1]?.trim();
}

export function mapEnhanceProviderError(
  err: unknown,
  input: MapEnhanceProviderErrorInput = {},
): MappedEnhanceProviderError {
  const rawMessage = extractRawMessage(err);
  const coreMessage = unwrapRetryMessage(rawMessage);
  const retryAfterSec = parseRetryAfterSeconds(coreMessage);
  const modelId = parseModelFromProviderMessage(coreMessage);
  const isQuota =
    /quota exceeded|exceeded your current quota|insufficient.*quota|free_tier|spending cap|billing details/i.test(
      coreMessage,
    );
  const isRateLimit =
    !isQuota &&
    (/rate.?limit|too many requests|\b429\b/i.test(coreMessage) ||
      Boolean(retryAfterSec));

  if (isQuota) {
    const retryHint = retryAfterSec
      ? ` Try again in about ${retryAfterSec} seconds.`
      : " Try again later.";
    const userMessage =
      input.aiMode === "system"
        ? `EasySubmit's shared AI hit Google's Gemini quota${modelId ? ` (${modelId})` : ""}.${retryHint} For unlimited use, add your own API key in AI Keys.`
        : `Your API key hit its Gemini quota${modelId ? ` (${modelId})` : ""}.${retryHint} Check billing in Google AI Studio or switch providers in AI Keys.`;

    return {
      code: "insufficient_quota",
      userMessage,
      retryAfterSec,
      modelId,
      rawMessage,
    };
  }

  if (isRateLimit) {
    const userMessage = retryAfterSec
      ? `AI rate limit reached — wait about ${retryAfterSec} seconds and try again.`
      : "AI rate limit reached — wait a moment and try again.";

    return {
      code: "rate_limited",
      userMessage,
      retryAfterSec,
      modelId,
      rawMessage,
    };
  }

  if (/invalid.?key|api.?key|unauthorized|401|permission denied/i.test(coreMessage)) {
    return {
      code: "provider_error",
      userMessage: "API key was rejected. Update your key in AI Keys and try again.",
      rawMessage,
    };
  }

  if (/safety|blocked|harm|content.?filter|prohibited|responsible ai/i.test(coreMessage)) {
    return {
      code: "provider_error",
      userMessage:
        "The AI provider blocked this request. Shorten or edit the job description and try again, or switch to your own API key in AI Keys.",
      rawMessage,
    };
  }

  if (/overloaded|503|service unavailable|high demand|temporarily unavailable/i.test(coreMessage)) {
    return {
      code: "provider_error",
      userMessage: "AI is temporarily overloaded. Wait a minute and try again.",
      rawMessage,
    };
  }

  if (/no (?:output|text|candidates)|empty response|zero.?token/i.test(coreMessage)) {
    return {
      code: "invalid_response",
      userMessage: "AI returned an empty response. Try again or switch AI source in Settings.",
      rawMessage,
    };
  }

  return {
    code: "provider_error",
    userMessage:
      "AI enhancement failed. Try again, add your API key in AI Keys, or switch AI source in Settings.",
    rawMessage,
  };
}
