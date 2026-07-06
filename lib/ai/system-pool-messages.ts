/** Client-safe copy for shared AI pool exhaustion — no server imports. */

export const SYSTEM_POOL_EXHAUSTED_HEADLINE =
  "EasySubmit's shared AI is temporarily unavailable.";

export const SYSTEM_POOL_EXHAUSTED_BYOK_BODY =
  "Use your own API key for this enhance, or change AI source in Settings.";

export const SYSTEM_POOL_EXHAUSTED_NO_BYOK_BODY =
  "Try again later, or add your API key in AI Keys.";

export type EnhanceRouteError =
  | { error: "no_customer_key" }
  | { error: "no_system_key" }
  | { error: "system_pool_exhausted"; byokAvailable: boolean };

export function formatSystemPoolExhaustedMessage(byokAvailable: boolean): string {
  return byokAvailable
    ? `${SYSTEM_POOL_EXHAUSTED_HEADLINE} ${SYSTEM_POOL_EXHAUSTED_BYOK_BODY}`
    : `${SYSTEM_POOL_EXHAUSTED_HEADLINE} ${SYSTEM_POOL_EXHAUSTED_NO_BYOK_BODY}`;
}
