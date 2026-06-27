const BLOCKED_KEY_PATTERN =
  /api[_-]?key|secret|token|password|authorization|resume|cover[_-]?letter|job[_-]?description|raw[_-]?resume|email|phone|name|first[_-]?name|last[_-]?name/i;

const MAX_STRING_LENGTH = 200;

function truncateString(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= MAX_STRING_LENGTH) return trimmed;
  return `${trimmed.slice(0, MAX_STRING_LENGTH)}…`;
}

function sanitizeValue(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") return truncateString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(item));
  }
  if (typeof value === "object") {
    return sanitizeProperties(value as Record<string, unknown>);
  }
  return undefined;
}

/** Strip PII and secrets from analytics event properties. */
export function sanitizeProperties(
  properties: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!properties) return {};

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (BLOCKED_KEY_PATTERN.test(key)) continue;
    const sanitized = sanitizeValue(value);
    if (sanitized !== undefined) out[key] = sanitized;
  }
  return out;
}
