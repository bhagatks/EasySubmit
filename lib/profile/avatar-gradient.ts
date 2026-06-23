/** Brand-aligned avatar gradients when no profile photo is set. */
const AVATAR_GRADIENTS: Array<[string, string]> = [
  ["#12B3D1", "#0E9CB6"],
  ["#12B3D1", "#6366F1"],
  ["#0EA5E9", "#12B3D1"],
  ["#14B8A6", "#0E7490"],
  ["#22C55E", "#12B3D1"],
  ["#8B5CF6", "#12B3D1"],
];

function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash;
}

export function getAvatarGradient(seed: string): { from: string; to: string } {
  const normalized = seed.trim().toLowerCase() || "easysubmit";
  const index = hashSeed(normalized) % AVATAR_GRADIENTS.length;
  const [from, to] = AVATAR_GRADIENTS[index] ?? AVATAR_GRADIENTS[0];
  return { from, to };
}
