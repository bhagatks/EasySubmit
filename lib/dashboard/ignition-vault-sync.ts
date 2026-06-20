/** Clear stale client ignition when server vault is empty but session still looks hot. */
export function shouldResetClientIgnition(
  vaultKeyId: string | null | undefined,
  isIgnitionComplete: boolean,
): boolean {
  return !vaultKeyId && isIgnitionComplete;
}
