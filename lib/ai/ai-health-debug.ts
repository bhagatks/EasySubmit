export const AI_HEALTH_LOG_PREFIX = "[AiHealth]";

export function isAiHealthDebugEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.AI_HEALTH_DEBUG === "1";
}

export function logAiHealth(event: string, payload?: Record<string, unknown>): void {
  if (!isAiHealthDebugEnabled()) return;
  if (payload) {
    console.log(AI_HEALTH_LOG_PREFIX, event, payload);
    return;
  }
  console.log(AI_HEALTH_LOG_PREFIX, event);
}

export function logAiHealthError(event: string, error: unknown, payload?: Record<string, unknown>): void {
  if (!isAiHealthDebugEnabled()) return;
  const message = error instanceof Error ? error.message : String(error);
  console.error(AI_HEALTH_LOG_PREFIX, event, { ...payload, message });
}

export function redactUserId(userId: string | null | undefined): string {
  if (!userId) return "none";
  if (userId.length <= 8) return userId;
  return `${userId.slice(0, 4)}…${userId.slice(-4)}`;
}
