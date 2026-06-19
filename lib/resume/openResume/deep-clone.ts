/** Minimal deep clone for parser skill extraction. */
export function deepClone<T>(value: T): T {
  return structuredClone(value);
}
