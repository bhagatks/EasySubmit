/** Server-side global AI kill switch — set `EASYSUBMIT_AI_GLOBALLY_ENABLED=false` to disable all AI. */
export function isAiGloballyEnabled(): boolean {
  return process.env.EASYSUBMIT_AI_GLOBALLY_ENABLED !== "false";
}

/** Client-side mirror for dashboard UI — keep in sync with server env. */
export function isClientAiGloballyEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AI_GLOBALLY_ENABLED !== "false";
}

export function isUserAiEnhancementEnabled(
  preference: string | null | undefined,
): boolean {
  return (preference ?? "auto") !== "disabled" && isAiGloballyEnabled();
}

/** Client-side mirror of {@link isUserAiEnhancementEnabled} for dashboard UI. */
export function isClientUserAiEnhancementEnabled(
  preference: string | null | undefined,
): boolean {
  return (preference ?? "auto") !== "disabled" && isClientAiGloballyEnabled();
}
