type PoolKeyState = {
  coolingUntil: number;
};

const keyStates = new Map<number, PoolKeyState>();

export function isKeyCooling(slot: number): boolean {
  const state = keyStates.get(slot);
  if (!state) return false;
  if (Date.now() >= state.coolingUntil) {
    keyStates.delete(slot);
    return false;
  }
  return true;
}

export function markKeyCooling(slot: number, cooldownMs = 60_000): void {
  keyStates.set(slot, { coolingUntil: Date.now() + cooldownMs });
}

export function resetPoolCooldownForTests(): void {
  keyStates.clear();
}
