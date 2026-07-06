export const AI_NOT_AVAILABLE_MESSAGE = "AI is not available.";

/** Shared pool flag off — BYOK still allowed when user has a vaulted key. */
export function isAiTailoringAvailable(input: {
  systemAiFeatureEnabled: boolean;
  hasByokKey: boolean;
}): boolean {
  return input.systemAiFeatureEnabled || input.hasByokKey;
}

export function buildAiSettingsStatusText(input: {
  aiEnabled: boolean;
  hasByokKey: boolean;
  systemAiFeatureEnabled: boolean;
  customerAiDailyUnlimited: boolean;
  customerDailyEnhancementLimit: number;
  systemDailyLimit: number;
  isSubscribed: boolean;
}): string {
  if (!isAiTailoringAvailable(input)) {
    return AI_NOT_AVAILABLE_MESSAGE;
  }

  if (!input.aiEnabled) {
    return "AI tailoring is off — resume editing uses the rules engine only.";
  }

  if (input.hasByokKey) {
    if (input.customerAiDailyUnlimited) {
      return "Using your provider key — unlimited enhancements.";
    }
    return `Using your provider key — ${input.customerDailyEnhancementLimit} enhancements per day.`;
  }

  if (input.isSubscribed) {
    return "Using EasySubmit shared AI — unlimited with your subscription.";
  }

  if (input.customerAiDailyUnlimited) {
    return `Using EasySubmit shared AI — ${input.systemDailyLimit} enhancements per day. Add a provider key below for unlimited.`;
  }

  return `Using EasySubmit shared AI — ${input.systemDailyLimit} enhancements per day.`;
}
