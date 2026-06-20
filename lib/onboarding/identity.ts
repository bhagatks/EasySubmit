import type { IdentityState } from "@/stores/onboardingStore";

/** Identity phase is complete when target role is set (languages are optional in Studio). */
export function isIdentityPhaseComplete(identity: IdentityState): boolean {
  return identity.targetRole.trim().length > 0;
}

/** Zustand selector — Identity phase complete when target role is locked. */
export function selectIsIdentityComplete(
  state: Pick<{ identity: IdentityState }, "identity">,
): boolean {
  return isIdentityPhaseComplete(state.identity);
}
