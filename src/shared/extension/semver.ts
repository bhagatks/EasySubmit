/** Compare dotted semver strings (`major.minor.patch`). Returns -1, 0, or 1. */
export function compareSemver(a: string, b: string): number {
  const parse = (value: string): number[] =>
    value
      .trim()
      .split(".")
      .map((part) => {
        const n = Number.parseInt(part, 10);
        return Number.isFinite(n) && n >= 0 ? n : 0;
      });

  const left = parse(a);
  const right = parse(b);
  const len = Math.max(left.length, right.length);

  for (let i = 0; i < len; i += 1) {
    const lv = left[i] ?? 0;
    const rv = right[i] ?? 0;
    if (lv < rv) return -1;
    if (lv > rv) return 1;
  }

  return 0;
}

/** True when `current` is strictly below `minimum`. */
export function isSemverBelowMinimum(current: string, minimum: string): boolean {
  return compareSemver(current, minimum) < 0;
}
