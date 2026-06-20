/**
 * Best-effort ephemeral secret cleanup — JS strings are immutable; this clears
 * the only reachable reference so the value can be GC'd after vaulting.
 */
export type EphemeralSecretRef = { value: string | null };

export function createEphemeralSecret(raw: string): EphemeralSecretRef {
  const trimmed = raw.trim();
  return { value: trimmed.length > 0 ? trimmed : null };
}

export function readEphemeralSecret(ref: EphemeralSecretRef): string | null {
  return ref.value;
}

export function scrubEphemeralSecret(ref: EphemeralSecretRef): void {
  ref.value = null;
}
